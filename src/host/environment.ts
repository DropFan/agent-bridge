import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { MaterializationRecord } from '../materialization/contracts.js'

export const name = 'agent-bridge-environment'
export const inject = ['systemPrompt', 'skills', 'commands']

export interface EnvironmentConfig {
  environmentId: string
  records: MaterializationRecord[]
}

export function apply(ctx: Context, config: EnvironmentConfig): Array<() => void> {
  const systemPrompt = ctx.get('systemPrompt') as { section(input: { name: string; order: number; text: string }): () => void } | undefined
  const skills = ctx.get('skills') as { register(input: Record<string, unknown>): () => void } | undefined
  const commands = ctx.get('commands') as { register(input: Record<string, unknown>): () => void } | undefined
  if (!systemPrompt || !skills || !commands) throw new Error('environment-services-unavailable')

  return config.records.filter((record) => record.enabled).map((record) => {
    if (record.targetKind === 'command-wrapper') {
      const command = record.command
      if (!command) throw new Error(`command-metadata-missing:${record.id}`)
      return commands.register({
        name: command.name,
        description: `Imported from ${record.sourceEndpointId}: ${record.artifactIdentity.logicalName}`,
        ...(command.argumentHint ? { input: { hint: command.argumentHint } } : {}),
        handler: ({ agent, rawInput }: any) => {
          const prompt = expandPromptTemplate(command.promptTemplate, rawInput)
          agent.steer(createUserMessage({ content: [{ type: 'text', text: prompt }], source: { kind: 'user' } }))
          return { kind: 'success', text: `Prompt submitted from /${command.name}.` }
        },
      })
    }
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

export function expandPromptTemplate(template: string, rawInput: string): string {
  const input = rawInput.trim()
  return template
    .replace(/\$ARGUMENTS\b/gu, input)
    .replace(/\{\{\s*(?:input|args|arguments)\s*\}\}/giu, input)
}
