import type { EndpointKind, EndpointStatus } from '../shared/contracts.js'
import { redactSecrets } from '../security/redact.js'
import type { SubprocessFacade } from './types.js'

const MAX_OUTPUT = 64 * 1024
const PROBE_TIMEOUT_MS = 5_000

export async function probeCli(
  subprocess: SubprocessFacade,
  endpointId: EndpointKind,
  command: string,
  cwd: string,
  signal?: AbortSignal,
): Promise<EndpointStatus> {
  signal?.throwIfAborted()
  let executable: string
  try {
    executable = await subprocess.resolveExecutable(command, undefined, signal)
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    return { id: endpointId, state: 'missing', capabilities: [], diagnostic: 'executable-not-found' }
  }

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(new Error('probe-timeout')), PROBE_TIMEOUT_MS)
  const onAbort = () => timeout.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const env: NodeJS.ProcessEnv = {}
    if (process.env.PATH) env.PATH = process.env.PATH
    if (process.env.HOME) env.HOME = process.env.HOME
    const handle = subprocess.spawn({
      argv: [executable, '--version'],
      cwd,
      stdio: { stdin: 'ignore', stdout: { maxBytes: MAX_OUTPUT }, stderr: { maxBytes: MAX_OUTPUT } },
      graceMs: 2_000,
      signal: timeout.signal,
      env,
    })
    const outcome = await Promise.race([
      handle.done,
      new Promise<never>((_, reject) => timeout.signal.addEventListener('abort', () => reject(timeout.signal.reason), { once: true })),
    ])
    const stdout = handle.collected.stdout?.readFrom(0)
    const stderr = handle.collected.stderr?.readFrom(0)
    const safe = redactSecrets(`${stdout?.text ?? ''}\n${stderr?.text ?? ''}`.trim()).text.slice(0, 512)

    if (outcome.exitCode !== 0) return {
      id: endpointId, state: 'error', executable, capabilities: [],
      diagnostic: safe || `version-exit-${outcome.exitCode ?? 'signal'}`,
    }
    return {
      id: endpointId, state: 'available', executable,
      version: safe.split('\n')[0]?.trim() || 'unknown',
      capabilities: ['version', 'static-file-discovery'],
    }
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    return {
      id: endpointId,
      state: 'error',
      executable,
      capabilities: [],
      diagnostic: timeout.signal.aborted ? 'probe-timeout' : `probe-failed:${safeErrorName(error)}`,
    }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown'
}
