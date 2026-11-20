import { defineDomain, domainTable, type Domain } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import type { ActivityRecord, ScanSnapshot } from '../shared/contracts.js'
import type { ArtifactBaseline, ImportPlan } from '../planning/contracts.js'
import type { ImportRun, MaterializationRecord, OperationState } from '../materialization/contracts.js'
import { sha256 } from '../shared/hash.js'
import type { ProjectLink } from '../projects/contracts.js'

const endpointStatusSchema = z.object({
  id: z.enum(['claude-code', 'codex', 'dsh']),
  state: z.enum(['available', 'missing', 'unsupported', 'error']),
  executable: z.string().optional(),
  version: z.string().optional(),
  capabilities: z.array(z.string()),
  diagnostic: z.string().optional(),
})

const resourceSchema = z.object({
  relativePath: z.string(),
  kind: z.enum(['reference', 'asset', 'script', 'other']),
  bytes: z.number().int().nonnegative(),
  contentHash: z.string(),
  executable: z.boolean(),
})

const artifactSchema = z.object({
  artifact: z.object({
    identity: z.object({
      kind: z.enum(['instruction', 'skill']),
      scope: z.enum(['user', 'project']),
      logicalName: z.string(),
      projectKey: z.string().optional(),
    }),
    source: z.object({
      endpointId: z.enum(['claude-code', 'codex', 'dsh']),
      nativeRef: z.string(),
      observedRevision: z.string(),
    }),
    title: z.string(),
    description: z.string().optional(),
    normalizedContent: z.string().optional(),
    contentHash: z.string(),
    sensitivity: z.enum(['public', 'unknown', 'sensitive']),
    resources: z.array(resourceSchema),
  }),
  compatibility: z.object({
    level: z.enum(['native', 'adapted', 'archive-only', 'blocked']),
    targetKind: z.enum(['system-prompt', 'skill-provider']).optional(),
    risk: z.enum(['low', 'medium', 'high', 'forbidden']),
    summary: z.string(),
    losses: z.array(z.string()),
    blockers: z.array(z.string()),
    verifyMethod: z.string().optional(),
  }),
})

const warningSchema = z.object({
  code: z.string(),
  endpointId: z.enum(['claude-code', 'codex', 'dsh']).optional(),
  nativeRef: z.string().optional(),
  message: z.string(),
})

const scanSchema: z.ZodType<ScanSnapshot> = z.object({
  id: z.string(),
  revision: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string(),
  state: z.enum(['success', 'partial', 'error']),
  endpoints: z.array(endpointStatusSchema),
  artifacts: z.array(artifactSchema),
  warnings: z.array(warningSchema),
})

const baselineSchema: z.ZodType<ArtifactBaseline> = z.object({
  key: z.string(),
  sourceEndpointId: z.enum(['claude-code', 'codex', 'dsh']),
  sourceHash: z.string().optional(),
  portableHash: z.string().optional(),
  targetHash: z.string().optional(),
  targetRevision: z.string().optional(),
  lastSuccessfulRunId: z.string().optional(),
})

const importPlanSchema: z.ZodType<ImportPlan> = z.object({
  id: z.string(), createdAt: z.string(), scanId: z.string(), scanRevision: z.number().int(), projectLinkRevision: z.number().int(), targetRevision: z.string(),
  sourceEndpointIds: z.array(z.enum(['claude-code', 'codex', 'dsh'])), targetEnvironmentIds: z.array(z.string()),
  operations: z.array(z.object({
    id: z.string(), artifactKey: z.string(), artifactIdentity: z.object({ kind: z.enum(['instruction', 'skill']), scope: z.enum(['user', 'project']), logicalName: z.string(), projectKey: z.string().optional() }),
    sourceEndpointId: z.enum(['claude-code', 'codex', 'dsh']), targetEnvironmentId: z.string(), targetKind: z.enum(['system-prompt', 'skill-provider']).optional(),
    action: z.enum(['register', 'update', 'skip']), state: z.enum(['proposed', 'unchanged', 'conflict', 'blocked', 'skipped']),
    expectedSourceHash: z.string(), expectedTargetRevision: z.string(), beforeHash: z.string().optional(), afterHash: z.string(),
    risk: z.enum(['low', 'medium', 'high', 'forbidden']), compatibility: artifactSchema.shape.compatibility,
    approvalRequired: z.boolean(), reasons: z.array(z.string()),
  })), warnings: z.array(z.string()), blockers: z.array(z.string()), digest: z.string(),
})

