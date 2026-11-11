import { describe, expect, it } from 'vitest'
import { MaterializationRuntime } from '../src/materialization/runtime.js'
import type { MaterializationRecord } from '../src/materialization/contracts.js'

const record: MaterializationRecord = {
  id: 'm', artifactKey: 'k', artifactIdentity: { kind: 'instruction', scope: 'user', logicalName: 'x' },
  sourceEndpointId: 'claude-code', environmentId: 'imported-claude-code', targetKind: 'system-prompt',
  content: 'rule', contentHash: 'hash', enabled: true, createdAt: '', updatedAt: '', runId: 'run',
}

describe('MaterializationRuntime', () => {
  it('awaits asynchronous agent preset inventory during verify', async () => {
    let registered = false
    const services = {
      agentPresets: {
        async register() { registered = true; return async () => { registered = false } },
        async compositionInventory() {
          return registered ? [{ id: 'imported-claude-code', rows: [{ moduleName: '@local/agent-bridge/environment', enabled: true }] }] : []
        },
      },
    }
    const runtime = new MaterializationRuntime({ get: (name: string) => (services as any)[name] } as any)
    await runtime.apply(record)
    expect(await runtime.verify(record)).toBe(true)
    await runtime.dispose()
  })
})
