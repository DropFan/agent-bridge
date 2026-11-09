import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = join(process.cwd(), 'lib')
const overview = schema(`z.object({
  snapshot: z.object({
    id: z.string(), revision: z.number(), startedAt: z.string(), completedAt: z.string(), state: z.enum(['success','partial','error']),
    endpoints: z.array(z.object({ id: z.enum(['claude-code','codex','dsh']), state: z.enum(['available','missing','unsupported','error']), executable: z.string().optional(), version: z.string().optional(), capabilities: z.array(z.string()), diagnostic: z.string().optional() })),
    artifacts: z.array(z.unknown()), warnings: z.array(z.unknown())
  }).optional(),
  activities: z.array(z.object({ id: z.string(), type: z.literal('scan'), state: z.enum(['success','partial','error','interrupted']), startedAt: z.string(), endedAt: z.string().optional(), summary: z.string() })),
  running: z.boolean()
})`)
const scanRequest = schema(`z.object({ includeProject: z.boolean().optional() })`)
const scanSnapshot = schema(`z.object({
  id: z.string(), revision: z.number(), startedAt: z.string(), completedAt: z.string(), state: z.enum(['success','partial','error']),
  endpoints: z.array(z.unknown()), artifacts: z.array(z.unknown()), warnings: z.array(z.unknown())
})`)
const methods = `{
  'agentBridge/overview': {
    service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [],
    result: { mode: 'strict', typeSymbol: '@local/agent-bridge#Overview', create: overviewSchema }
  },
  'agentBridge/scan': {
    service: 'agentBridge', invocation: { kind: 'direct' },
    parameters: [{ name: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanRequest', create: scanRequestSchema }, strictCodec: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanRequest', create: scanRequestSchema } }],
    cancellation: { parameter: 'signal' }, result: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanSnapshot', create: scanSnapshotSchema }
  }
}`
const common = `import { z } from 'zod'\nimport { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'\n${overview}\n${scanRequest}\n${scanSnapshot}\nconst info = createTypertRemoteInfo({ package: '@local/agent-bridge', methods: ${methods} }, z)\n`
writeFileSync(join(out, 'typert.remote-client.js'), `${common}export const TYPERT_REMOTE = info\nexport default TYPERT_REMOTE\n`)
writeFileSync(join(out, 'typert.host.js'), `${common}export const TYPERT = { package: '@local/agent-bridge', face: 'host', schemas: [], get invocations() { return info.descriptors }, model: { services: [], events: [], objects: [] } }\n`)
writeFileSync(join(out, 'typert.remote-client.d.ts'), `import type { TypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol'\nexport declare const TYPERT_REMOTE: TypertRemoteInfo\nexport default TYPERT_REMOTE\n`)
writeFileSync(join(out, 'typert.host.d.ts'), `export declare const TYPERT: unknown\n`)

function schema(expression) {
  const name = expression.includes('includeProject') ? 'scanRequestSchema' : expression.includes('running:') ? 'overviewSchema' : 'scanSnapshotSchema'
  return `let ${name}Value\nconst ${name} = () => (${name}Value ??= ${expression})`
}
