import { sha256 } from '../shared/hash.js'

export interface NormalizedText {
  content: string
  contentHash: string
}

export function normalizeMarkdown(input: string): NormalizedText {
  const content = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/u, ''))
    .join('\n')
    .replace(/\n+$/u, '')

  return { content, contentHash: sha256(content) }
}
