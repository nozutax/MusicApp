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

/** 線幅（細・中・太）を注釈キャンバスの画像ピクセル（bitmap 座標）に変換する。 */
export function widthToCanvasPx(w: Stroke['width']): number {
  switch (w) {
    case 3:
      return 4
    case 2:
      return 2
    default:
      return 1
  }
}
