type Props = {
  tool: 'pen' | 'eraser'
  onToolChange: (tool: 'pen' | 'eraser') => void
  color: 'black' | 'red' | 'blue'
  onColorChange: (color: 'black' | 'red' | 'blue') => void
  width: 1 | 2 | 3
  onWidthChange: (width: 1 | 2 | 3) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function AnnotationToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  width,
  onWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 12, opacity: 0.8 }}>ツール</span>
      <button
        type="button"
        aria-pressed={tool === 'pen'}
        onClick={() => onToolChange('pen')}
        style={{ fontWeight: tool === 'pen' ? 700 : 400 }}
      >
        ペン
      </button>
      <button
        type="button"
        aria-pressed={tool === 'eraser'}
        onClick={() => onToolChange('eraser')}
        style={{ fontWeight: tool === 'eraser' ? 700 : 400 }}
      >
        消しゴム
      </button>

      <span style={{ width: 8 }} />

      <span style={{ fontSize: 12, opacity: 0.8 }}>色</span>
      {(
        [
          ['black', '黒'],
          ['red', '赤'],
          ['blue', '青'],
        ] as const
      ).map(([c, label]) => (
        <button
          key={c}
          type="button"
          aria-pressed={color === c}
          disabled={tool === 'eraser'}
          onClick={() => onColorChange(c)}
          style={{ fontWeight: color === c ? 700 : 400 }}
        >
          {label}
        </button>
      ))}

      <span style={{ width: 8 }} />

      <span style={{ fontSize: 12, opacity: 0.8 }}>太さ</span>
      {([1, 2, 3] as const).map((w) => (
        <button
          key={w}
          type="button"
          aria-pressed={width === w}
          disabled={tool === 'eraser'}
          onClick={() => onWidthChange(w)}
          style={{ fontWeight: width === w ? 700 : 400 }}
        >
          {w === 1 ? '細' : w === 2 ? '中' : '太'}
        </button>
      ))}

      <span style={{ width: 8 }} />

      <button type="button" disabled={!canUndo} onClick={onUndo}>
        元に戻す
      </button>
      <button type="button" disabled={!canRedo} onClick={onRedo}>
        やり直す
      </button>
    </div>
  )
}
