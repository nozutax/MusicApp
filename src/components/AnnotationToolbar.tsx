import type { CSSProperties } from 'react'

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

const btnBase: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: 12,
  lineHeight: 1.2,
  borderRadius: 6,
  border: '1px solid #c5c5cc',
  background: '#fff',
  cursor: 'pointer',
}

const pressed: CSSProperties = {
  borderColor: '#6b6b78',
  background: '#eef0f4',
  fontWeight: 600,
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
      role="toolbar"
      aria-label="注釈ツール"
      style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        aria-pressed={tool === 'pen'}
        aria-label="ペン"
        title="ペン"
        onClick={() => onToolChange('pen')}
        style={{ ...btnBase, ...(tool === 'pen' ? pressed : {}) }}
      >
        ペン
      </button>
      <button
        type="button"
        aria-pressed={tool === 'eraser'}
        aria-label="消しゴム"
        title="消しゴム"
        onClick={() => onToolChange('eraser')}
        style={{ ...btnBase, ...(tool === 'eraser' ? pressed : {}) }}
      >
        消
      </button>

      <span
        style={{
          width: 1,
          alignSelf: 'stretch',
          margin: '2px 2px',
          background: '#ddd',
        }}
        aria-hidden
      />

      {(
        [
          ['black', '#1a1a1e'],
          ['red', '#c41e1e'],
          ['blue', '#1e5bc4'],
        ] as const
      ).map(([c, dot]) => (
        <button
          key={c}
          type="button"
          aria-pressed={color === c}
          aria-label={c === 'black' ? '黒' : c === 'red' ? '赤' : '青'}
          title={c === 'black' ? '黒' : c === 'red' ? '赤' : '青'}
          disabled={tool === 'eraser'}
          onClick={() => onColorChange(c)}
          style={{
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 6,
            border:
              color === c ? '2px solid #333' : '1px solid #c5c5cc',
            background: '#fff',
            cursor: tool === 'eraser' ? 'default' : 'pointer',
            opacity: tool === 'eraser' ? 0.35 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: dot,
            }}
          />
        </button>
      ))}

      <span
        style={{
          width: 1,
          alignSelf: 'stretch',
          margin: '2px 2px',
          background: '#ddd',
        }}
        aria-hidden
      />

      {([1, 2, 3] as const).map((w) => (
        <button
          key={w}
          type="button"
          aria-pressed={width === w}
          aria-label={w === 1 ? '細い線' : w === 2 ? '中くらい' : '太い線'}
          title={w === 1 ? '細' : w === 2 ? '中' : '太'}
          disabled={tool === 'eraser'}
          onClick={() => onWidthChange(w)}
          style={{
            ...btnBase,
            minWidth: 28,
            padding: '3px 6px',
            ...(width === w ? pressed : {}),
            opacity: tool === 'eraser' ? 0.35 : 1,
          }}
        >
          {w === 1 ? '細' : w === 2 ? '中' : '太'}
        </button>
      ))}

      <span
        style={{
          width: 1,
          alignSelf: 'stretch',
          margin: '2px 2px',
          background: '#ddd',
        }}
        aria-hidden
      />

      <button
        type="button"
        aria-label="元に戻す"
        title="元に戻す"
        disabled={!canUndo}
        onClick={onUndo}
        style={{ ...btnBase, padding: '3px 10px', opacity: canUndo ? 1 : 0.4 }}
      >
        ↶
      </button>
      <button
        type="button"
        aria-label="やり直す"
        title="やり直す"
        disabled={!canRedo}
        onClick={onRedo}
        style={{ ...btnBase, padding: '3px 10px', opacity: canRedo ? 1 : 0.4 }}
      >
        ↷
      </button>
    </div>
  )
}
