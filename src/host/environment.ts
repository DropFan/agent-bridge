import type { Context } from '@deepseek-ai/cordis'
import type { MaterializationRecord } from '../materialization/contracts.js'

export const name = 'agent-bridge-environment'
export const inject = ['systemPrompt', 'skills']

export interface EnvironmentConfig {
  environmentId: string
  records: MaterializationRecord[]
}

export function apply(ctx: Context, config: EnvironmentConfig): Array<() => void> {
  const systemPrompt = ctx.get('systemPrompt') as { section(input: { name: string; order: number; text: string }): () => void } | undefined
  const skills = ctx.get('skills') as { register(input: Record<string, unknown>): () => void } | undefined
  if (!systemPrompt || !skills) throw new Error('environment-services-unavailable')

  return config.records.filter((record) => record.enabled).map((record) => {
    if (record.targetKind === 'system-prompt') return systemPrompt.section({
      name: `agent-bridge-${config.environmentId}-${record.id}`.replace(/[^a-z0-9_-]/giu, '-'),
      order: 500,
      text: record.content,
    })
    return skills.register({
      name: record.artifactIdentity.logicalName,
      description: `Imported from ${record.sourceEndpointId} by Agent Bridge.`,
      content: record.content,
      source: 'runtime',
      provider: `agent-bridge:${record.sourceEndpointId}`,
      invocation: { modelInvocable: true, userInvocable: true },
    })
  })
}
