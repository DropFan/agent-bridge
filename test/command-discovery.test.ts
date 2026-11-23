import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverRoots } from '../src/sources/discovery.js'
import { assessForDsh } from '../src/core/compatibility.js'
import { expandPromptTemplate } from '../src/host/environment.js'

async function root() {
  const value = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-command-'))
  await mkdir(path.join(value, 'commands'))
  return value
}

describe('static prompt commands', () => {
  it('发现并规范化静态 prompt command', async () => {
    const dir = await root()
    await writeFile(path.join(dir, 'commands', 'review.md'), '---\nname: review\ndescription: Review code\nargument-hint: <path>\n---\nReview $ARGUMENTS carefully.')
    const result = await discoverRoots([{ endpointId: 'claude-code', root: dir, scope: 'user', instructionFiles: [], skillDirs: [], commandDirs: ['commands'] }])
    expect(result.artifacts[0]).toMatchObject({ identity: { kind: 'command', logicalName: 'review' }, command: { name: 'review', argumentHint: '<path>', promptTemplate: 'Review $ARGUMENTS carefully.' } })
    expect(assessForDsh(result.artifacts[0]!)).toMatchObject({ level: 'adapted', targetKind: 'command-wrapper', risk: 'medium' })
  })

  it.each([
    ['shell frontmatter', '---\nname: unsafe\nshell: echo pwn\n---\nDo it'],
    ['allowed tools', '---\nname: unsafe\nallowed-tools: Bash\n---\nDo it'],
    ['shell fence', '---\nname: unsafe\n---\n```bash\necho pwn\n```'],
  ])('阻塞执行语义：%s', async (_name, content) => {
    const dir = await root(); await writeFile(path.join(dir, 'commands', 'unsafe.md'), content)
    const result = await discoverRoots([{ endpointId: 'claude-code', root: dir, scope: 'user', instructionFiles: [], skillDirs: [], commandDirs: ['commands'] }])
    expect(result.artifacts).toHaveLength(0)
    expect(result.warnings[0]?.code).toBe('unsafe-command-semantics')
  })

  it('阻塞可执行 command 文件', async () => {
    const dir = await root(); const file = path.join(dir, 'commands', 'unsafe.md')
    await writeFile(file, 'Run something'); await chmod(file, 0o755)
    const result = await discoverRoots([{ endpointId: 'claude-code', root: dir, scope: 'user', instructionFiles: [], skillDirs: [], commandDirs: ['commands'] }])
    expect(result.artifacts).toHaveLength(0)
    expect(result.warnings[0]?.code).toBe('executable-command-blocked')
  })

  it('模板仅展开静态参数占位符', () => {
    expect(expandPromptTemplate('Review $ARGUMENTS and {{ input }}.', ' src/a.ts ')).toBe('Review src/a.ts and src/a.ts.')
  })
})
