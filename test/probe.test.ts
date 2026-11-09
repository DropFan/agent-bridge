import { describe, expect, it } from 'vitest'
import { probeCli } from '../src/sources/probe.js'
import type { SubprocessFacade } from '../src/sources/types.js'

function subprocess(output: string, exitCode = 0): SubprocessFacade {
  return {
    async resolveExecutable() { return '/usr/local/bin/claude' },
    spawn() {
      return {
        collected: {
          stdout: { readFrom: () => ({ text: output, lossy: false }) },
          stderr: { readFrom: () => ({ text: '', lossy: false }) },
        },
        done: Promise.resolve({ exitCode, signal: null }),
        terminate() {},
        async waitForExit() { return true },
      }
    },
  }
}

describe('probeCli', () => {
  it('解析版本且脱敏输出', async () => {
    const result = await probeCli(subprocess('Claude 2.1.0 api_key=fake-secret'), 'claude-code', 'claude', '/tmp')
    expect(result.state).toBe('available')
    expect(JSON.stringify(result)).not.toContain('fake-secret')
  })

  it('取消不会降级成普通 endpoint error', async () => {
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    await expect(probeCli(subprocess('never'), 'claude-code', 'claude', '/tmp', controller.signal)).rejects.toThrow('cancelled')
  })

  it('区分 executable 缺失', async () => {
    const fake: SubprocessFacade = {
      async resolveExecutable() { throw new Error('missing') },
      spawn() { throw new Error('unreachable') },
    }
    expect(await probeCli(fake, 'codex', 'codex', '/tmp')).toMatchObject({ state: 'missing', diagnostic: 'executable-not-found' })
  })
})
