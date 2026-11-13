import { randomUUID } from 'node:crypto'
import { sha256 } from '../shared/hash.js'
import type { BridgeRepository } from '../storage/domain.js'
import type { ScanSnapshot } from '../shared/contracts.js'
import { planArtifactKey } from '../planning/compare.js'
import { validateImportPlan } from '../planning/validate.js'
import type { DshTargetObservation } from '../planning/contracts.js'
import type {
  DisableEnvironmentRequest,
  EnvironmentView,
  SetArtifactEnabledRequest,
  VerifyEnvironmentRequest,
  ExecuteImportPlanRequest,
  ImportRun,
  MaterializationRecord,
  RollbackRunRequest,
} from '../materialization/contracts.js'
import type { MaterializationRuntime } from '../materialization/runtime.js'

export interface TargetObserver { observe(signal?: AbortSignal): Promise<DshTargetObservation> }

export class ImportController {
  constructor(
    private readonly repository: BridgeRepository,
    private readonly runtime: MaterializationRuntime,
    private readonly targetObserver: TargetObserver,
  ) {}

  async restore(): Promise<void> {
    const records = this.repository.listMaterializations()
    await this.runtime.replace(records)
    const now = new Date().toISOString()
    for (const run of this.repository.listRuns()) {
      if (['validating', 'materializing', 'verifying'].includes(run.state)) {
        void this.repository.putRun({ ...run, state: 'interrupted', endedAt: now, diagnostic: 'host-restarted' })
      }
    }
  }

  async execute(request: ExecuteImportPlanRequest, signal?: AbortSignal): Promise<ImportRun> {
    validateExecuteRequest(request)
    const plan = this.repository.getImportPlan(request.planId)
    if (!plan || plan.digest !== request.planDigest) throw new Error('plan-not-found-or-digest-mismatch')
    const runId = randomUUID()
    const lease = await this.repository.acquireLease(runId)
    const target = await this.targetObserver.observe(signal)
    const validation = validateImportPlan(plan, this.repository.latestSnapshot(), target)
    if (!validation.valid) {
      await this.repository.releaseLease(runId, lease.fence)
      throw new Error(`plan-expired:${validation.reasons.join(',')}`)
    }
    const startedAt = new Date().toISOString()
    let run: ImportRun = { id: runId, planId: plan.id, planDigest: plan.digest, fence: lease.fence, state: 'validating', startedAt, operationResults: [] }
    await this.repository.putRun(run)
    const before = new Map(this.repository.listMaterializations().map((record) => [record.id, record]))

    try {
      run = { ...run, state: 'materializing' }; await this.repository.putRun(run)
      const snapshot = this.requireSnapshot(plan.scanId, plan.scanRevision)
      for (const operation of plan.operations.filter((item) => item.state === 'proposed')) {
        signal?.throwIfAborted()
        const assessed = snapshot.artifacts.find(({ artifact }) => planArtifactKey(artifact.source.endpointId, artifact.identity) === operation.artifactKey)
        if (!assessed?.artifact.normalizedContent || !operation.targetKind) throw new Error(`artifact-content-unavailable:${operation.artifactKey}`)
        const id = `materialization:${operation.artifactKey}`
        const existing = before.get(id)
        if (existing && existing.contentHash !== operation.beforeHash && operation.action === 'update') throw new Error(`target-changed:${operation.artifactKey}`)
        const now = new Date().toISOString()
        const record: MaterializationRecord = {
          id, artifactKey: operation.artifactKey, artifactIdentity: operation.artifactIdentity,
          sourceEndpointId: operation.sourceEndpointId, environmentId: operation.targetEnvironmentId,
          targetKind: operation.targetKind, content: assessed.artifact.normalizedContent,
          contentHash: operation.afterHash, enabled: true, createdAt: existing?.createdAt ?? now, updatedAt: now, runId,
        }
        await this.runtime.apply(record)
        await this.repository.putMaterialization(record)
        run.operationResults.push({ operationId: operation.id, materializationId: id, state: 'completed' })
      }

      run = { ...run, state: 'verifying' }; await this.repository.putRun(run)
      for (const result of run.operationResults) {
        const record = result.materializationId ? this.repository.listMaterializations().find((item) => item.id === result.materializationId) : undefined
        if (!record || !(await this.runtime.verify(record))) throw new Error(`verify-failed:${result.operationId}`)
        const operation = plan.operations.find((item) => item.id === result.operationId)!
        await this.repository.putBaseline({ key: operation.artifactKey, sourceEndpointId: operation.sourceEndpointId, sourceHash: operation.afterHash, portableHash: operation.afterHash, targetHash: operation.afterHash, targetRevision: target.revision, lastSuccessfulRunId: runId })
      }
      run = { ...run, state: 'completed', endedAt: new Date().toISOString() }
      await this.repository.putRun(run)
      return run
    } catch (error) {
      const diagnostic = error instanceof Error ? error.message : 'unknown-import-error'
      let rollbackFailed = false
      for (const result of [...run.operationResults].reverse()) {
        if (!result.materializationId) continue
        try {
          const previous = before.get(result.materializationId)
          if (previous) { await this.runtime.apply(previous); await this.repository.putMaterialization(previous) }
          else { await this.runtime.disableEnvironment(plan.operations.find((item) => item.id === result.operationId)!.targetEnvironmentId); await this.repository.deleteMaterialization(result.materializationId) }
          result.state = 'rolled-back'
        } catch { result.state = 'rollback-failed'; rollbackFailed = true }
      }
      run = { ...run, state: rollbackFailed ? 'rollback-failed' : 'rolled-back', endedAt: new Date().toISOString(), diagnostic }
      await this.repository.putRun(run)
      throw error
    } finally {
      await this.repository.releaseLease(runId, lease.fence)
    }
  }

