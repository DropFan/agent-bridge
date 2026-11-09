const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'authorization-header', pattern: /\b(authorization\s*[:=]\s*)(?:bearer\s+)?[^\s,;]+/giu },
  { name: 'api-key', pattern: /\b(?:[a-z0-9]+[_-])*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|token)\s*[:=]\s*["']?[^\s,;"']+/giu },
  { name: 'url-userinfo', pattern: /([a-z][a-z0-9+.-]*:\/\/)[^/@\s]+@/giu },
  { name: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu },
]

export interface RedactionResult {
  text: string
  categories: string[]
}

export function redactSecrets(input: string): RedactionResult {
  const categories = new Set<string>()
  let text = input

  for (const entry of SECRET_PATTERNS) {
    text = text.replace(entry.pattern, (match, prefix: string | undefined) => {
      categories.add(entry.name)
      if (entry.name === 'url-userinfo') return `${prefix ?? ''}[REDACTED]@`
      if (entry.name === 'authorization-header') return `${prefix ?? ''}[REDACTED]`
      return '[REDACTED]'
    })
  }

  return { text, categories: [...categories].sort() }
}

export function containsLikelySecret(input: string): boolean {
  return redactSecrets(input).categories.length > 0
}
