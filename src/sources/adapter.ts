import { assessForDsh } from '../core/compatibility.js'
import type { AssessedArtifact, EndpointKind } from '../shared/contracts.js'
import { discoverRoots } from './discovery.js'
import { probeCli } from './probe.js'
import { claudeRoots, codexRoots } from './roots.js'
import type { SourceAdapter, SourceContext, SubprocessFacade } from './types.js'

export class FileSourceAdapter implements SourceAdapter {
  constructor(
    readonly id: EndpointKind,
    private readonly command: string,
    private readonly subprocess: SubprocessFacade,
  ) {}

  probe(signal?: AbortSignal) {
    return probeCli(this.subprocess, this.id, this.command, process.cwd(), signal)
  }

  discover(context: SourceContext) {
    const roots = this.id === 'claude-code'
      ? claudeRoots(context.homeDir, context.projectDir)
      : codexRoots(context.homeDir, context.projectDir)
    return discoverRoots(roots, context.signal)
  }
}

export function assessArtifacts(artifacts: Awaited<ReturnType<FileSourceAdapter['discover']>>['artifacts']): AssessedArtifact[] {
  return artifacts.map((artifact) => ({ artifact, compatibility: assessForDsh(artifact) }))
}