  async disableEnvironment(request: DisableEnvironmentRequest): Promise<EnvironmentView[]> {
    if (!request?.environmentId) throw new Error('invalid-disable-environment-request')
    const changed = await this.runtime.disableEnvironment(request.environmentId)
    for (const record of changed) await this.repository.putMaterialization(record)
    return this.environments()
  }

  async setArtifactEnabled(request: SetArtifactEnabledRequest): Promise<EnvironmentView[]> {
    if (!request?.materializationId || typeof request.enabled !== 'boolean') throw new Error('invalid-artifact-control-request')
    const record = await this.runtime.setArtifactEnabled(request.materializationId, request.enabled)
    await this.repository.putMaterialization(record)
    return this.environments()
  }

  async verifyEnvironment(request: VerifyEnvironmentRequest): Promise<EnvironmentView> {
    if (!request?.environmentId) throw new Error('invalid-verify-environment-request')
    const result = await this.runtime.verifyEnvironment(request.environmentId)
    const view = this.environments().find((item) => item.id === request.environmentId)
    if (!view) throw new Error('environment-not-found')
    return { ...view, verifyState: result.valid ? (view.enabled ? 'verified' : 'disabled') : 'degraded', verifyDiagnostic: result.diagnostic, verifiedAt: new Date().toISOString() }
  }

  async rollback(request: RollbackRunRequest): Promise<ImportRun> {
    const run = this.repository.getRun(request?.runId)
    if (!run) throw new Error('run-not-found')
    const environments = new Set(this.repository.listMaterializations().filter((item) => item.runId === run.id).map((item) => item.environmentId))
    for (const environment of environments) await this.disableEnvironment({ environmentId: environment })
    const next: ImportRun = { ...run, state: 'rolled-back', endedAt: new Date().toISOString() }
    await this.repository.putRun(next)
    return next
  }

  environments(): EnvironmentView[] {
    const groups = new Map<string, MaterializationRecord[]>()
    for (const record of this.repository.listMaterializations()) groups.set(record.environmentId, [...groups.get(record.environmentId) ?? [], record])
    return [...groups.entries()].map(([id, records]) => {
      const sorted = [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      const enabled = records.some((item) => item.enabled)
      return {
        id, sourceEndpointId: records[0]!.sourceEndpointId, enabled, artifactCount: records.length,
        instructionCount: records.filter((item) => item.targetKind === 'system-prompt').length,
        skillCount: records.filter((item) => item.targetKind === 'skill-provider').length,
        revision: sha256(JSON.stringify(records.map((item) => [item.id, item.contentHash, item.enabled]).sort())),
        verifyState: enabled ? 'verified' : 'disabled',
        lastRunId: sorted[0]?.runId,
        artifacts: sorted.map((item) => ({
          id: item.id, logicalName: item.artifactIdentity.logicalName, kind: item.artifactIdentity.kind,
          targetKind: item.targetKind, sourceEndpointId: item.sourceEndpointId, contentHash: item.contentHash,
          enabled: item.enabled, updatedAt: item.updatedAt, runId: item.runId,
        })),
      }
    })
  }

  runs(): ImportRun[] { return this.repository.listRuns() }

  private requireSnapshot(id: string, revision: number): ScanSnapshot {
    const snapshot = this.repository.latestSnapshot()
    if (!snapshot || snapshot.id !== id || snapshot.revision !== revision) throw new Error('scan-revision-changed')
    return snapshot
  }
}

function validateExecuteRequest(request: ExecuteImportPlanRequest): void {
  if (!request || request.confirmed !== true || typeof request.planId !== 'string' || typeof request.planDigest !== 'string') throw new Error('explicit-confirmation-required')
}
