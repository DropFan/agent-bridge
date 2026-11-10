import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = join(process.cwd(), 'lib')
const schema = (name, expression) => `let ${name}Value\nconst ${name} = () => (${name}Value ??= ${expression})`
const definitions = [
  schema('overviewSchema', `z.object({ snapshot: z.unknown().optional(), activities: z.array(z.unknown()), latestPlan: z.unknown().optional(), running: z.boolean() })`),
  schema('scanRequestSchema', `z.object({ includeProject: z.boolean().optional() })`),
  schema('scanSnapshotSchema', `z.object({ id: z.string(), revision: z.number(), startedAt: z.string(), completedAt: z.string(), state: z.enum(['success','partial','error']), endpoints: z.array(z.unknown()), artifacts: z.array(z.unknown()), warnings: z.array(z.unknown()) })`),
  schema('generatePlanRequestSchema', `z.object({ scanRevision: z.number(), sourceEndpointIds: z.array(z.enum(['claude-code','codex'])).optional() })`),
  schema('validatePlanRequestSchema', `z.object({ planId: z.string() })`),
  schema('planSchema', `z.object({ id: z.string(), createdAt: z.string(), scanId: z.string(), scanRevision: z.number(), targetRevision: z.string(), sourceEndpointIds: z.array(z.string()), targetEnvironmentIds: z.array(z.string()), operations: z.array(z.unknown()), warnings: z.array(z.string()), blockers: z.array(z.string()), digest: z.string() })`),
  schema('validationSchema', `z.object({ planId: z.string(), valid: z.boolean(), checkedAt: z.string(), reasons: z.array(z.string()) })`),
].join('\n')
const codec = (symbol, create) => `{ mode: 'strict', typeSymbol: '${symbol}', create: ${create} }`
const method = (name, params, result, cancellation = false) => `'agentBridge/${name}': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [${params}], ${cancellation ? "cancellation: { parameter: 'signal' }," : ''} result: ${result} }`
const parameter = (name, symbol, create) => `{ name: '${name}', source: 'json', codec: ${codec(symbol, create)}, strictCodec: ${codec(symbol, create)} }`
const methods = `{
${method('overview', '', codec('@local/agent-bridge#Overview', 'overviewSchema'))},
${method('scan', parameter('request', '@local/agent-bridge#ScanRequest', 'scanRequestSchema'), codec('@local/agent-bridge#ScanSnapshot', 'scanSnapshotSchema'), true)},
${method('generatePlan', parameter('request', '@local/agent-bridge#GenerateImportPlanRequest', 'generatePlanRequestSchema'), codec('@local/agent-bridge#ImportPlan', 'planSchema'), true)},
${method('validatePlan', parameter('request', '@local/agent-bridge#ValidateImportPlanRequest', 'validatePlanRequestSchema'), codec('@local/agent-bridge#ImportPlanValidation', 'validationSchema'), true)}
}`
const common = `import { z } from 'zod'\nimport { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'\n${definitions}\nconst info = createTypertRemoteInfo({ package: '@local/agent-bridge', methods: ${methods} }, z)\n`
writeFileSync(join(out, 'typert.remote-client.js'), `${common}export const TYPERT_REMOTE = info\nexport default TYPERT_REMOTE\n`)
writeFileSync(join(out, 'typert.host.js'), `${common}export const TYPERT = { package: '@local/agent-bridge', face: 'host', schemas: [], get invocations() { return info.descriptors }, model: { services: [], events: [], objects: [] } }\n`)
writeFileSync(join(out, 'typert.remote-client.d.ts'), `import type { TypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol'\nexport declare const TYPERT_REMOTE: TypertRemoteInfo\nexport default TYPERT_REMOTE\n`)
writeFileSync(join(out, 'typert.host.d.ts'), `export declare const TYPERT: unknown\n`)
