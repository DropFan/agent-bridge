import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'
import { z } from 'zod'

const endpointSchema = z.enum(['claude-code', 'codex', 'dsh'])
const operationSchema = z.object({
  id: z.string(), artifactKey: z.string(), artifactIdentity: z.unknown(), sourceEndpointId: endpointSchema,
  targetEnvironmentId: z.string(), targetKind: z.enum(['system-prompt', 'skill-provider']).optional(),
  action: z.enum(['register', 'update', 'skip']), state: z.enum(['proposed', 'unchanged', 'conflict', 'blocked', 'skipped']),
  expectedSourceHash: z.string(), expectedTargetRevision: z.string(), beforeHash: z.string().optional(), afterHash: z.string(),
  risk: z.enum(['low', 'medium', 'high', 'forbidden']), compatibility: z.unknown(), approvalRequired: z.boolean(), reasons: z.array(z.string()),
})
const planSchema = () => z.object({
  id: z.string(), createdAt: z.string(), scanId: z.string(), scanRevision: z.number(), targetRevision: z.string(),
  sourceEndpointIds: z.array(endpointSchema), targetEnvironmentIds: z.array(z.string()), operations: z.array(operationSchema),
  warnings: z.array(z.string()), blockers: z.array(z.string()), digest: z.string(),
})
const overviewSchema = () => z.object({
  snapshot: z.object({ id: z.string(), revision: z.number(), startedAt: z.string(), completedAt: z.string(), state: z.enum(['success', 'partial', 'error']), endpoints: z.array(z.unknown()), artifacts: z.array(z.unknown()), warnings: z.array(z.unknown()) }).optional(),
  activities: z.array(z.unknown()), latestPlan: planSchema().optional(), running: z.boolean(),
})
const scanRequestSchema = () => z.object({ includeProject: z.boolean().optional() })
const scanSnapshotSchema = () => z.object({ id: z.string(), revision: z.number(), startedAt: z.string(), completedAt: z.string(), state: z.enum(['success', 'partial', 'error']), endpoints: z.array(z.unknown()), artifacts: z.array(z.unknown()), warnings: z.array(z.unknown()) })
const generatePlanRequestSchema = () => z.object({ scanRevision: z.number(), sourceEndpointIds: z.array(z.enum(['claude-code', 'codex'])).optional() })
const validatePlanRequestSchema = () => z.object({ planId: z.string() })
const validationSchema = () => z.object({ planId: z.string(), valid: z.boolean(), checkedAt: z.string(), reasons: z.array(z.enum(['scan-revision-changed', 'source-changed', 'target-revision-changed', 'plan-not-found'])) })
const executeSchema = () => z.object({ planId: z.string(), planDigest: z.string(), confirmed: z.literal(true) })
const environmentRequestSchema = () => z.object({ environmentId: z.string() })
const artifactControlSchema = () => z.object({ materializationId: z.string(), enabled: z.boolean() })
const runRequestSchema = () => z.object({ runId: z.string() })
const runSchema = () => z.unknown()
const environmentsSchema = () => z.array(z.unknown())
const codec = (typeSymbol: string, create: () => z.ZodType) => ({ mode: 'strict' as const, typeSymbol, create })

export default createTypertRemoteInfo({
  package: '@local/agent-bridge',
  methods: {
    'agentBridge/overview': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [], result: codec('@local/agent-bridge#Overview', overviewSchema) },
    'agentBridge/scan': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#ScanRequest', scanRequestSchema), strictCodec: codec('@local/agent-bridge#ScanRequest', scanRequestSchema) }], cancellation: { parameter: 'signal' }, result: codec('@local/agent-bridge#ScanSnapshot', scanSnapshotSchema) },
    'agentBridge/generatePlan': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#GenerateImportPlanRequest', generatePlanRequestSchema), strictCodec: codec('@local/agent-bridge#GenerateImportPlanRequest', generatePlanRequestSchema) }], cancellation: { parameter: 'signal' }, result: codec('@local/agent-bridge#ImportPlan', planSchema) },
    'agentBridge/validatePlan': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#ValidateImportPlanRequest', validatePlanRequestSchema), strictCodec: codec('@local/agent-bridge#ValidateImportPlanRequest', validatePlanRequestSchema) }], cancellation: { parameter: 'signal' }, result: codec('@local/agent-bridge#ImportPlanValidation', validationSchema) },
    'agentBridge/executePlan': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#ExecuteImportPlanRequest', executeSchema), strictCodec: codec('@local/agent-bridge#ExecuteImportPlanRequest', executeSchema) }], cancellation: { parameter: 'signal' }, result: codec('@local/agent-bridge#ImportRun', runSchema) },
    'agentBridge/disableEnvironment': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#DisableEnvironmentRequest', environmentRequestSchema), strictCodec: codec('@local/agent-bridge#DisableEnvironmentRequest', environmentRequestSchema) }], result: codec('@local/agent-bridge#EnvironmentViews', environmentsSchema) },
    'agentBridge/setArtifactEnabled': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#SetArtifactEnabledRequest', artifactControlSchema), strictCodec: codec('@local/agent-bridge#SetArtifactEnabledRequest', artifactControlSchema) }], result: codec('@local/agent-bridge#EnvironmentViews', environmentsSchema) },
    'agentBridge/verifyEnvironment': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#VerifyEnvironmentRequest', environmentRequestSchema), strictCodec: codec('@local/agent-bridge#VerifyEnvironmentRequest', environmentRequestSchema) }], result: codec('@local/agent-bridge#EnvironmentView', () => z.unknown()) },
    'agentBridge/rollbackRun': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [{ name: 'request', source: 'json', codec: codec('@local/agent-bridge#RollbackRunRequest', runRequestSchema), strictCodec: codec('@local/agent-bridge#RollbackRunRequest', runRequestSchema) }], result: codec('@local/agent-bridge#ImportRun', runSchema) },
    'agentBridge/environments': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [], result: codec('@local/agent-bridge#EnvironmentViews', environmentsSchema) },
    'agentBridge/runs': { service: 'agentBridge', invocation: { kind: 'direct' }, parameters: [], result: codec('@local/agent-bridge#ImportRuns', () => z.array(z.unknown())) },
  },
}, z)
