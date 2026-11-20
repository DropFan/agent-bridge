import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

interface LoadedClientPlugin {
  inject?: string[]
  apply?: (ctx: any) => Promise<unknown>
}

describe('Client Remote contract', () => {
  it('manifest 在 Client Remote 提供方之后加载', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(manifest.dsh.client.inject).toContain('@deepseek-ai/dsh-api-gateway')
    expect(manifest.dsh.client.external).toBeUndefined()
  })

  it('Client bundle 以隔离 IIFE 包裹 ModuleLoader 注册', async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    expect(source).toContain('window.__ModuleLoader__.load')
    expect(source).toMatch(/^\(function\(\) \{/u)
  })

  it('构建生成符合 Loader 严格 codec 契约的 Remote contributions', async () => {
    const [{ TYPERT: rawTypert }, client] = await Promise.all([
      import('../lib/typert.host.js'),
      readFile(new URL('../lib/typert.remote-client.js', import.meta.url), 'utf8'),
    ])
    const TYPERT = rawTypert as { invocations: any[] }
    expect(TYPERT.invocations.map((item: any) => item.id)).toEqual([
      '@local/agent-bridge#agentBridge/overview',
      '@local/agent-bridge#agentBridge/scan',
      '@local/agent-bridge#agentBridge/generatePlan',
      '@local/agent-bridge#agentBridge/validatePlan',
      '@local/agent-bridge#agentBridge/discoverProjects',
      '@local/agent-bridge#agentBridge/projectLinks',
      '@local/agent-bridge#agentBridge/confirmProjectLink',
      '@local/agent-bridge#agentBridge/unlinkProject',
    ])
    for (const invocation of TYPERT.invocations) {
      expect(invocation.result).toMatchObject({ mode: 'strict', typeSymbol: expect.any(String) })
      expect(invocation.result.create).toBeTypeOf('function')
      for (const parameter of invocation.parameters) {
        expect(parameter.codec).toMatchObject({ mode: 'strict', typeSymbol: expect.any(String) })
        expect(parameter.codec.create).toBeTypeOf('function')
      }
    }
    expect(client).toContain('createTypertRemoteInfo')
  })

  it('Client Cordis 插件挂载自己的 Remote contribution', async () => {
    let plugin: LoadedClientPlugin | undefined
    const previousWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        __ModuleLoader__: {
          load(definition: { factory(require: (id: string) => unknown): LoadedClientPlugin }) {
            plugin = definition.factory((id) => {
              if (id === 'react') return { createElement() {} }
              if (id === 'zod') return { z: { object() {} } }
              if (id === '@deepseek-ai/dsh-typert-protocol/remote-info') return { createTypertRemoteInfo: () => ({ package: '@local/agent-bridge' }) }
              throw new Error(`unexpected module: ${id}`)
            })
          },
        },
      },
    })

    try {
      await import('../src/client/index.js')
      expect(plugin?.inject).toEqual(['slots', 'remote'])
      const injectCalls: string[][] = []
      const effects: string[] = []
      const fiber = Object.assign(Promise.resolve(), { dispose: async () => undefined })
      const ctx = {
        remote: { $mount: async () => async () => undefined },
        inject(deps: string[]) { injectCalls.push(deps); return fiber },
        effect(create: () => unknown, label: string) { effects.push(label); create(); return async () => undefined },
      }
      await plugin?.apply?.(ctx)
      expect(injectCalls).toEqual([['remote.agentBridge']])
      expect(effects).toContain('agent-bridge: remote view')
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow })
    }
  })
})
