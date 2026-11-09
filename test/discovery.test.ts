import { access, chmod, mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverRoots } from '../src/sources/discovery.js'

describe('static discovery', () => {
  it('发现指令和 Skill，但绝不执行脚本', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-discovery-'))
    const skill = path.join(root, 'skills', 'safe-skill')
    const marker = path.join(root, 'executed')
    await mkdir(path.join(skill, 'scripts'), { recursive: true })
    await writeFile(path.join(root, 'CLAUDE.md'), '# Rules\nUse tests.\n')
    await writeFile(path.join(skill, 'SKILL.md'), '---\nname: safe-skill\ndescription: Safe fixture\n---\nBody\n')
    await writeFile(path.join(skill, 'scripts', 'run.sh'), `#!/bin/sh\ntouch ${JSON.stringify(marker)}\n`)
    await chmod(path.join(skill, 'scripts', 'run.sh'), 0o755)

    const result = await discoverRoots([{
      endpointId: 'claude-code', root, scope: 'user', instructionFiles: ['CLAUDE.md'], skillDirs: ['skills'],
    }])
    expect(result.artifacts).toHaveLength(2)
    const discoveredSkill = result.artifacts.find((item) => item.identity.kind === 'skill')
    expect(discoveredSkill?.resources).toEqual([expect.objectContaining({ kind: 'script', executable: true })])
    await expect(access(marker)).rejects.toBeTruthy()
  })

  it('拒绝指向允许根外的 Skills 根 symlink', async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-root-link-'))
    const root = path.join(base, 'root')
    const outside = path.join(base, 'outside')
    await mkdir(root)
    await mkdir(outside)
    await writeFile(path.join(outside, 'leak.md'), '---\nname: leak\ndescription: leak\n---\nsecret')
    await symlink(outside, path.join(root, 'skills'))
    const result = await discoverRoots([{
      endpointId: 'claude-code', root, scope: 'user', instructionFiles: [], skillDirs: ['skills'],
    }])
    expect(result.artifacts).toHaveLength(0)
    expect(result.warnings[0]?.code).toBe('root-unreadable')
  })

  it('疑似包含秘密的正文不会进入 artifact', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-secret-'))
    await writeFile(path.join(root, 'CLAUDE.md'), 'api_key=fake-secret-value')
    const result = await discoverRoots([{
      endpointId: 'claude-code', root, scope: 'user', instructionFiles: ['CLAUDE.md'], skillDirs: [],
    }])
    expect(result.artifacts).toHaveLength(0)
    expect(JSON.stringify(result)).not.toContain('fake-secret-value')
    expect(result.warnings[0]?.code).toBe('sensitive-content')
  })
})
