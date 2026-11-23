import path from 'node:path'
import { lstat, readFile, readdir, realpath } from 'node:fs/promises'
import { normalizeMarkdown } from '../core/normalize.js'
import { containsLikelySecret } from '../security/redact.js'
import { assertSafeRegularFile } from '../security/path-policy.js'
import { sha256 } from '../shared/hash.js'
import type {
  ArtifactScope,
  EndpointKind,
  PortableArtifact,
  ScanWarning,
  StaticResource,
} from '../shared/contracts.js'
import type { DiscoveryResult } from './types.js'

const MAX_INSTRUCTION_BYTES = 1024 * 1024
const MAX_SKILL_FILE_BYTES = 1024 * 1024
const MAX_RESOURCE_BYTES = 8 * 1024 * 1024
const RESOURCE_DIRS = new Set(['references', 'assets', 'scripts'])

export interface DiscoveryRoot {
  endpointId: EndpointKind
  root: string
  scope: ArtifactScope
  instructionFiles: string[]
  skillDirs: string[]
  commandDirs?: string[]
  projectKey?: string
}

export async function discoverRoots(roots: DiscoveryRoot[], signal?: AbortSignal): Promise<DiscoveryResult> {
  const artifacts: PortableArtifact[] = []
  const warnings: ScanWarning[] = []

  for (const root of roots) {
    signal?.throwIfAborted()
    for (const fileName of root.instructionFiles) {
      const candidate = path.join(root.root, fileName)
      const result = await readInstruction(root, candidate)
      if (result.artifact) artifacts.push(result.artifact)
      if (result.warning) warnings.push(result.warning)
    }
    for (const commandDir of root.commandDirs ?? []) {
      const result = await readCommands(root, path.join(root.root, commandDir), signal)
      artifacts.push(...result.artifacts)
      warnings.push(...result.warnings)
    }
    for (const skillDir of root.skillDirs) {
      const result = await readSkills(root, path.join(root.root, skillDir), signal)
      artifacts.push(...result.artifacts)
      warnings.push(...result.warnings)
    }
  }

  return { artifacts, warnings }
}

