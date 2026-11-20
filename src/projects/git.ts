import path from 'node:path'
import { realpath } from 'node:fs/promises'
import { sha256 } from '../shared/hash.js'
import type { SubprocessFacade } from '../sources/types.js'

export interface GitProjectIdentity {
  canonicalPath: string
  repositoryRoot?: string
  gitIdentity?: string
}

export async function inspectProjectIdentity(
  projectPath: string,
  subprocess: SubprocessFacade,
  signal?: AbortSignal,
): Promise<GitProjectIdentity> {
  const canonicalPath = await realpath(projectPath)
  const git = await resolveGit(subprocess, signal)
  if (!git) return { canonicalPath }

  const [root, commonDir, remote] = await Promise.all([
    gitRead(subprocess, git, canonicalPath, ['rev-parse', '--show-toplevel'], signal),
    gitRead(subprocess, git, canonicalPath, ['rev-parse', '--path-format=absolute', '--git-common-dir'], signal),
    gitRead(subprocess, git, canonicalPath, ['remote', 'get-url', 'origin'], signal),
  ])
  const repositoryRoot = commonDir ? normalizeRepositoryRoot(commonDir) : root
  const sanitized = remote ? sanitizeGitRemote(remote) : undefined
  return {
    canonicalPath,
    ...(repositoryRoot ? { repositoryRoot } : {}),
    ...(sanitized ? { gitIdentity: sha256(sanitized) } : {}),
  }
}

export function sanitizeGitRemote(input: string): string | undefined {
  const value = input.trim()
  if (!value) return undefined
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/u.exec(value)
  if (scp?.[1] && scp[2] && !value.includes('://')) {
    return `${scp[1].toLowerCase()}${normalizeRepoPath(scp[2])}`
  }
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return `${url.hostname.toLowerCase()}${normalizeRepoPath(url.pathname)}`
  } catch {
    return undefined
  }
}

async function resolveGit(subprocess: SubprocessFacade, signal?: AbortSignal): Promise<string | undefined> {
  try { return await subprocess.resolveExecutable('git', undefined, signal) } catch { return undefined }
}

async function gitRead(
  subprocess: SubprocessFacade,
  executable: string,
  cwd: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    const handle = subprocess.spawn({
      argv: [executable, ...args], cwd,
      stdio: { stdin: 'ignore', stdout: { maxBytes: 16 * 1024 }, stderr: { maxBytes: 16 * 1024 } },
      graceMs: 2_000,
      ...(signal ? { signal } : {}),
      env: { PATH: process.env.PATH },
    })
    const outcome = await handle.done
    if (outcome.exitCode !== 0) return undefined
    return handle.collected.stdout?.readFrom(0).text.trim() || undefined
  } catch { return undefined }
}

function normalizeRepositoryRoot(commonDir: string): string {
  const normalized = path.normalize(commonDir)
  return path.basename(normalized) === '.git' ? path.dirname(normalized) : normalized
}

function normalizeRepoPath(value: string): string {
  return `/${value.replace(/^\/+|\/+$/gu, '').replace(/\.git$/u, '')}`
}
