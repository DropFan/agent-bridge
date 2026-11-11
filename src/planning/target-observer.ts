import { sha256 } from '../shared/hash.js'
import { identityKey } from '../core/identity.js'
import type { MaterializationRecord } from '../materialization/contracts.js'
import type { DshTargetObservation, TargetArtifactObservation } from './contracts.js'

export interface SkillsReader {
  snapshot(options?: { cwd?: string; signal?: AbortSignal }): Promise<{
    skills: Array<{ name: string; provider: string; source: string }>
    complete: boolean
  }>
}

export interface AgentPresetsReader {
  compositionInventory(): Promise<Array<{
    id: string
    broken?: string
    rows: Array<{ entryId: string | null; moduleName: string; enabled: boolean | 'conditional' }>
  }>>
}

export async function observeDshTarget(
  skills: SkillsReader | undefined,
  agentPresets: AgentPresetsReader | undefined,
  cwd: string,
  signal?: AbortSignal,
  managedRecords: readonly MaterializationRecord[] = [],
): Promise<DshTargetObservation> {
  const artifacts: TargetArtifactObservation[] = []
  const warnings: string[] = []
  let complete = true

  if (skills) {
    const catalog = await skills.snapshot({ cwd, ...(signal ? { signal } : {}) })
    complete &&= catalog.complete
    for (const skill of catalog.skills) {
      const environment = providerEnvironment(skill.provider)
      if (!environment) continue
      artifacts.push({
        key: `${environment}:skill:user::${encodeURIComponent(skill.name)}`,
        kind: 'skill',
        logicalName: skill.name,
        ownership: skill.provider.startsWith('agent-bridge:') ? 'bridge-managed' : 'external',
      })
    }
  } else {
    complete = false
    warnings.push('dsh-skills-service-unavailable')
  }

  if (agentPresets) {
    for (const preset of await agentPresets.compositionInventory()) {
      if (!preset.id.startsWith('imported-')) continue
      artifacts.push({
        key: `${preset.id}:environment:user::${encodeURIComponent(preset.id)}`,
        kind: 'environment',
        logicalName: preset.id,
        ownership: preset.rows.some((row) => row.moduleName === '@local/agent-bridge') ? 'bridge-managed' : 'external',
      })
      if (preset.broken) warnings.push(`preset-broken:${preset.id}`)
    }
  } else {
    warnings.push('dsh-agent-presets-service-unavailable')
  }

  for (const record of managedRecords) {
    if (!record.enabled) continue
    artifacts.push({
      key: `${record.environmentId}:${identityKey(record.artifactIdentity)}`,
      kind: record.artifactIdentity.kind,
      logicalName: record.artifactIdentity.logicalName,
      contentHash: record.contentHash,
      ownership: 'bridge-managed',
    })
  }
  const stable = [...artifacts].sort((a, b) => a.key.localeCompare(b.key))
  return {
    revision: sha256(JSON.stringify(stable)),
    observedAt: new Date().toISOString(),
    artifacts: stable,
    complete,
    warnings,
  }
}

function providerEnvironment(provider: string): string | undefined {
  if (provider === 'agent-bridge:claude-code') return 'imported-claude-code'
  if (provider === 'agent-bridge:codex') return 'imported-codex'
  return undefined
}
