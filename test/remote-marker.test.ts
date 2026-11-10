import { describe, expect, it } from 'vitest'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { AgentBridgeService } from '../src/host/index.js'

describe('AgentBridgeService Remote markers', () => {
  it('公开扫描和只读计划端点', () => {
    const markers = remoteMethods(Object.create(AgentBridgeService.prototype))
    expect(markers.map((marker) => marker.method)).toEqual(['overview', 'scan', 'generatePlan', 'validatePlan'])
  })
})
