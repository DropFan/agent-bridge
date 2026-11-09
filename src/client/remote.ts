import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'
import { z } from 'zod'

const overviewSchema = () => z.object({
  snapshot: z.object({
    id: z.string(),
    revision: z.number(),
    startedAt: z.string(),
    completedAt: z.string(),
    state: z.enum(['success', 'partial', 'error']),
    endpoints: z.array(z.unknown()),
    artifacts: z.array(z.unknown()),
    warnings: z.array(z.unknown()),
  }).optional(),
  activities: z.array(z.unknown()),
  running: z.boolean(),
})

const scanRequestSchema = () => z.object({ includeProject: z.boolean().optional() })
const scanSnapshotSchema = () => z.object({
  id: z.string(),
  revision: z.number(),
  startedAt: z.string(),
  completedAt: z.string(),
  state: z.enum(['success', 'partial', 'error']),
  endpoints: z.array(z.unknown()),
  artifacts: z.array(z.unknown()),
  warnings: z.array(z.unknown()),
})

export default createTypertRemoteInfo({
  package: '@local/agent-bridge',
  methods: {
    'agentBridge/overview': {
      service: 'agentBridge',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: '@local/agent-bridge#Overview', create: overviewSchema },
    },
    'agentBridge/scan': {
      service: 'agentBridge',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'request',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanRequest', create: scanRequestSchema },
        strictCodec: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanRequest', create: scanRequestSchema },
      }],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: '@local/agent-bridge#ScanSnapshot', create: scanSnapshotSchema },
    },
  },
}, z)
