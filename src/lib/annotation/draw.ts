import type { Stroke } from '../db'

export function strokeToCssColor(c: Stroke['color']): string {
  switch (c) {
    case 'red':
      return '#d22'
    case 'blue':
      return '#2563eb'
    default:
      return '#111'
  }
}

export function widthToPx(w: Stroke['width']): number {
  switch (w) {
    case 3:
      return 6
    case 2:
      return 4
    default:
      return 2
  }
}
