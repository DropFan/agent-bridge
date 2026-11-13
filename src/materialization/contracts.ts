import type { ArtifactIdentity, EndpointKind } from '../shared/contracts.js'

export type ImportRunState =
  | 'validating'
  | 'materializing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'rolled-back'
  | 'rollback-failed'
  | 'interrupted'

export interface MaterializationRecord {
  id: string
  artifactKey: string
  artifactIdentity: ArtifactIdentity
  sourceEndpointId: EndpointKind
  environmentId: string
  targetKind: 'system-prompt' | 'skill-provider'
  content: string
  contentHash: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  runId: string
}

export interface ImportOperationResult {
  operationId: string
  materializationId?: string | undefined
  state: 'completed' | 'failed' | 'rolled-back' | 'rollback-failed'
  diagnostic?: string | undefined
}

export interface ImportRun {
  id: string
  planId: string
  planDigest: string
  fence: number
  state: ImportRunState
  startedAt: string
  endedAt?: string | undefined
  operationResults: ImportOperationResult[]
  diagnostic?: string | undefined
}

export interface OperationState {
  id: 'state'
  nextFence: number
  lease?: {
    runId: string
    fence: number
    acquiredAt: string
  } | undefined
}

export interface ExecuteImportPlanRequest {
  planId: string
  planDigest: string
  confirmed: true
}

export interface DisableEnvironmentRequest {
  environmentId: string
}

export interface SetArtifactEnabledRequest {
  materializationId: string
  enabled: boolean
}

export interface VerifyEnvironmentRequest {
  environmentId: string
}

export interface RollbackRunRequest {
  runId: string
}

export interface EnvironmentArtifactView {
  id: string
  logicalName: string
  kind: 'instruction' | 'skill'
  targetKind: 'system-prompt' | 'skill-provider'
  sourceEndpointId: EndpointKind
  contentHash: string
  enabled: boolean
  updatedAt: string
  runId: string
}

export interface EnvironmentView {
  id: string
  sourceEndpointId: EndpointKind
  enabled: boolean
  artifactCount: number
  instructionCount: number
  skillCount: number
  revision: string
  verifyState: 'verified' | 'degraded' | 'disabled'
  verifyDiagnostic?: string | undefined
  verifiedAt?: string | undefined
  lastRunId?: string | undefined
  artifacts: EnvironmentArtifactView[]
}
