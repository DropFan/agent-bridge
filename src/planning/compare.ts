import { randomUUID } from 'node:crypto'
import { assessForDsh } from '../core/compatibility.js'
import { identityKey } from '../core/identity.js'
import { sha256 } from '../shared/hash.js'
import type { AssessedArtifact, EndpointKind, ScanSnapshot } from '../shared/contracts.js'
import type {
  ArtifactBaseline,
  DshTargetObservation,
  GenerateImportPlanRequest,
  ImportPlan,
  ImportPlanOperation,
} from './contracts.js'

export function generateImportPlan(
  snapshot: ScanSnapshot,
  target: DshTargetObservation,
  baselines: ReadonlyMap<string, ArtifactBaseline>,
  request: GenerateImportPlanRequest,
  projectLinkRevision = 0,
  now = new Date(),
): ImportPlan {
  if (request.scanRevision !== snapshot.revision) throw new Error('scan-revision-changed')
  const selected = new Set<EndpointKind>(request.sourceEndpointIds ?? ['claude-code', 'codex'])
  const operations = snapshot.artifacts
    .filter(({ artifact }) => selected.has(artifact.source.endpointId))
    .map((entry) => compareArtifact(entry, target, baselines))
    .sort((left, right) => left.artifactKey.localeCompare(right.artifactKey))

  const planBase = {
    id: randomUUID(),
    createdAt: now.toISOString(),
    scanId: snapshot.id,
    scanRevision: snapshot.revision,
    projectLinkRevision,
    targetRevision: target.revision,
    sourceEndpointIds: [...selected].sort() as EndpointKind[],
    targetEnvironmentIds: [...new Set(operations.map((operation) => operation.targetEnvironmentId))].sort(),
    operations,
    warnings: [...target.warnings],
    blockers: operations.filter((operation) => operation.state === 'blocked').map((operation) => operation.artifactKey),
  }
  return { ...planBase, digest: sha256(JSON.stringify(planBase)) }
}

export function planArtifactKey(endpointId: EndpointKind, identity: import('../shared/contracts.js').ArtifactIdentity): string {
  return `${endpointId}:${identityKey(identity)}`
}

function compareArtifact(
  entry: AssessedArtifact,
  target: DshTargetObservation,
  baselines: ReadonlyMap<string, ArtifactBaseline>,
): ImportPlanOperation {
  const { artifact } = entry
  const artifactKey = planArtifactKey(artifact.source.endpointId, artifact.identity)
  const targetEnvironmentId = `imported-${artifact.source.endpointId}`
  const targetKey = `${targetEnvironmentId}:${identityKey(artifact.identity)}`
  const currentTarget = target.artifacts.find((candidate) => candidate.key === targetKey)
  const baseline = baselines.get(artifactKey)
  const compatibility = assessForDsh(artifact)
  const hasScripts = artifact.resources.some((resource) => resource.kind === 'script')
  const reasons: string[] = []

  let state: ImportPlanOperation['state'] = 'proposed'
  let action: ImportPlanOperation['action'] = currentTarget ? 'update' : 'register'

  if (compatibility.level === 'blocked' || compatibility.risk === 'forbidden') {
    state = 'blocked'
    action = 'skip'
    reasons.push(...compatibility.blockers)
  } else if (artifact.identity.kind === 'skill' && hasScripts) {
    state = 'blocked'
    action = 'skip'
    reasons.push('scripted-skill-outside-phase-one')
  } else if (!baseline && currentTarget) {
    state = 'conflict'
    action = 'skip'
    reasons.push('first-import-target-collision')
  } else if (baseline) {
    const sourceChanged = artifact.contentHash !== baseline.sourceHash
    const targetChanged = currentTarget?.contentHash !== baseline.targetHash
    if (!sourceChanged && !targetChanged) {
      state = 'unchanged'
      action = 'skip'
      reasons.push('source-and-target-unchanged')
    } else if (!sourceChanged && targetChanged) {
      state = 'conflict'
      action = 'skip'
      reasons.push('target-changed-after-baseline')
    } else if (sourceChanged && targetChanged && currentTarget?.contentHash !== artifact.contentHash) {
      state = 'conflict'
      action = 'skip'
      reasons.push('source-and-target-diverged')
    }
  }

  if (!target.complete) {
    state = 'blocked'
    action = 'skip'
    reasons.push('target-observation-incomplete')
  }

  return {
    id: randomUUID(),
    artifactKey,
    artifactIdentity: artifact.identity,
    sourceEndpointId: artifact.source.endpointId,
    targetEnvironmentId,
    targetKind: compatibility.targetKind,
    action,
    state,
    expectedSourceHash: artifact.contentHash,
    expectedTargetRevision: target.revision,
    beforeHash: currentTarget?.contentHash,
    afterHash: artifact.contentHash,
    risk: compatibility.risk,
    compatibility,
    approvalRequired: state === 'proposed',
    reasons,
  }
}
