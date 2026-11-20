import type {
  ArtifactIdentity,
  CompatibilityAssessment,
  EndpointKind,
  RiskLevel,
} from '../shared/contracts.js'

export type PlanOperationState =
  | 'proposed'
  | 'unchanged'
  | 'conflict'
  | 'blocked'
  | 'skipped'

export type PlanOperationAction = 'register' | 'update' | 'skip'

export interface TargetArtifactObservation {
  key: string
  kind: 'instruction' | 'skill' | 'environment'
  logicalName: string
  contentHash?: string | undefined
  ownership: 'bridge-managed' | 'external'
}

export interface DshTargetObservation {
  revision: string
  observedAt: string
  artifacts: TargetArtifactObservation[]
  complete: boolean
  warnings: string[]
}

export interface ArtifactBaseline {
  key: string
  sourceEndpointId: EndpointKind
  sourceHash?: string | undefined
  portableHash?: string | undefined
  targetHash?: string | undefined
  targetRevision?: string | undefined
  lastSuccessfulRunId?: string | undefined
}

export interface ImportPlanOperation {
  id: string
  artifactKey: string
  artifactIdentity: ArtifactIdentity
  sourceEndpointId: EndpointKind
  targetEnvironmentId: string
  targetKind?: 'system-prompt' | 'skill-provider' | undefined
  action: PlanOperationAction
  state: PlanOperationState
  expectedSourceHash: string
  expectedTargetRevision: string
  beforeHash?: string | undefined
  afterHash: string
  risk: RiskLevel
  compatibility: CompatibilityAssessment
  approvalRequired: boolean
  reasons: string[]
}

export interface ImportPlan {
  id: string
  createdAt: string
  scanId: string
  scanRevision: number
  projectLinkRevision: number
  targetRevision: string
  sourceEndpointIds: EndpointKind[]
  targetEnvironmentIds: string[]
  operations: ImportPlanOperation[]
  warnings: string[]
  blockers: string[]
  digest: string
}

export interface ImportPlanValidation {
  planId: string
  valid: boolean
  checkedAt: string
  reasons: Array<'scan-revision-changed' | 'source-changed' | 'target-revision-changed' | 'project-link-revision-changed' | 'plan-not-found'>
}

export interface GenerateImportPlanRequest {
  scanRevision: number
  sourceEndpointIds?: Array<'claude-code' | 'codex'> | undefined
}

export interface ValidateImportPlanRequest {
  planId: string
}
