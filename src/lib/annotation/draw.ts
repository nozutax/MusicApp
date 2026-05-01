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

/** 線幅（細・中・太）を PDF 参照座標系での太さに変換する。 */
export function widthToRef(w: Stroke['width']): number {
  switch (w) {
    case 3:
      return 400
    case 2:
      return 200
    default:
      return 100
  }
}

/** 参照座標の線幅をキャンバス CSS ピクセルに変換（縦横比が違うときは等方性のため min スケールを使用）。 */
export function refStrokeWidthToCanvasPx(
  widthRef: number,
  ref: { w: number; h: number },
  disp: { w: number; h: number },
): number {
  if (ref.w <= 0 || ref.h <= 0 || disp.w <= 0 || disp.h <= 0) return 1
  const s = Math.min(disp.w / ref.w, disp.h / ref.h)
  return widthRef * s
}
