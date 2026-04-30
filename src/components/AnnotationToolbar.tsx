type Props = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function AnnotationToolbar({
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
      <button type="button" disabled={!canUndo} onClick={onUndo}>
        元に戻す
      </button>
      <button type="button" disabled={!canRedo} onClick={onRedo}>
        やり直す
      </button>
    </div>
  )
}
