import { describe, expect, it } from 'vitest'
import { redactSecrets } from '../src/security/redact.js'

describe('redactSecrets', () => {
  it.each([
    'Authorization: Bearer fake-secret-token',
    'api_key=fake-secret-token',
    'OPENAI_API_KEY=fake-secret-token',
    'password=fake-secret-token',
    'token=fake-secret-token',
    'https://user:fake-secret-token@example.com/path',
  ])('不保留秘密原值：%s', (input) => {
    const result = redactSecrets(input)
    expect(result.text).not.toContain('fake-secret-token')
    expect(result.categories.length).toBeGreaterThan(0)
  })
})
