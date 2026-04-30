import { useRef, useState } from 'react'
import { putImportedScore } from '../lib/db'

type Props = {
  onImported?: () => void | Promise<void>
}

export function FileImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        accept='application/pdf'
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          // Allow selecting the same file again.
          e.currentTarget.value = ''
          if (!file) return

          void (async () => {
            setBusy(true)
            setError(null)
            try {
              const id = crypto.randomUUID()
              const pdfBytes = await file.arrayBuffer()
              const now = Date.now()

              await putImportedScore(
                {
                  id,
                  filename: file.name,
                  createdAt: now,
                  updatedAt: now,
                  pageCount: 0,
                },
                pdfBytes,
              )

              await onImported?.()
            } catch (err) {
              console.error(err)
              setError('取り込みに失敗しました')
            } finally {
              setBusy(false)
            }
          })()
        }}
      />

      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? '取り込み中…' : 'PDF取り込み'}
      </button>

      {error ? (
        <div role='alert' style={{ marginTop: 8, color: 'crimson' }}>
          {error}
        </div>
      ) : null}
    </>
  )
}
