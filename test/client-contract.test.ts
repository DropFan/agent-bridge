import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

interface LoadedClientPlugin {
  inject?: string[]
}

describe('Client Remote contract', () => {
  it('manifest 在 Client Remote 提供方之后加载', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(manifest.dsh.client.inject).toContain('@deepseek-ai/dsh-api-remotes')
  })

  it('Client Cordis 插件声明 remote 与 agentBridge namespace 注入', async () => {
    let plugin: LoadedClientPlugin | undefined
    const previousWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        __ModuleLoader__: {
          load(definition: { factory(require: (id: string) => unknown): LoadedClientPlugin }) {
            plugin = definition.factory((id) => {
              if (id === 'react') return { createElement() {} }
              throw new Error(`unexpected module: ${id}`)
            })
          },
        },
      },
    })

    try {
      await import('../src/client/index.js')
      expect(plugin?.inject).toEqual(['slots', 'remote', 'remote.agentBridge'])
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow })
    }
  })
})
