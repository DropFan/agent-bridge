import type { ArtifactIdentity } from '../shared/contracts.js'

export function identityKey(identity: ArtifactIdentity): string {
  return [identity.kind, identity.scope, identity.projectKey ?? '', identity.logicalName]
    .map((part) => encodeURIComponent(part))
    .join(':')
}
