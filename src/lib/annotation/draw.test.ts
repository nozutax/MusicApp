import { describe, expect, it } from 'vitest'
import { strokeToCssColor, widthToPx } from './draw'

describe('strokeToCssColor', () => {
  it('maps black/red/blue to opaque hex', () => {
    expect(strokeToCssColor('black')).toBe('#111')
    expect(strokeToCssColor('red')).toBe('#d22')
    expect(strokeToCssColor('blue')).toBe('#2563eb')
    expect(strokeToCssColor(undefined)).toBe('#111')
  })

  it('maps yellow to ~80% transparent rgba for marker use', () => {
    expect(strokeToCssColor('yellow')).toBe('rgba(230, 194, 0, 0.2)')
  })
})

describe('widthToPx', () => {
  it('maps 細/中/太 to 2/4/6 px', () => {
    expect(widthToPx(1)).toBe(2)
    expect(widthToPx(2)).toBe(4)
    expect(widthToPx(3)).toBe(6)
  })
})
