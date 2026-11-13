import { describe, expect, it } from 'vitest'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { AgentBridgeService } from '../src/host/index.js'

describe('AgentBridgeService Remote markers', () => {
  it('公开扫描、计划和受控执行端点', () => {
    const markers = remoteMethods(Object.create(AgentBridgeService.prototype))
    expect(markers.map((marker) => marker.method)).toEqual([
      'overview', 'scan', 'generatePlan', 'validatePlan',
      'executePlan', 'disableEnvironment', 'setArtifactEnabled', 'verifyEnvironment', 'rollbackRun', 'environments', 'runs',
    ])
  })
})