const materializationSchema: z.ZodType<MaterializationRecord> = z.object({
  id: z.string(), artifactKey: z.string(), artifactIdentity: z.object({ kind: z.enum(['instruction', 'skill']), scope: z.enum(['user', 'project']), logicalName: z.string(), projectKey: z.string().optional() }),
  sourceEndpointId: z.enum(['claude-code', 'codex', 'dsh']), environmentId: z.string(), targetKind: z.enum(['system-prompt', 'skill-provider']),
  content: z.string(), contentHash: z.string(), enabled: z.boolean(), createdAt: z.string(), updatedAt: z.string(), runId: z.string(),
})
const runSchema: z.ZodType<ImportRun> = z.object({
  id: z.string(), planId: z.string(), planDigest: z.string(), fence: z.number().int(), state: z.enum(['validating','materializing','verifying','completed','failed','rolled-back','rollback-failed','interrupted']),
  startedAt: z.string(), endedAt: z.string().optional(), operationResults: z.array(z.object({ operationId: z.string(), materializationId: z.string().optional(), state: z.enum(['completed','failed','rolled-back','rollback-failed']), diagnostic: z.string().optional() })), diagnostic: z.string().optional(),
})
const operationStateSchema: z.ZodType<OperationState> = z.object({
  id: z.literal('state'), nextFence: z.number().int(), projectLinkRevision: z.number().int().optional(), lease: z.object({ runId: z.string(), fence: z.number().int(), acquiredAt: z.string() }).optional(),
})

const projectReferenceSchema = z.object({ endpointId: z.enum(['claude-code', 'codex', 'dsh']), nativePath: z.string(), canonicalPath: z.string(), repositoryRoot: z.string().optional(), gitIdentity: z.string().optional(), displayName: z.string() })
const workspaceReferenceSchema = z.object({ workspaceId: z.string(), path: z.string(), canonicalPath: z.string(), title: z.string(), repositoryRoot: z.string().optional(), gitIdentity: z.string().optional() })
const projectLinkSchema: z.ZodType<ProjectLink> = z.object({
  id: z.string(), projectKey: z.string(), claudeRefs: z.array(projectReferenceSchema), codexRefs: z.array(projectReferenceSchema), dshWorkspace: workspaceReferenceSchema.optional(),
  canonicalPath: z.string(), repositoryRoot: z.string().optional(), gitIdentity: z.string().optional(), confidence: z.enum(['exact','strong','candidate','none']), confirmedByUser: z.boolean(), revision: z.number().int(), createdAt: z.string(), updatedAt: z.string(),
})

const activitySchema: z.ZodType<ActivityRecord> = z.object({
  id: z.string(),
  type: z.literal('scan'),
  state: z.enum(['success', 'partial', 'error', 'interrupted']),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  summary: z.string(),
})

export const agentBridgeDomainSpec = defineDomain({
  name: 'agent_bridge',
  version: 1,
  layout: 'per-record',
  invalidRecords: 'backup-and-skip',
  tables: {
    scan_snapshots: domainTable<string, ScanSnapshot>(scanSchema),
    import_plans: domainTable<string, ImportPlan>(importPlanSchema),
    import_runs: domainTable<string, ImportRun>(runSchema),
    materializations: domainTable<string, MaterializationRecord>(materializationSchema),
    operation_state: domainTable<'state', OperationState>(operationStateSchema),
    baselines: domainTable<string, ArtifactBaseline>(baselineSchema),
    project_links: domainTable<string, ProjectLink>(projectLinkSchema),
    activities: domainTable<string, ActivityRecord>(activitySchema),
  },
})

export type AgentBridgeDomain = Domain<typeof agentBridgeDomainSpec>

export interface BridgeRepository {
  latestSnapshot(): ScanSnapshot | undefined
  listActivities(limit?: number): ActivityRecord[]
  saveSnapshot(snapshot: ScanSnapshot, activity: ActivityRecord): Promise<void>
  saveActivity(activity: ActivityRecord): Promise<void>
  saveImportPlan(plan: ImportPlan): Promise<void>
  getImportPlan(id: string): ImportPlan | undefined
  latestImportPlan(): ImportPlan | undefined
  baselines(): ReadonlyMap<string, ArtifactBaseline>
  putBaseline(baseline: ArtifactBaseline): Promise<void>
  listMaterializations(): MaterializationRecord[]
  putMaterialization(record: MaterializationRecord): Promise<void>
  deleteMaterialization(id: string): Promise<boolean>
  listRuns(): ImportRun[]
  getRun(id: string): ImportRun | undefined
  putRun(run: ImportRun): Promise<void>
  initializeOperationState(): Promise<void>
  acquireLease(runId: string): Promise<{ fence: number }>
  releaseLease(runId: string, fence: number): Promise<void>
  listProjectLinks(): ProjectLink[]
  getProjectLink(id: string): ProjectLink | undefined
  putProjectLink(link: ProjectLink): Promise<void>
  deleteProjectLink(id: string): Promise<boolean>
  projectLinkRevision(): number
  bumpProjectLinkRevision(): Promise<number>
}

