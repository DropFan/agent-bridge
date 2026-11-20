import path from 'node:path'
import { realpath } from 'node:fs/promises'
import { sha256 } from '../shared/hash.js'
import type { EndpointKind } from '../shared/contracts.js'
import type { SubprocessFacade } from '../sources/types.js'
import type { BridgeRepository } from '../storage/domain.js'
import { inspectProjectIdentity } from '../projects/git.js'
import { buildProjectCandidates } from '../projects/linker.js'
import type {
  ConfirmProjectLinkRequest,
  ProjectDiscoverySnapshot,
  ProjectLink,
  ProjectReference,
  UnlinkProjectRequest,
  WorkspaceReference,
} from '../projects/contracts.js'

interface WorkspaceEntity { id: string; path: string; title: string }
interface WorkspaceRegistry { list(): WorkspaceEntity[]; get(id: string): WorkspaceEntity | undefined }

export interface DiscoverProjectsRequest { workspaceId: string }

export class ProjectController {
  private latest?: ProjectDiscoverySnapshot

  constructor(
    private readonly repository: BridgeRepository,
    private readonly workspaceRegistry: WorkspaceRegistry | undefined,
    private readonly subprocess: SubprocessFacade,
  ) {}

  async discover(request: DiscoverProjectsRequest, signal?: AbortSignal): Promise<ProjectDiscoverySnapshot> {
    if (!request?.workspaceId) throw new Error('workspace-required')
    const workspace = this.workspaceRegistry?.get(request.workspaceId)
    if (!workspace) throw new Error('workspace-not-found')
    const projects = await this.sourceProjects(workspace.path, signal)
    const workspaces = await this.workspaceProjects(signal)
    const candidates = buildProjectCandidates(projects, workspaces)
    const base = { observedAt: new Date().toISOString(), projects, workspaces, candidates, warnings: this.workspaceRegistry ? [] : ['workspace-registry-unavailable'] }
    this.latest = { ...base, revision: sha256(JSON.stringify(base)) }
    return this.latest
  }

  snapshot(): ProjectDiscoverySnapshot | undefined { return this.latest }
  links(): ProjectLink[] { return this.repository.listProjectLinks() }

  async confirm(request: ConfirmProjectLinkRequest): Promise<ProjectLink> {
    if (!this.latest || request.expectedRevision !== this.latest.revision) throw new Error('project-discovery-revision-changed')
    const candidate = this.latest.candidates.find((item) => item.id === request.candidateId)
    if (!candidate?.workspace) throw new Error('project-candidate-not-found')
    const existing = this.repository.listProjectLinks().find((item) => item.projectKey === candidate.projectKey)
    const now = new Date().toISOString()
    const link: ProjectLink = {
      id: existing?.id ?? `project_${candidate.projectKey}`,
      projectKey: candidate.projectKey,
      claudeRefs: candidate.project.endpointId === 'claude-code' ? [candidate.project] : existing?.claudeRefs ?? [],
      codexRefs: candidate.project.endpointId === 'codex' ? [candidate.project] : existing?.codexRefs ?? [],
      dshWorkspace: candidate.workspace,
      canonicalPath: candidate.project.canonicalPath,
      repositoryRoot: candidate.project.repositoryRoot,
      gitIdentity: candidate.project.gitIdentity,
      confidence: candidate.confidence,
      confirmedByUser: true,
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await this.repository.putProjectLink(link)
    await this.repository.bumpProjectLinkRevision()
    return link
  }

  async unlink(request: UnlinkProjectRequest): Promise<boolean> {
    const current = this.repository.getProjectLink(request.linkId)
    if (!current || current.revision !== request.expectedRevision) throw new Error('project-link-revision-changed')
    const removed = await this.repository.deleteProjectLink(request.linkId)
    if (removed) await this.repository.bumpProjectLinkRevision()
    return removed
  }

  private async sourceProjects(projectPath: string, signal?: AbortSignal): Promise<ProjectReference[]> {
    const identity = await inspectProjectIdentity(projectPath, this.subprocess, signal)
    return (['claude-code', 'codex'] as EndpointKind[]).map((endpointId) => ({
      endpointId,
      nativePath: projectPath,
      canonicalPath: identity.canonicalPath,
      repositoryRoot: identity.repositoryRoot,
      gitIdentity: identity.gitIdentity,
      displayName: path.basename(identity.canonicalPath),
    }))
  }

  private async workspaceProjects(signal?: AbortSignal): Promise<WorkspaceReference[]> {
    if (!this.workspaceRegistry) return []
    return Promise.all(this.workspaceRegistry.list().map(async (workspace) => {
      let canonicalPath = workspace.path
      try { canonicalPath = await realpath(workspace.path) } catch { /* missing workspace remains visible */ }
      let identity: Awaited<ReturnType<typeof inspectProjectIdentity>> | undefined
      try { identity = await inspectProjectIdentity(workspace.path, this.subprocess, signal) } catch { /* no Git identity */ }
      return {
        workspaceId: workspace.id,
        path: workspace.path,
        canonicalPath,
        title: workspace.title,
        repositoryRoot: identity?.repositoryRoot,
        gitIdentity: identity?.gitIdentity,
      }
    }))
  }
}
