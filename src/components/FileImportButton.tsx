import { useRef, useState } from 'react'
import { putPdfBytes, putScore } from '../lib/db'

type Props = {
  onImported?: () => void | Promise<void>
}

export function FileImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          // Allow selecting the same file again.
          e.currentTarget.value = ''
          if (!file) return

          void (async () => {
            setBusy(true)
            try {
              const id = crypto.randomUUID()
              const bytes = await file.arrayBuffer()

              await putPdfBytes(id, bytes)
              const now = Date.now()
              await putScore({
                id,
                filename: file.name,
                createdAt: now,
                updatedAt: now,
                pageCount: 0,
              })

              await onImported?.()
            } catch (err) {
              // Minimal UX: log and stay on page.
              console.error(err)
            } finally {
              setBusy(false)
            }
          })()
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        PDF追加
      </button>
    </>
  )
}