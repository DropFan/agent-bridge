import { Service, type Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { createScanController, validateScanRequest, type Overview, type ScanRequest } from '../application/scan-controller.js'
import { agentBridgeDomainSpec, DomainBridgeRepository } from '../storage/domain.js'
import type { ScanSnapshot } from '../shared/contracts.js'
import type { SubprocessFacade } from '../sources/types.js'

export const name = 'agent-bridge'
export const inject = ['storageDomain', 'subprocess']

const remoteInitializers: Array<(this: AgentBridgeService) => void> = []

export class AgentBridgeService extends TypertRemoteService {
  static inject = inject
  private controller?: ReturnType<typeof createScanController>
  private domain?: import('../storage/domain.js').AgentBridgeDomain

  constructor(ctx: Context) {
    super(ctx, 'agentBridge')
    for (const initialize of remoteInitializers) initialize.call(this)
  }

  async [Service.init](): Promise<void> {
    const storageDomain = this.ctx.get('storageDomain') as {
      open(spec: typeof agentBridgeDomainSpec): Promise<import('../storage/domain.js').AgentBridgeDomain>
    } | undefined
    const subprocess = this.ctx.get('subprocess') as SubprocessFacade | undefined
    if (!storageDomain || !subprocess) throw new Error('Agent Bridge requires storageDomain and subprocess')

    this.domain = await storageDomain.open(agentBridgeDomainSpec)
    this.ctx.effect(() => () => this.domain?.close(), 'agent-bridge-storage')
    this.controller = createScanController(subprocess, new DomainBridgeRepository(this.domain), process.cwd())
  }

  overview(): Overview {
    return this.requireController().overview()
  }

  scan(request: ScanRequest, signal: AbortSignal): Promise<ScanSnapshot> {
    validateScanRequest(request)
    return this.requireController().scan(request, signal)
  }

  private requireController(): ReturnType<typeof createScanController> {
    if (!this.controller) throw new Error('Agent Bridge is not ready')
    return this.controller
  }
}

markRemote('overview', AgentBridgeService.prototype.overview)
markRemote('scan', AgentBridgeService.prototype.scan)

function markRemote(method: 'overview' | 'scan', implementation: (...args: any[]) => unknown): void {
  Remote(implementation, {
    kind: 'method',
    name: method,
    static: false,
    private: false,
    metadata: undefined,
    access: {
      has: (value: AgentBridgeService) => method in value,
      get: (value: AgentBridgeService) => value[method] as (...args: any[]) => unknown,
    },
    addInitializer(initializer: (this: AgentBridgeService) => void) {
      remoteInitializers.push(initializer)
      initializer.call(Object.create(AgentBridgeService.prototype) as AgentBridgeService)
    },
  })
}

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(AgentBridgeService)
}
