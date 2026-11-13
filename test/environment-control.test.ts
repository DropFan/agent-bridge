import { describe, expect, it } from 'vitest'
import { ImportController } from '../src/application/import-controller.js'
import { MemoryBridgeRepository } from '../src/storage/domain.js'
import type { MaterializationRecord } from '../src/materialization/contracts.js'

const record: MaterializationRecord = {
  id: 'm', artifactKey: 'k', artifactIdentity: { kind: 'skill', scope: 'user', logicalName: 'skill-a' },
  sourceEndpointId: 'claude-code', environmentId: 'imported-claude-code', targetKind: 'skill-provider',
  content: 'body', contentHash: 'hash', enabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', runId: 'run',
}

class Runtime {
  value = record
  async setArtifactEnabled(_id: string, enabled: boolean) { this.value = { ...this.value, enabled }; return this.value }
  async verifyEnvironment() { return { valid: true } }
  async disableEnvironment() { return [] }
  async replace() {}
  async apply() {}
  async verify() { return true }
}

describe('environment controls', () => {
  it('单 artifact 可停用和恢复', async () => {
    const repository = new MemoryBridgeRepository(); await repository.putMaterialization(record)
    const runtime = new Runtime()
    const controller = new ImportController(repository, runtime as any, { observe: async () => ({ revision: '', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    expect((await controller.setArtifactEnabled({ materializationId: 'm', enabled: false }))[0]?.artifacts[0]?.enabled).toBe(false)
    expect((await controller.setArtifactEnabled({ materializationId: 'm', enabled: true }))[0]?.artifacts[0]?.enabled).toBe(true)
  })

  it('environment view 包含 revision、来源和 artifact 明细', async () => {
    const repository = new MemoryBridgeRepository(); await repository.putMaterialization(record)
    const controller = new ImportController(repository, new Runtime() as any, { observe: async () => ({ revision: '', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    expect(controller.environments()[0]).toMatchObject({
      id: 'imported-claude-code', sourceEndpointId: 'claude-code', verifyState: 'verified', artifactCount: 1,
      artifacts: [{ id: 'm', logicalName: 'skill-a', kind: 'skill' }],
    })
    expect(controller.environments()[0]?.revision).toHaveLength(64)
  })

  it('单 environment 可重新验证并记录 verifiedAt', async () => {
    const repository = new MemoryBridgeRepository(); await repository.putMaterialization(record)
    const controller = new ImportController(repository, new Runtime() as any, { observe: async () => ({ revision: '', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    const view = await controller.verifyEnvironment({ environmentId: 'imported-claude-code' })
    expect(view.verifyState).toBe('verified')
    expect(view.verifiedAt).toBeTruthy()
  })
})
