export type EndpointKind = 'claude-code' | 'codex' | 'dsh'
export type ArtifactKind = 'instruction' | 'skill' | 'command'
export type ArtifactScope = 'user' | 'project'
export type CompatibilityLevel = 'native' | 'adapted' | 'archive-only' | 'blocked'
export type RiskLevel = 'low' | 'medium' | 'high' | 'forbidden'

export interface ArtifactIdentity {
  kind: ArtifactKind
  scope: ArtifactScope
  logicalName: string
  projectKey?: string | undefined
}

export interface ArtifactSource {
  endpointId: EndpointKind
  nativeRef: string
  observedRevision: string
}

export interface StaticResource {
  relativePath: string
  kind: 'reference' | 'asset' | 'script' | 'other'
  bytes: number
  contentHash: string
  executable: boolean
}

export interface PortableArtifact {
  identity: ArtifactIdentity
  source: ArtifactSource
  title: string
  description?: string | undefined
  normalizedContent?: string | undefined
  contentHash: string
  sensitivity: 'public' | 'unknown' | 'sensitive'
  resources: StaticResource[]
  command?: {
    name: string
    argumentHint?: string | undefined
    promptTemplate: string
  } | undefined
}

export interface CompatibilityAssessment {
  level: CompatibilityLevel
  targetKind?: 'system-prompt' | 'skill-provider' | 'command-wrapper' | undefined
  risk: RiskLevel
  summary: string
  losses: string[]
  blockers: string[]
  verifyMethod?: string | undefined
}

export interface AssessedArtifact {
  artifact: PortableArtifact
  compatibility: CompatibilityAssessment
}

export interface EndpointStatus {
  id: EndpointKind
  state: 'available' | 'missing' | 'unsupported' | 'error'
  executable?: string | undefined
  version?: string | undefined
  capabilities: string[]
  diagnostic?: string | undefined
}

export interface ScanSnapshot {
  id: string
  revision: number
  startedAt: string
  completedAt: string
  state: 'success' | 'partial' | 'error'
  endpoints: EndpointStatus[]
  artifacts: AssessedArtifact[]
  warnings: ScanWarning[]
}

export interface ScanWarning {
  code: string
  endpointId?: EndpointKind | undefined
  nativeRef?: string | undefined
  message: string
}

export interface ActivityRecord {
  id: string
  type: 'scan'
  state: 'success' | 'partial' | 'error' | 'interrupted'
  startedAt: string
  endedAt?: string | undefined
  summary: string
}
