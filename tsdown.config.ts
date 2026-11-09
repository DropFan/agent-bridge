import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/host/index.ts' },
    format: 'esm',
    target: 'es2022',
    unbundle: true,
    dts: true,
    outDir: 'lib',
    clean: true,
    external: [/^@deepseek-ai\//, 'zod'],
  },
  {
    entry: { client: 'src/client/index.ts' },
    format: 'iife',
    outputOptions: { entryFileNames: '[name].js' },
    platform: 'browser',
    noExternal: [/^@deepseek-ai\/dsh-typert-protocol/, /^zod$/],
    globalName: 'AgentBridgeClient',
    dts: false,
    outDir: 'lib',
    clean: false,
  },
])