async function readInstruction(root: DiscoveryRoot, candidate: string): Promise<{
  artifact?: PortableArtifact
  warning?: ScanWarning
}> {
  try {
    const safe = await assertSafeRegularFile(root.root, candidate, MAX_INSTRUCTION_BYTES)
    const raw = await readFile(safe.realPath, 'utf8')
    if (containsLikelySecret(raw)) {
      return { warning: warning(root.endpointId, candidate, 'sensitive-content', '指令文件疑似包含秘密，已跳过。') }
    }
    const normalized = normalizeMarkdown(raw)
    return {
      artifact: {
        identity: {
          kind: 'instruction',
          scope: root.scope,
          logicalName: path.basename(candidate),
          ...(root.projectKey ? { projectKey: root.projectKey } : {}),
        },
        source: {
          endpointId: root.endpointId,
          nativeRef: candidate,
          observedRevision: normalized.contentHash,
        },
        title: path.basename(candidate),
        normalizedContent: normalized.content,
        contentHash: normalized.contentHash,
        sensitivity: 'public',
        resources: [],
      },
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'read-failed'
    if (code === 'ENOENT' || errorCode(error) === 'ENOENT') return {}
    return { warning: warning(root.endpointId, candidate, code, '无法安全读取指令文件，已跳过。') }
  }
}

async function readCommands(root: DiscoveryRoot, commandRoot: string, signal?: AbortSignal): Promise<DiscoveryResult> {
  const artifacts: PortableArtifact[] = []
  const warnings: ScanWarning[] = []
  let entries
  try {
    const resolvedRoot = await assertContainedDirectory(root.root, commandRoot)
    entries = await readdir(resolvedRoot, { withFileTypes: true })
    commandRoot = resolvedRoot
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { artifacts, warnings }
    return { artifacts, warnings: [warning(root.endpointId, commandRoot, 'command-root-unreadable', 'Commands 根目录不可读。')] }
  }

  for (const entry of entries) {
    signal?.throwIfAborted()
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const commandFile = path.join(commandRoot, entry.name)
    try {
      const safe = await assertSafeRegularFile(commandRoot, commandFile, MAX_INSTRUCTION_BYTES)
      if (safe.executable) {
        warnings.push(warning(root.endpointId, commandFile, 'executable-command-blocked', '可执行 Command 文件已阻塞。'))
        continue
      }
      const raw = await readFile(safe.realPath, 'utf8')
      if (containsLikelySecret(raw)) {
        warnings.push(warning(root.endpointId, commandFile, 'sensitive-content', 'Command 疑似包含秘密，已跳过。'))
        continue
      }
      const normalized = normalizeMarkdown(raw)
      const command = parseStaticCommand(normalized.content, path.basename(entry.name, '.md'))
      if (!command) {
        warnings.push(warning(root.endpointId, commandFile, 'unsafe-command-semantics', 'Command 含执行语义或格式不受支持，已阻塞。'))
        continue
      }
      artifacts.push({
        identity: { kind: 'command', scope: root.scope, logicalName: command.name, ...(root.projectKey ? { projectKey: root.projectKey } : {}) },
        source: { endpointId: root.endpointId, nativeRef: commandFile, observedRevision: normalized.contentHash },
        title: command.name, description: command.description, normalizedContent: command.promptTemplate,
        contentHash: normalized.contentHash, sensitivity: 'public', resources: [],
        command: { name: command.name, argumentHint: command.argumentHint, promptTemplate: command.promptTemplate },
      })
    } catch (error) {
      warnings.push(warning(root.endpointId, commandFile, error instanceof Error ? error.message : 'command-read-failed', 'Command 无法安全读取，已跳过。'))
    }
  }
  return { artifacts, warnings }
}

function parseStaticCommand(content: string, fallbackName: string): { name: string; description: string; argumentHint?: string; promptTemplate: string } | undefined {
  const metadata = parseFrontmatter(content)
  const body = metadata.body.trim()
  const name = (metadata.values.get('name') ?? fallbackName).trim().toLowerCase()
  if (!/^[a-z][a-z0-9_-]*$/u.test(name) || !body) return undefined
  if (/\b(?:bash|shell|command|exec|hook|allowed-tools|tool)\s*:/iu.test(metadata.frontmatter)) return undefined
  if (/^#!|```(?:sh|bash|zsh|fish|powershell|cmd)\b/imu.test(body)) return undefined
  const description = metadata.values.get('description')?.trim() || `Imported prompt command ${name}`
  const argumentHint = metadata.values.get('argument-hint')?.trim() || metadata.values.get('argumentHint')?.trim()
  return { name, description, ...(argumentHint ? { argumentHint } : {}), promptTemplate: body }
}

async function readSkills(root: DiscoveryRoot, skillRoot: string, signal?: AbortSignal): Promise<DiscoveryResult> {
  const artifacts: PortableArtifact[] = []
  const warnings: ScanWarning[] = []
  let entries
  try {
    const resolvedRoot = await assertContainedDirectory(root.root, skillRoot)
    entries = await readdir(resolvedRoot, { withFileTypes: true })
    skillRoot = resolvedRoot
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { artifacts, warnings }
    return { artifacts, warnings: [warning(root.endpointId, skillRoot, 'root-unreadable', 'Skills 根目录不可读。')] }
  }

  for (const entry of entries) {
    signal?.throwIfAborted()
    if (entry.isSymbolicLink()) {
      warnings.push(warning(root.endpointId, path.join(skillRoot, entry.name), 'symlink-skipped', 'Skill symlink 默认跳过。'))
      continue
    }
    const skillFile = entry.isDirectory()
      ? path.join(skillRoot, entry.name, 'SKILL.md')
      : entry.isFile() && entry.name.endsWith('.md')
        ? path.join(skillRoot, entry.name)
        : undefined
    if (!skillFile) continue

    try {
      const safe = await assertSafeRegularFile(skillRoot, skillFile, MAX_SKILL_FILE_BYTES)
      const raw = await readFile(safe.realPath, 'utf8')
      if (containsLikelySecret(raw)) {
        warnings.push(warning(root.endpointId, skillFile, 'sensitive-content', 'Skill 正文疑似包含秘密，已跳过。'))
        continue
      }
      const normalized = normalizeMarkdown(raw)
      const metadata = parseSkillMetadata(normalized.content, path.basename(entry.name, '.md'))
      const resources = entry.isDirectory()
        ? await collectResources(skillRoot, path.join(skillRoot, entry.name), root.endpointId, warnings, signal)
        : []
      const resourceRevision = resources.map((item) => [item.relativePath, item.kind, item.bytes, item.contentHash, item.executable].join(':')).join('|')
      artifacts.push({
        identity: {
          kind: 'skill',
          scope: root.scope,
          logicalName: metadata.name,
          ...(root.projectKey ? { projectKey: root.projectKey } : {}),
        },
        source: {
          endpointId: root.endpointId,
          nativeRef: skillFile,
          observedRevision: sha256(`${normalized.contentHash}:${resourceRevision}`),
        },
        title: metadata.name,
        ...(metadata.description ? { description: metadata.description } : {}),
        normalizedContent: normalized.content,
        contentHash: normalized.contentHash,
        sensitivity: 'public',
        resources,
      })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'skill-read-failed'
      if (errorCode(error) !== 'ENOENT') {
        warnings.push(warning(root.endpointId, skillFile, code, 'Skill 无法安全读取，已跳过。'))
      }
    }
  }

  return { artifacts, warnings }
}

async function collectResources(
  allowedRoot: string,
  skillDir: string,
  endpointId: EndpointKind,
  warnings: ScanWarning[],
  signal?: AbortSignal,
): Promise<StaticResource[]> {
  const resources: StaticResource[] = []
  for (const dirName of RESOURCE_DIRS) {
    const dir = path.join(skillDir, dirName)
    await walkResourceDirectory(allowedRoot, dir, dirName, endpointId, resources, warnings, signal)
  }
  return resources.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

async function walkResourceDirectory(
  allowedRoot: string,
  dir: string,
  kind: string,
  endpointId: EndpointKind,
  resources: StaticResource[],
  warnings: ScanWarning[],
  signal?: AbortSignal,
): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return
    warnings.push(warning(endpointId, dir, 'resource-dir-unreadable', 'Skill 资源目录不可读。'))
    return
  }

  for (const entry of entries) {
    signal?.throwIfAborted()
    const candidate = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      warnings.push(warning(endpointId, candidate, 'symlink-skipped', 'Skill 资源 symlink 默认跳过。'))
      continue
    }
    if (entry.isDirectory()) {
      await walkResourceDirectory(allowedRoot, candidate, kind, endpointId, resources, warnings, signal)
      continue
    }
    if (!entry.isFile()) continue
    try {
      const safe = await assertSafeRegularFile(allowedRoot, candidate, MAX_RESOURCE_BYTES)
      const bytes = await readFile(safe.realPath)
      resources.push({
        relativePath: path.relative(allowedRoot, candidate),
        kind: kind === 'scripts' ? 'script' : kind === 'assets' ? 'asset' : 'reference',
        bytes: safe.bytes,
        contentHash: sha256(bytes),
        executable: safe.executable,
      })
    } catch (error) {
      warnings.push(warning(endpointId, candidate, error instanceof Error ? error.message : 'resource-read-failed', 'Skill 资源无法安全读取，已跳过。'))
    }
  }
}

