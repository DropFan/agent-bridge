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
    format: 'esm',
    platform: 'browser',
    dts: false,
    outDir: 'lib',
    clean: false,
  },
])
