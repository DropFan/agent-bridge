import { describe, expect, it } from 'vitest'
import { ScanController } from '../src/application/scan-controller.js'
import { MemoryBridgeRepository } from '../src/storage/domain.js'
import type { SourceAdapter } from '../src/sources/types.js'

function source(id: 'claude-code' | 'codex', delay = 0): SourceAdapter {
  return {
    id,
    async probe() {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      return { id, state: 'available', capabilities: ['static-file-discovery'] }
    },
    async discover() { return { artifacts: [], warnings: [] } },
  }
}

describe('ScanController', () => {
  it('复用并发扫描且只保存一条 activity', async () => {
    const repository = new MemoryBridgeRepository()
    const controller = new ScanController([source('claude-code', 10), source('codex', 10)], repository)
    const first = controller.scan()
    const second = controller.scan()
    expect(second).toBe(first)
    const snapshot = await first
    expect(snapshot.state).toBe('success')
    expect(controller.overview().activities).toHaveLength(1)
  })

  it('不同范围的并发扫描被拒绝', async () => {
    const controller = new ScanController([source('claude-code', 10)], new MemoryBridgeRepository(), '/tmp/project')
    const first = controller.scan({ includeProject: true })
    await expect(controller.scan({ includeProject: false })).rejects.toThrow('scan-busy')
    await first
  })

  it('拒绝 Remote 注入的未知参数', async () => {
    const controller = new ScanController([source('claude-code')], new MemoryBridgeRepository())
    expect(() => controller.scan({ projectDir: '/etc' } as never)).toThrow('invalid-scan-request')
  })

  it('某一来源缺失时返回 partial', async () => {
    const missing: SourceAdapter = {
      id: 'codex',
      async probe() { return { id: 'codex', state: 'missing', capabilities: [] } },
      async discover() { throw new Error('unreachable') },
    }
    const controller = new ScanController([source('claude-code'), missing], new MemoryBridgeRepository())
    expect((await controller.scan()).state).toBe('partial')
  })
})