function parseSkillMetadata(content: string, fallbackName: string): { name: string; description?: string } {
  const { values } = parseFrontmatter(content)
  const description = values.get('description')
  return { name: values.get('name') || fallbackName, ...(description ? { description } : {}) }
}

function parseFrontmatter(content: string): { values: Map<string, string>; frontmatter: string; body: string } {
  if (!content.startsWith('---\n')) return { values: new Map(), frontmatter: '', body: content }
  const end = content.indexOf('\n---\n', 4)
  if (end < 0) return { values: new Map(), frontmatter: '', body: content }
  const frontmatter = content.slice(4, end)
  const values = new Map<string, string>()
  for (const line of frontmatter.split('\n')) {
    const match = /^([a-zA-Z][\w-]*):\s*["']?(.*?)["']?\s*$/u.exec(line)
    if (match?.[1] && match[2] !== undefined) values.set(match[1], match[2])
  }
  return { values, frontmatter, body: content.slice(end + 5) }
}

async function assertContainedDirectory(root: string, candidate: string): Promise<string> {
  const candidateStat = await lstat(candidate)
  if (candidateStat.isSymbolicLink() || !candidateStat.isDirectory()) throw new Error('unsafe-skill-root')
  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)])
  const relative = path.relative(realRoot, realCandidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path-escape')
  return realCandidate
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

function warning(endpointId: EndpointKind, nativeRef: string, code: string, message: string): ScanWarning {
  return { code, endpointId, nativeRef, message }
}
