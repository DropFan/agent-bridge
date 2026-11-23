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

  if (artifact.identity.kind === 'command') {
    if (!artifact.command) return {
      level: 'blocked', risk: 'high', summary: 'Command 格式不受支持。', losses: [], blockers: ['unsupported-command-format'],
    }
    return {
      level: 'adapted', targetKind: 'command-wrapper', risk: 'medium',
      summary: '静态 prompt Command 可转换为 DSH scoped prompt wrapper。',
      losses: ['命令结果由 DSH Agent 处理；来源端专属执行语义不会迁移。'], blockers: [], verifyMethod: 'inspect-effective-command-catalog',
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
