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
    <div className="file-import">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
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
        type="button"
        className="btn btn--primary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? '取り込み中…' : '＋ PDF'}
      </button>

      {error ? (
        <div role="alert" className="file-import__error">
          {error}
        </div>
      ) : null}
    </div>
  )
}
