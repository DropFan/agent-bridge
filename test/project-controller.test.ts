import { mkdtemp, mkdir, realpath } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ProjectController } from '../src/application/project-controller.js'
import { MemoryBridgeRepository } from '../src/storage/domain.js'
import type { SubprocessFacade } from '../src/sources/types.js'

const subprocess: SubprocessFacade = {
  async resolveExecutable() { throw new Error('git unavailable') },
  spawn() { throw new Error('unreachable') },
}

describe('ProjectController workspace identity', () => {
  it('只使用 workspace ID 解析的路径，不使用 Host cwd', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-project-'))
    const project = path.join(root, 'agent-bridge')
    await mkdir(project)
    const registry = {
      get: (id: string) => id === 'workspace-1' ? { id, path: project, title: 'Agent Bridge' } : undefined,
      list: () => [{ id: 'workspace-1', path: project, title: 'Agent Bridge' }],
    }
    const controller = new ProjectController(new MemoryBridgeRepository(), registry, subprocess)
    const snapshot = await controller.discover({ workspaceId: 'workspace-1' })
    expect(snapshot.projects).toHaveLength(2)
    expect(snapshot.projects.map((item) => item.displayName)).toEqual(['agent-bridge', 'agent-bridge'])
    const canonical = await realpath(project)
    expect(snapshot.projects.every((item) => item.canonicalPath === canonical)).toBe(true)
  })

  it('未知 workspace ID 被拒绝且不接受任意路径', async () => {
    const registry = { get: () => undefined, list: () => [] }
    const controller = new ProjectController(new MemoryBridgeRepository(), registry, subprocess)
    await expect(controller.discover({ workspaceId: '/tmp/evil' })).rejects.toThrow('workspace-not-found')
  })

  it('确认和拆分会递增 ProjectLink revision', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'agent-bridge-link-'))
    const registry = { get: () => ({ id: 'w', path: root, title: 'Repo' }), list: () => [{ id: 'w', path: root, title: 'Repo' }] }
    const repository = new MemoryBridgeRepository()
    const controller = new ProjectController(repository, registry, subprocess)
    const snapshot = await controller.discover({ workspaceId: 'w' })
    const candidate = snapshot.candidates[0]!
    const link = await controller.confirm({ candidateId: candidate.id, expectedRevision: snapshot.revision })
    expect(repository.projectLinkRevision()).toBe(1)
    await controller.unlink({ linkId: link.id, expectedRevision: link.revision })
    expect(repository.projectLinkRevision()).toBe(2)
  })
})
