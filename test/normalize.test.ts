import { describe, expect, it } from 'vitest'
import { normalizeMarkdown } from '../src/core/normalize.js'

 describe('normalizeMarkdown', () => {
  it('统一换行并移除行尾空白', () => {
    const first = normalizeMarkdown('hello  \r\nworld\t\r\n\r\n')
    const second = normalizeMarkdown('hello\nworld')
    expect(first).toEqual(second)
  })
})
