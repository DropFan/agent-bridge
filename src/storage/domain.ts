import { defineDomain, domainTable, type Domain } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import type { ActivityRecord, ScanSnapshot } from '../shared/contracts.js'

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
    activities: domainTable<string, ActivityRecord>(activitySchema),
  },
})

export type AgentBridgeDomain = Domain<typeof agentBridgeDomainSpec>

export interface BridgeRepository {
  latestSnapshot(): ScanSnapshot | undefined
  listActivities(limit?: number): ActivityRecord[]
  saveSnapshot(snapshot: ScanSnapshot, activity: ActivityRecord): Promise<void>
  saveActivity(activity: ActivityRecord): Promise<void>
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

  private async prune(): Promise<void> {
    const snapshots = [...this.domain.table('scan_snapshots').entries()]
      .sort(([, a], [, b]) => b.completedAt.localeCompare(a.completedAt))
    const stale = snapshots.slice(10).map(([key]) => key)
    if (stale.length > 0) await this.domain.table('scan_snapshots').deleteMany(stale)
  }
}

export class MemoryBridgeRepository implements BridgeRepository {
  private snapshots: ScanSnapshot[] = []
  private activities: ActivityRecord[] = []

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
}