export class DomainBridgeRepository implements BridgeRepository {
  constructor(private readonly domain: AgentBridgeDomain) {}

  latestSnapshot(): ScanSnapshot | undefined {
    return [...this.domain.table('scan_snapshots').entries()]
      .map(([, value]) => value)
      .sort((a, b) => b.revision - a.revision)[0]
  }

  listActivities(limit = 20): ActivityRecord[] {
    return [...this.domain.table('activities').entries()]
      .map(([, value]) => value)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit)
  }

  async saveSnapshot(snapshot: ScanSnapshot, activity: ActivityRecord): Promise<void> {
    // 先写 activity，再以 snapshot 作为提交标记；overview 只从 snapshot 读取完成态。
    await this.domain.table('activities').put(activity.id, activity)
    await this.domain.table('scan_snapshots').put(snapshot.id, snapshot)
    await this.prune().catch(() => undefined)
  }

  async saveActivity(activity: ActivityRecord): Promise<void> {
    await this.domain.table('activities').put(activity.id, activity)
  }

  async saveImportPlan(plan: ImportPlan): Promise<void> {
    await this.domain.table('import_plans').put(plan.id, plan)
  }

  getImportPlan(id: string): ImportPlan | undefined {
    return this.domain.table('import_plans').get(id)
  }

  latestImportPlan(): ImportPlan | undefined {
    return [...this.domain.table('import_plans').entries()].map(([, plan]) => plan).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }

  baselines(): ReadonlyMap<string, ArtifactBaseline> { return new Map([...this.domain.table('baselines').entries()].map(([, value]) => [value.key, value])) }
  putBaseline(baseline: ArtifactBaseline): Promise<void> { return this.domain.table('baselines').put(storageKey('baseline', baseline.key), baseline) }
  listMaterializations(): MaterializationRecord[] { return [...this.domain.table('materializations').entries()].map(([, value]) => value) }
  putMaterialization(record: MaterializationRecord): Promise<void> { return this.domain.table('materializations').put(storageKey('materialization', record.id), record) }
  deleteMaterialization(id: string): Promise<boolean> { return this.domain.table('materializations').delete(storageKey('materialization', id)) }
  listRuns(): ImportRun[] { return [...this.domain.table('import_runs').entries()].map(([, value]) => value).sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  getRun(id: string): ImportRun | undefined { return this.domain.table('import_runs').get(id) }
  putRun(run: ImportRun): Promise<void> { return this.domain.table('import_runs').put(run.id, run) }
  async initializeOperationState(): Promise<void> {
    if (!this.domain.table('operation_state').get('state')) {
      await this.domain.table('operation_state').put('state', { id: 'state', nextFence: 1 })
    }
  }
  async acquireLease(runId: string): Promise<{ fence: number }> {
    const state = await this.domain.table('operation_state').update('state', (current) => {
      if (current.lease) throw new Error(`operation-busy:${current.lease.runId}`)
      return { id: 'state', nextFence: current.nextFence + 1, projectLinkRevision: current.projectLinkRevision, lease: { runId, fence: current.nextFence, acquiredAt: new Date().toISOString() } }
    })
    return { fence: state.lease!.fence }
  }
  async releaseLease(runId: string, fence: number): Promise<void> {
    await this.domain.table('operation_state').update('state', (current) => current.lease?.runId === runId && current.lease.fence === fence ? { id: 'state', nextFence: current.nextFence, projectLinkRevision: current.projectLinkRevision } : current)
  }
  listProjectLinks(): ProjectLink[] { return [...this.domain.table('project_links').entries()].map(([, value]) => value) }
  getProjectLink(id: string): ProjectLink | undefined { return this.domain.table('project_links').get(storageKey('project', id)) }
  putProjectLink(link: ProjectLink): Promise<void> { return this.domain.table('project_links').put(storageKey('project', link.id), link) }
  deleteProjectLink(id: string): Promise<boolean> { return this.domain.table('project_links').delete(storageKey('project', id)) }
  projectLinkRevision(): number { return this.domain.table('operation_state').get('state')?.projectLinkRevision ?? 0 }
  async bumpProjectLinkRevision(): Promise<number> {
    const state = await this.domain.table('operation_state').update('state', (current) => ({ ...current, projectLinkRevision: (current.projectLinkRevision ?? 0) + 1 }))
    return state.projectLinkRevision!
  }

  private async prune(): Promise<void> {
    const snapshots = [...this.domain.table('scan_snapshots').entries()]
      .sort(([, a], [, b]) => b.completedAt.localeCompare(a.completedAt))
    const stale = snapshots.slice(10).map(([key]) => key)
    if (stale.length > 0) await this.domain.table('scan_snapshots').deleteMany(stale)
  }
}

