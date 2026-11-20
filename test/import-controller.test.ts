import { describe, expect, it } from 'vitest'
import { ImportController } from '../src/application/import-controller.js'
import { MemoryBridgeRepository } from '../src/storage/domain.js'
import type { MaterializationRecord } from '../src/materialization/contracts.js'
import type { ImportPlan } from '../src/planning/contracts.js'
import type { ScanSnapshot } from '../src/shared/contracts.js'

class FakeRuntime {
  records = new Map<string, MaterializationRecord>()
  failVerify = false
  replace(records: MaterializationRecord[]) { this.records = new Map(records.map((item) => [item.id, item])) }
  apply(record: MaterializationRecord) { this.records.set(record.id, record) }
  disableEnvironment(id: string) { return [...this.records.values()].filter((item) => item.environmentId === id).map((item) => ({ ...item, enabled: false })) }
  async verify(record: MaterializationRecord) { return !this.failVerify && this.records.get(record.id)?.contentHash === record.contentHash }
  dispose() {}
}

function fixture() {
  const repository = new MemoryBridgeRepository()
  const scan: ScanSnapshot = {
    id: 'scan', revision: 1, startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:01Z', state: 'success', endpoints: [], warnings: [],
    artifacts: [{ artifact: { identity: { kind: 'instruction', scope: 'user', logicalName: 'CLAUDE.md' }, source: { endpointId: 'claude-code', nativeRef: '/safe', observedRevision: 'x' }, title: 'CLAUDE.md', normalizedContent: 'Use tests.', contentHash: 'hash', sensitivity: 'public', resources: [] }, compatibility: { level: 'native', targetKind: 'system-prompt', risk: 'medium', summary: '', losses: [], blockers: [] } }],
  }
  const plan: ImportPlan = {
    id: 'plan', createdAt: '2026-01-01T00:00:02Z', scanId: 'scan', scanRevision: 1, projectLinkRevision: 0, targetRevision: 'target', sourceEndpointIds: ['claude-code'], targetEnvironmentIds: ['imported-claude-code'], warnings: [], blockers: [], digest: 'digest',
    operations: [{ id: 'op', artifactKey: 'claude-code:instruction:user::CLAUDE.md', artifactIdentity: { kind: 'instruction', scope: 'user', logicalName: 'CLAUDE.md' }, sourceEndpointId: 'claude-code', targetEnvironmentId: 'imported-claude-code', targetKind: 'system-prompt', action: 'register', state: 'proposed', expectedSourceHash: 'hash', expectedTargetRevision: 'target', afterHash: 'hash', risk: 'medium', compatibility: { level: 'native', targetKind: 'system-prompt', risk: 'medium', summary: '', losses: [], blockers: [] }, approvalRequired: true, reasons: [] }],
  }
  return { repository, scan, plan }
}

