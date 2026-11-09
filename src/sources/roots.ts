import path from 'node:path'
import type { DiscoveryRoot } from './discovery.js'

export function claudeRoots(homeDir: string, projectDir?: string): DiscoveryRoot[] {
  const roots: DiscoveryRoot[] = [{
    endpointId: 'claude-code',
    root: path.join(homeDir, '.claude'),
    scope: 'user',
    instructionFiles: ['CLAUDE.md'],
    skillDirs: ['skills'],
  }]
  if (projectDir) roots.push({
    endpointId: 'claude-code',
    root: projectDir,
    scope: 'project',
    instructionFiles: ['CLAUDE.md'],
    skillDirs: ['.claude/skills'],
    projectKey: projectDir,
  })
  return roots
}

export function codexRoots(homeDir: string, projectDir?: string): DiscoveryRoot[] {
  const roots: DiscoveryRoot[] = [
    {
      endpointId: 'codex',
      root: path.join(homeDir, '.codex'),
      scope: 'user',
      instructionFiles: ['AGENTS.md'],
      skillDirs: ['skills'],
    },
    {
      endpointId: 'codex',
      root: path.join(homeDir, '.agents'),
      scope: 'user',
      instructionFiles: ['AGENTS.md'],
      skillDirs: ['skills'],
    },
  ]
  if (projectDir) roots.push({
    endpointId: 'codex',
    root: projectDir,
    scope: 'project',
    instructionFiles: ['AGENTS.md'],
    skillDirs: ['.agents/skills'],
    projectKey: projectDir,
  })
  return roots
}
