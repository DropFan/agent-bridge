import type { Context } from '@deepseek-ai/cordis'
import type { MaterializationRecord } from './contracts.js'

interface AgentPresetsService {
  register(definition: {
    id: string
    name?: string
    description?: string
    order?: number
    plugins: Array<{ id: string; name: string; config: unknown }>
  }): Promise<() => Promise<void>>
  compositionInventory(): Promise<Array<{
    id: string
    broken?: string
    rows: Array<{ moduleName: string; enabled: boolean | 'conditional'; fiberState?: number }>
  }>>
}

export class MaterializationRuntime {
  private records = new Map<string, MaterializationRecord>()
  private environments = new Map<string, () => Promise<void>>()

  constructor(private readonly ctx: Context) {}

  async replace(records: readonly MaterializationRecord[]): Promise<void> {
    await this.dispose()
    this.records = new Map(records.map((record) => [record.id, record]))
    for (const environmentId of this.environmentIds()) await this.rebuild(environmentId)
  }

  async apply(record: MaterializationRecord): Promise<void> {
    this.records.set(record.id, record)
    await this.rebuild(record.environmentId)
  }

  async setArtifactEnabled(id: string, enabled: boolean): Promise<MaterializationRecord> {
    const record = this.records.get(id)
    if (!record) throw new Error('materialization-not-found')
    const next = { ...record, enabled, updatedAt: new Date().toISOString() }
    this.records.set(id, next)
    await this.rebuild(record.environmentId)
    return next
  }

  async disableEnvironment(environmentId: string): Promise<MaterializationRecord[]> {
    const changed: MaterializationRecord[] = []
    for (const record of this.records.values()) {
      if (record.environmentId !== environmentId || !record.enabled) continue
      const next = { ...record, enabled: false, updatedAt: new Date().toISOString() }
      this.records.set(record.id, next)
      changed.push(next)
    }
    await this.rebuild(environmentId)
    return changed
  }

  async verifyEnvironment(environmentId: string): Promise<{ valid: boolean; diagnostic?: string }> {
    const records = [...this.records.values()].filter((record) => record.environmentId === environmentId)
    const enabled = records.filter((record) => record.enabled)
    const preset = (await this.agentPresets().compositionInventory()).find((item) => item.id === environmentId)
    if (!enabled.length) return preset === undefined ? { valid: true } : { valid: false, diagnostic: 'disabled-environment-still-mounted' }
    if (!preset) return { valid: false, diagnostic: 'preset-missing' }
    if (preset.broken) return { valid: false, diagnostic: `preset-broken:${preset.broken}` }
    if (!preset.rows.some((row) => row.moduleName === '@local/agent-bridge/environment' && row.enabled === true)) return { valid: false, diagnostic: 'environment-plugin-missing' }
    return { valid: true }
  }

  async verify(record: MaterializationRecord): Promise<boolean> {
    const stored = this.records.get(record.id)
    if (stored?.contentHash !== record.contentHash || stored.enabled !== record.enabled) return false
    const preset = (await this.agentPresets().compositionInventory()).find((item) => item.id === record.environmentId)
    if (!record.enabled) return preset === undefined
    return preset !== undefined && preset.broken === undefined
      && preset.rows.some((row) => row.moduleName === '@local/agent-bridge/environment' && row.enabled === true)
  }

  list(): MaterializationRecord[] { return [...this.records.values()] }

  async dispose(): Promise<void> {
    for (const dispose of [...this.environments.values()].reverse()) await dispose()
    this.environments.clear()
  }

  private async rebuild(environmentId: string): Promise<void> {
    const previous = this.environments.get(environmentId)
    if (previous) await previous()
    this.environments.delete(environmentId)
    const records = [...this.records.values()].filter((record) => record.environmentId === environmentId && record.enabled)
    if (!records.length) return
    const dispose = await this.agentPresets().register({
      id: environmentId,
      name: environmentName(environmentId),
      description: 'Managed by Agent Bridge. Disable from Agent Bridge settings to remove its runtime contributions.',
      order: 100,
      plugins: [{
        id: 'agent-bridge-environment',
        name: '@local/agent-bridge/environment',
        config: { environmentId, records },
      }],
    })
    this.environments.set(environmentId, dispose)
  }

  private environmentIds(): string[] {
    return [...new Set([...this.records.values()].filter((record) => record.enabled).map((record) => record.environmentId))]
  }

  private agentPresets(): AgentPresetsService {
    const service = this.ctx.get('agentPresets') as AgentPresetsService | undefined
    if (!service) throw new Error('agent-presets-unavailable')
    return service
  }
}

function environmentName(id: string): string {
  if (id === 'imported-claude-code') return 'Imported from Claude Code'
  if (id === 'imported-codex') return 'Imported from Codex'
  return id
}
