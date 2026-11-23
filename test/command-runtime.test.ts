import { describe, expect, it } from 'vitest'
import { apply, expandPromptTemplate } from '../src/host/environment.js'
import type { MaterializationRecord } from '../src/materialization/contracts.js'

const record: MaterializationRecord = {
  id: 'm', artifactKey: 'k', artifactIdentity: { kind: 'command', scope: 'user', logicalName: 'review' },
  sourceEndpointId: 'claude-code', environmentId: 'imported-claude-code', targetKind: 'command-wrapper',
  content: 'Review $ARGUMENTS', contentHash: 'h', command: { name: 'review', argumentHint: '<path>', promptTemplate: 'Review $ARGUMENTS' },
  enabled: true, createdAt: '', updatedAt: '', runId: 'r',
}

describe('prompt command runtime', () => {
  it('注册无 attachments 的 scoped command，并只 steer 展开后的用户消息', () => {
    let definition: any
    const services = {
      systemPrompt: { section: () => () => undefined },
      skills: { register: () => () => undefined },
      commands: { register: (value: any) => { definition = value; return () => undefined } },
    }
    apply({ get: (name: string) => (services as any)[name] } as any, { environmentId: 'imported-claude-code', records: [record] })
    expect(definition).toMatchObject({ name: 'review', input: { hint: '<path>' } })
    expect(definition.input.attachments).toBeUndefined()
    const steered: any[] = []
    expect(definition.handler({ rawInput: ' src/a.ts ', agent: { steer: (message: any) => steered.push(message) } })).toMatchObject({ kind: 'success' })
    expect(JSON.stringify(steered[0])).toContain('Review src/a.ts')
  })

  it('静态模板展开不执行或解释参数', () => {
    expect(expandPromptTemplate('Review {{ args }}', '; rm -rf /')).toBe('Review ; rm -rf /')
  })
})