function storageKey(prefix: string, businessKey: string): string {
  return `${prefix}_${sha256(businessKey)}`
}

export class MemoryBridgeRepository implements BridgeRepository {
  private snapshots: ScanSnapshot[] = []
  private activities: ActivityRecord[] = []
  private plans: ImportPlan[] = []
  private baselineRecords = new Map<string, ArtifactBaseline>()
  private materializationRecords = new Map<string, MaterializationRecord>()
  private runs = new Map<string, ImportRun>()
  private operationState: OperationState = { id: 'state', nextFence: 1, projectLinkRevision: 0 }
  private projectLinks = new Map<string, ProjectLink>()

  latestSnapshot(): ScanSnapshot | undefined {
    return [...this.snapshots].sort((a, b) => b.revision - a.revision)[0]
  }

  listActivities(limit = 20): ActivityRecord[] {
    return [...this.activities].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
  }

  async saveSnapshot(snapshot: ScanSnapshot, activity: ActivityRecord): Promise<void> {
    this.activities = [activity, ...this.activities.filter((item) => item.id !== activity.id)]
    this.snapshots = [snapshot, ...this.snapshots.filter((item) => item.id !== snapshot.id)].slice(0, 10)
  }

  async saveActivity(activity: ActivityRecord): Promise<void> {
    this.activities = [activity, ...this.activities.filter((item) => item.id !== activity.id)]
  }

  async saveImportPlan(plan: ImportPlan): Promise<void> {
    this.plans = [plan, ...this.plans.filter((item) => item.id !== plan.id)]
  }

  getImportPlan(id: string): ImportPlan | undefined {
    return this.plans.find((plan) => plan.id === id)
  }

  latestImportPlan(): ImportPlan | undefined {
    return [...this.plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }

  baselines(): ReadonlyMap<string, ArtifactBaseline> { return new Map(this.baselineRecords) }
  async putBaseline(baseline: ArtifactBaseline): Promise<void> { this.baselineRecords.set(baseline.key, baseline) }
  listMaterializations(): MaterializationRecord[] { return [...this.materializationRecords.values()] }
  async putMaterialization(record: MaterializationRecord): Promise<void> { this.materializationRecords.set(record.id, record) }
  async deleteMaterialization(id: string): Promise<boolean> { return this.materializationRecords.delete(id) }
  listRuns(): ImportRun[] { return [...this.runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  getRun(id: string): ImportRun | undefined { return this.runs.get(id) }
  async putRun(run: ImportRun): Promise<void> { this.runs.set(run.id, run) }
  async initializeOperationState(): Promise<void> {}
  async acquireLease(runId: string): Promise<{ fence: number }> {
    if (this.operationState.lease) throw new Error(`operation-busy:${this.operationState.lease.runId}`)
    const fence = this.operationState.nextFence
    this.operationState = { id: 'state', nextFence: fence + 1, lease: { runId, fence, acquiredAt: new Date().toISOString() } }
    return { fence }
  }
  async releaseLease(runId: string, fence: number): Promise<void> {
    if (this.operationState.lease?.runId === runId && this.operationState.lease.fence === fence) this.operationState = { id: 'state', nextFence: this.operationState.nextFence, projectLinkRevision: this.operationState.projectLinkRevision }
  }
  listProjectLinks(): ProjectLink[] { return [...this.projectLinks.values()] }
  getProjectLink(id: string): ProjectLink | undefined { return this.projectLinks.get(id) }
  async putProjectLink(link: ProjectLink): Promise<void> { this.projectLinks.set(link.id, link) }
  async deleteProjectLink(id: string): Promise<boolean> { return this.projectLinks.delete(id) }
  projectLinkRevision(): number { return this.operationState.projectLinkRevision ?? 0 }
  async bumpProjectLinkRevision(): Promise<number> { const next = (this.operationState.projectLinkRevision ?? 0) + 1; this.operationState = { ...this.operationState, projectLinkRevision: next }; return next }
}
