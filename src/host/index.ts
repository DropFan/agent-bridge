import { Service, type Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { createScanController, validateScanRequest, type Overview, type ScanRequest } from '../application/scan-controller.js'
import { PlanController } from '../application/plan-controller.js'
import { ImportController } from '../application/import-controller.js'
import { MaterializationRuntime } from '../materialization/runtime.js'
import { observeDshTarget } from '../planning/target-observer.js'
import type { DisableEnvironmentRequest, EnvironmentView, ExecuteImportPlanRequest, ImportRun, RollbackRunRequest } from '../materialization/contracts.js'
import type { GenerateImportPlanRequest, ImportPlan, ImportPlanValidation, ValidateImportPlanRequest } from '../planning/contracts.js'
import { agentBridgeDomainSpec, DomainBridgeRepository } from '../storage/domain.js'
import type { ScanSnapshot } from '../shared/contracts.js'
import type { SubprocessFacade } from '../sources/types.js'

export const name = 'agent-bridge'
export const inject = ['storageDomain', 'subprocess', 'skills', 'agentPresets']

const remoteInitializers: Array<(this: AgentBridgeService) => void> = []

export class AgentBridgeService extends TypertRemoteService {
  static inject = inject
  private controller?: ReturnType<typeof createScanController>
  private planController?: PlanController
  private importController?: ImportController
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
    const repository = new DomainBridgeRepository(this.domain)
    await repository.initializeOperationState()
    this.controller = createScanController(subprocess, repository, process.cwd())
    const skills = this.ctx.get('skills') as any
    const agentPresets = this.ctx.get('agentPresets') as any
    this.planController = new PlanController(repository, skills, agentPresets, process.cwd())
    const runtime = new MaterializationRuntime(this.ctx)
    this.ctx.effect(() => () => runtime.dispose(), 'agent-bridge-materializations')
    this.importController = new ImportController(repository, runtime, {
      observe: (signal) => observeDshTarget(skills, agentPresets, process.cwd(), signal, repository.listMaterializations()),
    })
    await this.importController.restore()
  }

  overview(): Overview {
    return this.requireController().overview()
  }

  scan(request: ScanRequest, signal: AbortSignal): Promise<ScanSnapshot> {
    validateScanRequest(request)
    return this.requireController().scan(request, signal)
  }

  generatePlan(request: GenerateImportPlanRequest, signal: AbortSignal): Promise<ImportPlan> {
    return this.requirePlanController().generate(request, signal)
  }

  validatePlan(request: ValidateImportPlanRequest, signal: AbortSignal): Promise<ImportPlanValidation> {
    return this.requirePlanController().validate(request, signal)
  }

  executePlan(request: ExecuteImportPlanRequest, signal: AbortSignal): Promise<ImportRun> { return this.requireImportController().execute(request, signal) }
  disableEnvironment(request: DisableEnvironmentRequest): Promise<EnvironmentView[]> { return this.requireImportController().disableEnvironment(request) }
  rollbackRun(request: RollbackRunRequest): Promise<ImportRun> { return this.requireImportController().rollback(request) }
  environments(): EnvironmentView[] { return this.requireImportController().environments() }
  runs(): ImportRun[] { return this.requireImportController().runs() }

  private requireController(): ReturnType<typeof createScanController> {
    if (!this.controller) throw new Error('Agent Bridge is not ready')
    return this.controller
  }

  private requirePlanController(): PlanController {
    if (!this.planController) throw new Error('Agent Bridge planning is not ready')
    return this.planController
  }
  private requireImportController(): ImportController {
    if (!this.importController) throw new Error('Agent Bridge import is not ready')
    return this.importController
  }
}

markRemote('overview', AgentBridgeService.prototype.overview)
markRemote('scan', AgentBridgeService.prototype.scan)
markRemote('generatePlan', AgentBridgeService.prototype.generatePlan)
markRemote('validatePlan', AgentBridgeService.prototype.validatePlan)
markRemote('executePlan', AgentBridgeService.prototype.executePlan)
markRemote('disableEnvironment', AgentBridgeService.prototype.disableEnvironment)
markRemote('rollbackRun', AgentBridgeService.prototype.rollbackRun)
markRemote('environments', AgentBridgeService.prototype.environments)
markRemote('runs', AgentBridgeService.prototype.runs)

function markRemote(method: 'overview' | 'scan' | 'generatePlan' | 'validatePlan' | 'executePlan' | 'disableEnvironment' | 'rollbackRun' | 'environments' | 'runs', implementation: (...args: any[]) => unknown): void {
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
