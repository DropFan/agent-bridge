import type { EndpointKind } from '../shared/contracts.js'

export interface ProjectReference {
  endpointId: EndpointKind
  nativePath: string
  canonicalPath: string
  repositoryRoot?: string | undefined
  gitIdentity?: string | undefined
  displayName: string
}

export interface WorkspaceReference {
  workspaceId: string
  path: string
  canonicalPath: string
  title: string
  repositoryRoot?: string | undefined
  gitIdentity?: string | undefined
}

export type ProjectLinkConfidence = 'exact' | 'strong' | 'candidate' | 'none'

export interface ProjectLinkCandidate {
  id: string
  projectKey: string
  project: ProjectReference
  workspace?: WorkspaceReference | undefined
  confidence: ProjectLinkConfidence
  reasons: string[]
  requiresConfirmation: boolean
}

export interface ProjectLink {
  id: string
  projectKey: string
  claudeRefs: ProjectReference[]
  codexRefs: ProjectReference[]
  dshWorkspace?: WorkspaceReference | undefined
  canonicalPath: string
  repositoryRoot?: string | undefined
  gitIdentity?: string | undefined
  confidence: ProjectLinkConfidence
  confirmedByUser: boolean
  revision: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDiscoverySnapshot {
  revision: string
  observedAt: string
  projects: ProjectReference[]
  workspaces: WorkspaceReference[]
  candidates: ProjectLinkCandidate[]
  warnings: string[]
}

export interface ConfirmProjectLinkRequest {
  candidateId: string
  expectedRevision: string
}

export interface UnlinkProjectRequest {
  linkId: string
  expectedRevision: number
}
