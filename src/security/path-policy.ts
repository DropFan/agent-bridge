import path from 'node:path'
import { lstat, realpath } from 'node:fs/promises'

const FORBIDDEN_BASENAMES = new Set([
  '.env',
  'auth.json',
  'credentials.json',
  'cookies.json',
  'token.json',
])

const FORBIDDEN_SUFFIXES = ['.sqlite', '.sqlite3', '.db', '.wal', '.shm']

export function isForbiddenPath(candidate: string): boolean {
  const base = path.basename(candidate).toLowerCase()
  if (FORBIDDEN_BASENAMES.has(base) || base.startsWith('.env.')) return true
  return FORBIDDEN_SUFFIXES.some((suffix) => base.endsWith(suffix))
}

export async function assertSafeRegularFile(
  root: string,
  candidate: string,
  maxBytes: number,
): Promise<{ realPath: string; bytes: number; executable: boolean }> {
  if (isForbiddenPath(candidate)) throw new Error('forbidden-path')

  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)])
  const relative = path.relative(realRoot, realCandidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path-escape')

  const stat = await lstat(realCandidate)
  if (!stat.isFile()) throw new Error('not-regular-file')
  if (stat.size > maxBytes) throw new Error('file-too-large')

  return {
    realPath: realCandidate,
    bytes: stat.size,
    executable: (stat.mode & 0o111) !== 0,
  }
}
