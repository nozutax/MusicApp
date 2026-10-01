import type { Stroke } from '../db'

export function strokeToCssColor(c: Stroke['color']): string {
  switch (c) {
    case 'red':
      return '#d22'
    case 'blue':
      return '#2563eb'
    case 'yellow':
      // Marker: ~80% transparent (alpha 0.2)
      return 'rgba(230, 194, 0, 0.2)'
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
