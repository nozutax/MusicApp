export function clientPointToCanvas(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const sx = canvas.width / rect.width
  const sy = canvas.height / rect.height
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  }
}

export function canvasPointToRef(
  x: number,
  y: number,
  disp: { w: number; h: number },
  ref: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: (x / disp.w) * ref.w,
    y: (y / disp.h) * ref.h,
  }
}

export function refPointToCanvas(
  x: number,
  y: number,
  ref: { w: number; h: number },
  disp: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: (x / ref.w) * disp.w,
    y: (y / ref.h) * disp.h,
  }
}
