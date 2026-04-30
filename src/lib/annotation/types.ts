/** Page space: same units as PDF.js viewport at the reference scale (see design spec). */
export type Pt = { x: number; y: number }

export type Size = { w: number; h: number }

/** Normalized to reference viewport (0–1 in each axis). */
export type NormPt = { nx: number; ny: number }
