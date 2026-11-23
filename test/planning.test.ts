import { describe, expect, it } from 'vitest'
import { generateImportPlan, planArtifactKey } from '../src/planning/compare.js'
import { validateImportPlan } from '../src/planning/validate.js'
import type { AssessedArtifact, PortableArtifact, ScanSnapshot } from '../src/shared/contracts.js'
import type { ArtifactBaseline, DshTargetObservation } from '../src/planning/contracts.js'

function artifact(overrides: Partial<PortableArtifact> = {}): PortableArtifact {
  return {
    identity: { kind: 'instruction', scope: 'user', logicalName: 'CLAUDE.md' },
    source: { endpointId: 'claude-code', nativeRef: '/safe/CLAUDE.md', observedRevision: 's1' },
    title: 'CLAUDE.md', normalizedContent: 'rule', contentHash: 'source-1', sensitivity: 'public', resources: [],
    ...overrides,
  }
}

function snapshot(entries: PortableArtifact[]): ScanSnapshot {
  return {
    id: 'scan-1', revision: 3, startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:01Z', state: 'success',
    endpoints: [], warnings: [], artifacts: entries.map((item) => ({ artifact: item, compatibility: {
      level: 'native', targetKind: item.identity.kind === 'skill' ? 'skill-provider' : 'system-prompt', risk: 'medium', summary: '', losses: [], blockers: [],
    } })) as AssessedArtifact[],
  }
}

function target(artifacts: DshTargetObservation['artifacts'] = [], revision = 'target-1'): DshTargetObservation {
  return { revision, observedAt: '2026-01-01T00:00:02Z', artifacts, complete: true, warnings: [] }
}

describe('Phase 1 import planning', () => {
  it('首次目标不存在时提出 register', () => {
    const plan = generateImportPlan(snapshot([artifact()]), target(), new Map(), { scanRevision: 3 })
    expect(plan.operations[0]).toMatchObject({ action: 'register', state: 'proposed', targetEnvironmentId: 'imported-claude-code' })
  })

  it('首次同名目标碰撞进入冲突而不覆盖', () => {
    const item = artifact()
    const key = `imported-claude-code:instruction:user::CLAUDE.md`
    const plan = generateImportPlan(snapshot([item]), target([{ key, kind: 'instruction', logicalName: 'CLAUDE.md', contentHash: 'other', ownership: 'external' }]), new Map(), { scanRevision: 3 })
    expect(plan.operations[0]).toMatchObject({ action: 'skip', state: 'conflict', reasons: ['first-import-target-collision'] })
  })

  it('静态 prompt Command 进入 adapted command-wrapper 计划', () => {
    const command = artifact({
      identity: { kind: 'command', scope: 'user', logicalName: 'review' },
      normalizedContent: 'Review $ARGUMENTS',
      command: { name: 'review', argumentHint: '<path>', promptTemplate: 'Review $ARGUMENTS' },
    })
    const plan = generateImportPlan(snapshot([command]), target(), new Map(), { scanRevision: 3 })
    expect(plan.operations[0]).toMatchObject({ state: 'proposed', targetKind: 'command-wrapper', risk: 'medium' })
  })

  it('同一环境中的同名 Commands 在计划阶段冲突', () => {
    const first = artifact({ identity: { kind: 'command', scope: 'user', logicalName: 'review' }, normalizedContent: 'A', contentHash: 'a', command: { name: 'review', promptTemplate: 'A' } })
    const second = artifact({ identity: { kind: 'command', scope: 'project', logicalName: 'review', projectKey: '/repo' }, normalizedContent: 'B', contentHash: 'b', command: { name: 'review', promptTemplate: 'B' } })
    const plan = generateImportPlan(snapshot([first, second]), target(), new Map(), { scanRevision: 3 })
    expect(plan.operations).toHaveLength(2)
    expect(plan.operations.every((item) => item.state === 'conflict' && item.reasons.includes('duplicate-command-name'))).toBe(true)
  })

  it('带脚本 Skill 在 Phase 1 被阻塞', () => {
    const skill = artifact({
      identity: { kind: 'skill', scope: 'user', logicalName: 'unsafe' },
      resources: [{ relativePath: 'scripts/run.sh', kind: 'script', bytes: 1, contentHash: 'x', executable: true }],
    })
    const plan = generateImportPlan(snapshot([skill]), target(), new Map(), { scanRevision: 3 })
    expect(plan.operations[0]).toMatchObject({ action: 'skip', state: 'blocked' })
    expect(plan.operations[0]?.reasons).toContain('scripted-skill-outside-phase-one')
  })

  it('baseline 双边分叉进入冲突', () => {
    const item = artifact({ contentHash: 'source-new' })
    const artifactKey = planArtifactKey('claude-code', item.identity)
    const baseline: ArtifactBaseline = { key: artifactKey, sourceEndpointId: 'claude-code', sourceHash: 'old', targetHash: 'old' }
    const key = `imported-claude-code:instruction:user::CLAUDE.md`
    const plan = generateImportPlan(snapshot([item]), target([{ key, kind: 'instruction', logicalName: 'CLAUDE.md', contentHash: 'target-new', ownership: 'bridge-managed' }]), new Map([[artifactKey, baseline]]), { scanRevision: 3 })
    expect(plan.operations[0]).toMatchObject({ state: 'conflict', reasons: ['source-and-target-diverged'] })
  })

  it('source 或 target revision 变化会使计划过期', () => {
    const scan = snapshot([artifact()])
    const plan = generateImportPlan(scan, target(), new Map(), { scanRevision: 3 })
    expect(validateImportPlan(plan, scan, target())).toMatchObject({ valid: true, reasons: [] })
    expect(validateImportPlan(plan, { ...scan, revision: 4 }, target([], 'target-2'))).toMatchObject({
      valid: false,
      reasons: ['scan-revision-changed', 'target-revision-changed'],
    })
  })

  it('计划内容有稳定 digest 且生成后不被输入 mutation 改写', () => {
    const item = artifact()
    const scan = snapshot([item])
    const plan = generateImportPlan(scan, target(), new Map(), { scanRevision: 3 }, 0, new Date('2026-01-01T00:00:00Z'))
    item.contentHash = 'mutated'
    expect(plan.operations[0]?.expectedSourceHash).toBe('source-1')
    expect(plan.digest).toHaveLength(64)
  })
})
