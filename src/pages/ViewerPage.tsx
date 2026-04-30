import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { homePath } from '../app/paths'
import { getPdfBytes, getScoreMeta, putScore, type ScoreMeta } from '../lib/db'
import { loadPdf, renderPageToCanvas } from '../lib/pdf'

export function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>()

  const [meta, setMeta] = useState<ScoreMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mountedRef = useRef(false)

  const load = useCallback(async () => {
    if (!scoreId) return

    try {
      setIsLoading(true)
      setError(null)

      const [loadedMeta, pdfBytes] = await Promise.all([
        getScoreMeta(scoreId),
        getPdfBytes(scoreId),
      ])

      if (!mountedRef.current) return

      if (!loadedMeta) {
        setMeta(null)
        setError('Missing score meta.')
        return
      }

      setMeta(loadedMeta)

      if (!pdfBytes) {
        setError('Missing pdf bytes.')
        return
      }

      const pdf = await loadPdf(pdfBytes)
      if (!mountedRef.current) return

      const nextMeta =
        loadedMeta.pageCount !== pdf.numPages
          ? ({
              ...loadedMeta,
              pageCount: pdf.numPages,
              updatedAt: Date.now(),
            } satisfies ScoreMeta)
          : loadedMeta

      if (nextMeta !== loadedMeta) {
        await putScore(nextMeta)
        if (!mountedRef.current) return
        setMeta(nextMeta)
      }

      const canvas = canvasRef.current
      if (canvas) {
        await renderPageToCanvas({
          pdf,
          pageIndex: 0,
          canvas,
          scale: 1.5,
        })
      }
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [scoreId])

  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    return () => {
      mountedRef.current = false
    }
  }, [load])

  if (!scoreId) {
    return (
      <div>
        <h2>Viewer</h2>
        <p>Missing score id.</p>
        <p>
          <Link to={homePath()}>Back to Home</Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2>Viewer</h2>

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <p>
        <strong>File:</strong> {meta?.filename ?? '—'}
      </p>
      <p>
        <strong>Pages:</strong> {meta ? meta.pageCount : '—'}
      </p>

      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', border: '1px solid #ddd' }}
      />

      <p>
        <Link to={homePath()}>Back to Home</Link>
      </p>
    </div>
  )
}


