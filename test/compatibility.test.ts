import { describe, expect, it } from 'vitest'
import { assessForDsh } from '../src/core/compatibility.js'
import type { PortableArtifact } from '../src/shared/contracts.js'

function artifact(overrides: Partial<PortableArtifact> = {}): PortableArtifact {
  return {
    identity: { kind: 'skill', scope: 'user', logicalName: 'example' },
    source: { endpointId: 'claude-code', nativeRef: '/tmp/example/SKILL.md', observedRevision: 'rev' },
    title: 'example',
    contentHash: 'hash',
    sensitivity: 'public',
    resources: [],
    ...overrides,
  }
}

describe('assessForDsh', () => {
  it('将无脚本 Skill 评估为原生 Medium', () => {
    expect(assessForDsh(artifact())).toMatchObject({ level: 'native', risk: 'medium', targetKind: 'skill-provider' })
  })

  it('将带脚本 Skill 评估为 adapted High', () => {
    expect(assessForDsh(artifact({ resources: [{
      relativePath: 'scripts/run.sh', kind: 'script', bytes: 10, contentHash: 'x', executable: true,
    }] }))).toMatchObject({ level: 'adapted', risk: 'high' })
  })

  it('阻止敏感 artifact', () => {
    expect(assessForDsh(artifact({ sensitivity: 'sensitive' }))).toMatchObject({ level: 'blocked', risk: 'forbidden' })
  })
})
