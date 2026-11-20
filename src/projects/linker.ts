import path from 'node:path'
import { sha256 } from '../shared/hash.js'
import type { ProjectLinkCandidate, ProjectReference, WorkspaceReference } from './contracts.js'

export function buildProjectCandidates(
  projects: readonly ProjectReference[],
  workspaces: readonly WorkspaceReference[],
): ProjectLinkCandidate[] {
  return projects.map((project) => {
    const ranked = workspaces
      .map((workspace) => score(project, workspace))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.workspace.workspaceId.localeCompare(b.workspace.workspaceId))
    const best = ranked[0]
    const ambiguous = best !== undefined && ranked[1]?.score === best.score
    const confidence = ambiguous ? 'candidate' : best?.confidence ?? 'none'
    const workspace = confidence === 'none' ? undefined : best?.workspace
    return {
      id: sha256(`${project.endpointId}:${project.canonicalPath}:${workspace?.workspaceId ?? 'none'}`),
      projectKey: projectKey(project),
      project,
      workspace,
      confidence,
      reasons: ambiguous ? [...best!.reasons, 'ambiguous-equal-score'] : best?.reasons ?? ['no-workspace-match'],
      requiresConfirmation: confidence !== 'exact',
    }
  })
}

function score(project: ProjectReference, workspace: WorkspaceReference): {
  workspace: WorkspaceReference
  score: number
  confidence: ProjectLinkCandidate['confidence']
  reasons: string[]
} {
  if (project.canonicalPath === workspace.canonicalPath) {
    return { workspace, score: 100, confidence: 'exact', reasons: ['canonical-path-match'] }
  }
  if (project.repositoryRoot && workspace.repositoryRoot && project.repositoryRoot === workspace.repositoryRoot) {
    return { workspace, score: 85, confidence: 'strong', reasons: ['repository-root-match'] }
  }
  if (project.gitIdentity && workspace.gitIdentity && project.gitIdentity === workspace.gitIdentity) {
    return { workspace, score: 75, confidence: 'strong', reasons: ['git-identity-match'] }
  }
  if (path.basename(project.canonicalPath).toLowerCase() === path.basename(workspace.canonicalPath).toLowerCase()) {
    return { workspace, score: 30, confidence: 'candidate', reasons: ['basename-match'] }
  }
  return { workspace, score: 0, confidence: 'none', reasons: [] }
}

export function projectKey(project: ProjectReference): string {
  return sha256(project.repositoryRoot ?? project.gitIdentity ?? project.canonicalPath)
}