describe('ImportController', () => {
  it('带冒号的业务 identity 可持久化为 path-safe storage key', async () => {
    const repository = new MemoryBridgeRepository()
    const record: MaterializationRecord = { id: 'materialization:claude-code:instruction:user::CLAUDE.md', artifactKey: 'claude-code:instruction:user::CLAUDE.md', artifactIdentity: { kind: 'instruction', scope: 'user', logicalName: 'CLAUDE.md' }, sourceEndpointId: 'claude-code', environmentId: 'imported-claude-code', targetKind: 'system-prompt', content: 'x', contentHash: 'h', enabled: true, createdAt: '', updatedAt: '', runId: 'r' }
    await repository.putMaterialization(record)
    await repository.putBaseline({ key: record.artifactKey, sourceEndpointId: 'claude-code', sourceHash: 'h' })
    expect(repository.listMaterializations()[0]?.id).toBe(record.id)
    expect(repository.baselines().has(record.artifactKey)).toBe(true)
  })

  it('首次 lease 初始化后从 fence 1 开始', async () => {
    const repository = new MemoryBridgeRepository()
    await repository.initializeOperationState()
    expect(await repository.acquireLease('first')).toEqual({ fence: 1 })
    await repository.releaseLease('first', 1)
    expect(await repository.acquireLease('second')).toEqual({ fence: 2 })
  })

  it('必须显式确认并匹配 plan digest', async () => {
    const { repository } = fixture()
    const controller = new ImportController(repository, new FakeRuntime() as any, { observe: async () => ({ revision: 'target', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    await expect(controller.execute({ planId: 'x', planDigest: 'x', confirmed: false } as never)).rejects.toThrow('explicit-confirmation-required')
  })

  it('成功 materialize、verify 并更新 baseline', async () => {
    const { repository, scan, plan } = fixture()
    await repository.saveSnapshot(scan, { id: 'scan', type: 'scan', state: 'success', startedAt: '', summary: '' })
    await repository.saveImportPlan(plan)
    const runtime = new FakeRuntime()
    const controller = new ImportController(repository, runtime as any, { observe: async () => ({ revision: 'target', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    const run = await controller.execute({ planId: 'plan', planDigest: 'digest', confirmed: true })
    expect(run.state).toBe('completed')
    expect(repository.baselines().get(plan.operations[0]!.artifactKey)?.lastSuccessfulRunId).toBe(run.id)
    expect(controller.environments()[0]).toMatchObject({ id: 'imported-claude-code', enabled: true, instructionCount: 1 })
  })

  it('并发执行仅一个获得 lease', async () => {
    const { repository, scan, plan } = fixture()
    await repository.saveSnapshot(scan, { id: 'scan', type: 'scan', state: 'success', startedAt: '', summary: '' })
    await repository.saveImportPlan(plan)
    const runtime = new FakeRuntime()
    let release!: () => void
    const blocked = new Promise<void>((resolve) => { release = resolve })
    const controller = new ImportController(repository, runtime as any, { observe: async () => { await blocked; return { revision: 'target', observedAt: '', artifacts: [], complete: true, warnings: [] } } })
    const first = controller.execute({ planId: 'plan', planDigest: 'digest', confirmed: true })
    const second = controller.execute({ planId: 'plan', planDigest: 'digest', confirmed: true })
    release()
    await first
    await expect(second).rejects.toThrow('operation-busy')
  })

  it('重复导入在新扫描后收敛为 unchanged', async () => {
    const { repository, scan, plan } = fixture()
    await repository.saveSnapshot(scan, { id: 'scan', type: 'scan', state: 'success', startedAt: '', summary: '' })
    await repository.saveImportPlan(plan)
    const runtime = new FakeRuntime()
    const controller = new ImportController(repository, runtime as any, { observe: async () => ({ revision: 'target', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    await controller.execute({ planId: 'plan', planDigest: 'digest', confirmed: true })
    expect(repository.listMaterializations()).toHaveLength(1)
    expect(repository.baselines().size).toBe(1)
  })

  it('Host restore 将未完成 run 标记为 interrupted', async () => {
    const { repository } = fixture()
    await repository.putRun({ id: 'run', planId: 'p', planDigest: 'd', fence: 1, state: 'materializing', startedAt: '', operationResults: [] })
    const controller = new ImportController(repository, new FakeRuntime() as any, { observe: async () => ({ revision: '', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    await controller.restore()
    expect(repository.getRun('run')?.state).toBe('interrupted')
  })

  it('停用 environment 撤销受管记录', async () => {
    const { repository } = fixture()
    const runtime = new FakeRuntime()
    const record: MaterializationRecord = { id: 'm', artifactKey: 'k', artifactIdentity: { kind: 'instruction', scope: 'user', logicalName: 'x' }, sourceEndpointId: 'claude-code', environmentId: 'imported-claude-code', targetKind: 'system-prompt', content: 'x', contentHash: 'h', enabled: true, createdAt: '', updatedAt: '', runId: 'r' }
    await repository.putMaterialization(record); runtime.apply(record)
    const controller = new ImportController(repository, runtime as any, { observe: async () => ({ revision: '', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    const result = await controller.disableEnvironment({ environmentId: 'imported-claude-code' })
    expect(result[0]?.enabled).toBe(false)
  })

  it('verify 失败回滚插件创建的 materialization', async () => {
    const { repository, scan, plan } = fixture()
    await repository.saveSnapshot(scan, { id: 'scan', type: 'scan', state: 'success', startedAt: '', summary: '' })
    await repository.saveImportPlan(plan)
    const runtime = new FakeRuntime(); runtime.failVerify = true
    const controller = new ImportController(repository, runtime as any, { observe: async () => ({ revision: 'target', observedAt: '', artifacts: [], complete: true, warnings: [] }) })
    await expect(controller.execute({ planId: 'plan', planDigest: 'digest', confirmed: true })).rejects.toThrow('verify-failed')
    expect(repository.listMaterializations()).toHaveLength(0)
    expect(repository.listRuns()[0]?.state).toBe('rolled-back')
  })
})
