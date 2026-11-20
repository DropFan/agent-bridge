import { describe, expect, it } from 'vitest'
import { sanitizeGitRemote } from '../src/projects/git.js'
import { buildProjectCandidates } from '../src/projects/linker.js'
import type { ProjectReference, WorkspaceReference } from '../src/projects/contracts.js'
import { generateImportPlan } from '../src/planning/compare.js'
import { validateImportPlan } from '../src/planning/validate.js'

const project = (overrides: Partial<ProjectReference> = {}): ProjectReference => ({ endpointId: 'claude-code', nativePath: '/repo', canonicalPath: '/repo', displayName: 'repo', ...overrides })
const workspace = (overrides: Partial<WorkspaceReference> = {}): WorkspaceReference => ({ workspaceId: 'w1', path: '/repo', canonicalPath: '/repo', title: 'Repo', ...overrides })

describe('ProjectLink', () => {
  it('Git remote 清除 userinfo、query、fragment 和 .git', () => {
    expect(sanitizeGitRemote('https://user:token@example.com/org/repo.git?secret=x#frag')).toBe('example.com/org/repo')
    expect(sanitizeGitRemote('git@example.com:org/repo.git')).toBe('example.com/org/repo')
  })

  it('canonical path 相同产生 exact 自动候选', () => {
    expect(buildProjectCandidates([project()], [workspace()])[0]).toMatchObject({ confidence: 'exact', requiresConfirmation: false, reasons: ['canonical-path-match'] })
  })

  it('worktree common repository root 相同产生 strong 且需确认', () => {
    const candidate = buildProjectCandidates([project({ canonicalPath: '/repo-wt', repositoryRoot: '/repo/.git/worktrees/x' })], [workspace({ repositoryRoot: '/repo/.git/worktrees/x' })])[0]
    expect(candidate).toMatchObject({ confidence: 'strong', requiresConfirmation: true, reasons: ['repository-root-match'] })
  })

  it('仅 basename 相同为低置信候选且不得自动确认', () => {
    expect(buildProjectCandidates([project({ canonicalPath: '/a/repo' })], [workspace({ canonicalPath: '/b/repo' })])[0]).toMatchObject({ confidence: 'candidate', requiresConfirmation: true })
  })

  it('等分候选标记 ambiguous', () => {
    const result = buildProjectCandidates([project({ canonicalPath: '/a/repo' })], [workspace({ workspaceId: 'a', canonicalPath: '/b/repo' }), workspace({ workspaceId: 'b', canonicalPath: '/c/repo' })])[0]
    expect(result?.reasons).toContain('ambiguous-equal-score')
    expect(result?.requiresConfirmation).toBe(true)
  })

  it('ProjectLink revision 变化令计划过期', () => {
    const scan: any = { id: 's', revision: 1, startedAt: '', completedAt: '', state: 'success', endpoints: [], warnings: [], artifacts: [] }
    const target: any = { revision: 't', observedAt: '', artifacts: [], complete: true, warnings: [] }
    const plan = generateImportPlan(scan, target, new Map(), { scanRevision: 1 }, 2)
    expect(validateImportPlan(plan, scan, target, 2).valid).toBe(true)
    expect(validateImportPlan(plan, scan, target, 3)).toMatchObject({ valid: false, reasons: ['project-link-revision-changed'] })
  })
})
