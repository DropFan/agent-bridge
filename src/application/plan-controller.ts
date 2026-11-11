import type { BridgeRepository } from '../storage/domain.js'
import { generateImportPlan } from '../planning/compare.js'
import { observeDshTarget, type AgentPresetsReader, type SkillsReader } from '../planning/target-observer.js'
import { validateImportPlan } from '../planning/validate.js'
import type {
  GenerateImportPlanRequest,
  ImportPlan,
  ImportPlanValidation,
  ValidateImportPlanRequest,
} from '../planning/contracts.js'

export class PlanController {
  private current: Promise<ImportPlan> | undefined

  constructor(
    private readonly repository: BridgeRepository,
    private readonly skills: SkillsReader | undefined,
    private readonly agentPresets: AgentPresetsReader | undefined,
    private readonly cwd: string,
  ) {}

  latest(): ImportPlan | undefined {
    return this.repository.latestImportPlan()
  }

  generate(request: GenerateImportPlanRequest, signal?: AbortSignal): Promise<ImportPlan> {
    validateGenerateRequest(request)
    if (this.current) return this.current
    const operation = this.runGenerate(request, signal).finally(() => {
      if (this.current === operation) this.current = undefined
    })
    this.current = operation
    return operation
  }

  async validate(request: ValidateImportPlanRequest, signal?: AbortSignal): Promise<ImportPlanValidation> {
    if (!request || typeof request.planId !== 'string' || !request.planId) throw new Error('invalid-plan-validation-request')
    const target = await observeDshTarget(this.skills, this.agentPresets, this.cwd, signal, this.repository.listMaterializations())
    return validateImportPlan(
      this.repository.getImportPlan(request.planId),
      this.repository.latestSnapshot(),
      target,
    )
  }

  private async runGenerate(request: GenerateImportPlanRequest, signal?: AbortSignal): Promise<ImportPlan> {
    signal?.throwIfAborted()
    const snapshot = this.repository.latestSnapshot()
    if (!snapshot) throw new Error('scan-required')
    const target = await observeDshTarget(this.skills, this.agentPresets, this.cwd, signal, this.repository.listMaterializations())
    signal?.throwIfAborted()
    const plan = generateImportPlan(snapshot, target, this.repository.baselines(), request)
    await this.repository.saveImportPlan(plan)
    return plan
  }
}

export function validateGenerateRequest(request: GenerateImportPlanRequest): void {
  if (!request || typeof request !== 'object' || !Number.isSafeInteger(request.scanRevision) || request.scanRevision < 0) {
    throw new Error('invalid-generate-plan-request')
  }
  const keys = Object.keys(request)
  if (keys.some((key) => key !== 'scanRevision' && key !== 'sourceEndpointIds')) throw new Error('invalid-generate-plan-request')
  if (request.sourceEndpointIds && request.sourceEndpointIds.some((endpoint) => endpoint !== 'claude-code' && endpoint !== 'codex')) {
    throw new Error('invalid-generate-plan-request')
  }
}
