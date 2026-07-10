import { describe, expect, it } from 'vitest'
import { stripPdfExtension } from './filename'

describe('stripPdfExtension', () => {
  it.each([
    ['song.pdf', 'song'],
    ['Song.PDF', 'Song'],
    ['no-extension', 'no-extension'],
    ['multi.pdf.pdf', 'multi.pdf'],
  ])('stripPdfExtension(%j) -> %j', (input, expected) => {
    expect(stripPdfExtension(input)).toBe(expected)
  })
})
