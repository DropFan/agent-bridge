import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSafeRegularFile, isForbiddenPath } from '../src/security/path-policy.js'

describe('path policy', () => {
  it('拒绝已知秘密和数据库文件名', () => {
    expect(isForbiddenPath('/tmp/.env')).toBe(true)
    expect(isForbiddenPath('/tmp/auth.json')).toBe(true)
    expect(isForbiddenPath('/tmp/session.sqlite')).toBe(true)
  })

  it('拒绝逃出根目录的 symlink', async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-path-'))
    const root = path.join(base, 'root')
    const outside = path.join(base, 'outside.md')
    await mkdir(root)
    await writeFile(outside, 'private')
    await symlink(outside, path.join(root, 'escape.md'))
    await expect(assertSafeRegularFile(root, path.join(root, 'escape.md'), 1024)).rejects.toThrow('path-escape')
  })
})
