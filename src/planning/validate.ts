import type { ScanSnapshot } from '../shared/contracts.js'
import { planArtifactKey } from './compare.js'
import type { DshTargetObservation, ImportPlan, ImportPlanValidation } from './contracts.js'

export function validateImportPlan(
  plan: ImportPlan | undefined,
  snapshot: ScanSnapshot | undefined,
  target: DshTargetObservation,
  projectLinkRevision = 0,
  checkedAt = new Date(),
): ImportPlanValidation {
  if (!plan) return {
    planId: '',
    valid: false,
    checkedAt: checkedAt.toISOString(),
    reasons: ['plan-not-found'],
  }

  const reasons: ImportPlanValidation['reasons'] = []
  if (!snapshot || snapshot.id !== plan.scanId || snapshot.revision !== plan.scanRevision) {
    reasons.push('scan-revision-changed')
  } else {
    const currentHashes = new Map(snapshot.artifacts.map(({ artifact }) => [
      planArtifactKey(artifact.source.endpointId, artifact.identity),
      artifact.contentHash,
    ]))
    if (plan.operations.some((operation) => currentHashes.get(operation.artifactKey) !== operation.expectedSourceHash)) {
      reasons.push('source-changed')
    }
  }
  if (target.revision !== plan.targetRevision) reasons.push('target-revision-changed')
  if (projectLinkRevision !== plan.projectLinkRevision) reasons.push('project-link-revision-changed')

  return {
    planId: plan.id,
    valid: reasons.length === 0,
    checkedAt: checkedAt.toISOString(),
    reasons,
  }
}
