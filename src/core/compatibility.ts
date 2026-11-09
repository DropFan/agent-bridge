import type { CompatibilityAssessment, PortableArtifact } from '../shared/contracts.js'

export function assessForDsh(artifact: PortableArtifact): CompatibilityAssessment {
  if (artifact.sensitivity === 'sensitive') {
    return {
      level: 'blocked',
      risk: 'forbidden',
      summary: '内容命中敏感数据策略，禁止迁移。',
      losses: [],
      blockers: ['sensitive-content'],
    }
  }

  if (artifact.identity.kind === 'instruction') {
    return {
      level: 'native',
      targetKind: 'system-prompt',
      risk: 'medium',
      summary: '可转换为独立环境中的 DSH 指令贡献。',
      losses: [],
      blockers: [],
      verifyMethod: 'inspect-effective-prompt-assembly',
    }
  }

  const scripts = artifact.resources.filter((resource) => resource.kind === 'script')
  return {
    level: scripts.length > 0 ? 'adapted' : 'native',
    targetKind: 'skill-provider',
    risk: scripts.length > 0 ? 'high' : 'medium',
    summary: scripts.length > 0
      ? 'Skill 正文可迁移；脚本仅作为不可执行静态资源评估。'
      : '可由 DSH Skills provider 原生承载。',
    losses: scripts.length > 0 ? ['脚本不会因导入而执行或获得信任。'] : [],
    blockers: [],
    verifyMethod: 'inspect-effective-skill-catalog',
  }
}
