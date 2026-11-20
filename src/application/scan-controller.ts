import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import type { ActivityRecord, EndpointStatus, ScanSnapshot, ScanWarning } from '../shared/contracts.js'
import type { ImportPlan } from '../planning/contracts.js'
import { assessArtifacts, FileSourceAdapter } from '../sources/adapter.js'
import type { SourceAdapter } from '../sources/types.js'
import type { BridgeRepository } from '../storage/domain.js'

export interface ScanRequest {
  includeProject?: boolean
  workspaceId?: string
}

export interface Overview {
  snapshot?: ScanSnapshot | undefined
  activities: ActivityRecord[]
  latestPlan?: ImportPlan | undefined
  running: boolean
}

export class ScanController {
  private current: { key: string; promise: Promise<ScanSnapshot> } | undefined

  constructor(
    private readonly sources: SourceAdapter[],
    private readonly repository: BridgeRepository,
    private readonly resolveWorkspacePath: (workspaceId: string) => string | undefined,
  ) {}

  overview(): Overview {
    const snapshot = this.repository.latestSnapshot()
    return {
      ...(snapshot ? { snapshot } : {}),
      activities: this.repository.listActivities(),
      ...(this.repository.latestImportPlan() ? { latestPlan: this.repository.latestImportPlan() } : {}),
      running: this.current !== undefined,
    }
  }

  scan(request: ScanRequest = {}, signal?: AbortSignal): Promise<ScanSnapshot> {
    validateScanRequest(request)
    const key = request.includeProject === false || !request.workspaceId ? 'user-only' : `workspace:${request.workspaceId}`
    if (this.current) {
      if (this.current.key !== key) return Promise.reject(new Error('scan-busy'))
      return this.current.promise
    }
    const operation = this.runScan(request, signal).finally(() => {
      if (this.current?.promise === operation) this.current = undefined
    })
    this.current = { key, promise: operation }
    return operation
  }

  private async runScan(request: ScanRequest, signal?: AbortSignal): Promise<ScanSnapshot> {
    const id = randomUUID()
    const startedAt = new Date().toISOString()
    const previousRevision = this.repository.latestSnapshot()?.revision ?? 0
    const endpoints: EndpointStatus[] = [dshEndpointStatus()]
    const artifacts: ScanSnapshot['artifacts'] = []
    const warnings: ScanWarning[] = []

    try {
      signal?.throwIfAborted()
      const observations = await Promise.all(this.sources.map(async (source) => {
        const status = await source.probe(signal)
        signal?.throwIfAborted()
        if (status.state !== 'available') return { status, discovered: undefined }
        try {
          const projectDir = request.includeProject !== false && request.workspaceId
            ? this.resolveWorkspacePath(request.workspaceId)
            : undefined
          if (request.workspaceId && request.includeProject !== false && !projectDir) throw new Error('workspace-not-found')
          const discovered = await source.discover({
            homeDir: homedir(),
            ...(projectDir ? { projectDir } : {}),
            ...(signal ? { signal } : {}),
          })
          return { status, discovered }
        } catch (error) {
          if (isAbort(error, signal)) throw error
          return { status: { ...status, state: 'error' as const, diagnostic: safeError(error) }, discovered: undefined }
        }
      }))

      for (const observation of observations) {
        endpoints.push(observation.status)
        if (!observation.discovered) continue
        artifacts.push(...assessArtifacts(observation.discovered.artifacts))
        warnings.push(...observation.discovered.warnings)
      }
      signal?.throwIfAborted()
    } catch (error) {
      if (!isAbort(error, signal)) throw error
      const completedAt = new Date().toISOString()
      await this.repository.saveActivity({
        id,
        type: 'scan',
        state: 'interrupted',
        startedAt,
        endedAt: completedAt,
        summary: '扫描被取消，未保存不完整快照。',
      })
      throw error
    }

    const sourceEndpoints = endpoints.filter((endpoint) => endpoint.id !== 'dsh')
    const available = sourceEndpoints.filter((endpoint) => endpoint.state === 'available').length
    const failed = sourceEndpoints.length - available
    const state = available === 0 ? 'error' : failed > 0 || warnings.length > 0 ? 'partial' : 'success'
    const completedAt = new Date().toISOString()
    const snapshot: ScanSnapshot = {
      id,
      revision: previousRevision + 1,
      startedAt,
      completedAt,
      state,
      endpoints,
      artifacts,
      warnings,
    }
    await this.repository.saveSnapshot(snapshot, {
      id,
      type: 'scan',
      state,
      startedAt,
      endedAt: completedAt,
      summary: `发现 ${artifacts.length} 项可移植数据，${warnings.length} 个警告。`,
    })
    return snapshot
  }
}

export function createScanController(
  subprocess: ConstructorParameters<typeof FileSourceAdapter>[2],
  repository: BridgeRepository,
  resolveWorkspacePath: (workspaceId: string) => string | undefined,
): ScanController {
  return new ScanController([
    new FileSourceAdapter('claude-code', 'claude', subprocess),
    new FileSourceAdapter('codex', 'codex', subprocess),
  ], repository, resolveWorkspacePath)
}

export function validateScanRequest(request: ScanRequest): void {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) throw new Error('invalid-scan-request')
  const keys = Object.keys(request)
  if (keys.some((key) => key !== 'includeProject' && key !== 'workspaceId')) throw new Error('invalid-scan-request')
  if (request.includeProject !== undefined && typeof request.includeProject !== 'boolean') throw new Error('invalid-scan-request')
  if (request.workspaceId !== undefined && (typeof request.workspaceId !== 'string' || !request.workspaceId)) throw new Error('invalid-scan-request')
}

function dshEndpointStatus(): EndpointStatus {
  return {
    id: 'dsh',
    state: 'available',
    version: '0.2.2-rc.1',
    capabilities: ['storage-domain', 'system-prompt', 'skills', 'agent-presets'],
  }
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown-error'
}
