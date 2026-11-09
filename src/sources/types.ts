import type { EndpointKind, EndpointStatus, PortableArtifact, ScanWarning } from '../shared/contracts.js'

export interface SourceContext {
  homeDir: string
  projectDir?: string
  signal?: AbortSignal
}

export interface DiscoveryResult {
  artifacts: PortableArtifact[]
  warnings: ScanWarning[]
}

export interface SourceAdapter {
  readonly id: EndpointKind
  probe(signal?: AbortSignal): Promise<EndpointStatus>
  discover(context: SourceContext): Promise<DiscoveryResult>
}

export interface SubprocessFacade {
  resolveExecutable(command: string, env?: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<string>
  spawn(spec: {
    argv: readonly string[]
    cwd: string
    stdio: {
      stdin: 'ignore'
      stdout: { maxBytes: number }
      stderr: { maxBytes: number }
    }
    graceMs: number
    signal?: AbortSignal
    env?: NodeJS.ProcessEnv
  }): {
    collected: {
      stdout?: { readFrom(offset: number): { text: string; lossy: boolean } }
      stderr?: { readFrom(offset: number): { text: string; lossy: boolean } }
    }
    done: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>
    terminate(): void
    waitForExit(signal?: AbortSignal): Promise<boolean>
  }
}
