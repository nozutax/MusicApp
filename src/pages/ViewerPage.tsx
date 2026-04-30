import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { RenderTask } from 'pdfjs-dist/types/src/display/api'
import { homePath } from '../app/paths'
import { getPdfBytes, getScoreMeta, putScore, type ScoreMeta } from '../lib/db'
import {
  createPdfLoadingTask,
  startRenderPageToCanvas,
  type PdfLoadingTask,
} from '../lib/pdf'

export function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>()

  const [meta, setMeta] = useState<ScoreMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const requestSeqRef = useRef(0)
  const loadingTaskRef = useRef<{ id: number; task: PdfLoadingTask } | null>(
    null,
  )
  const renderTaskRef = useRef<{ id: number; task: RenderTask } | null>(null)

  useEffect(() => {
    if (!scoreId) return

    const requestId = ++requestSeqRef.current

    // Cancel any previous work (avoids stale updates & leaks).
    if (renderTaskRef.current) {
      renderTaskRef.current.task.cancel()
      renderTaskRef.current = null
    }
    if (loadingTaskRef.current) {
      loadingTaskRef.current.task.destroy()
      loadingTaskRef.current = null
    }

    let didCleanup = false
    const isStale = () => didCleanup || requestId !== requestSeqRef.current

    ;(async () => {
      setIsLoading(true)
      setError(null)

      const [loadedMeta, pdfBytes] = await Promise.all([
        getScoreMeta(scoreId),
        getPdfBytes(scoreId),
      ])

      if (isStale()) return

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

      const loadingTask = createPdfLoadingTask(pdfBytes)
      loadingTaskRef.current = { id: requestId, task: loadingTask }

      const pdf = await loadingTask.promise
      if (isStale()) return

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
        if (isStale()) return
        setMeta(nextMeta)
      }

      const canvas = canvasRef.current
      if (canvas) {
        const { renderTask } = await startRenderPageToCanvas({
          pdf,
          pageIndex: 0,
          canvas,
          scale: 1.5,
        })
        renderTaskRef.current = { id: requestId, task: renderTask }
        await renderTask.promise
      }
    })()
      .catch((e) => {
        if (isStale()) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (isStale()) return
        setIsLoading(false)
      })

    return () => {
      didCleanup = true

      const currentRender = renderTaskRef.current
      if (currentRender?.id === requestId) {
        currentRender.task.cancel()
        renderTaskRef.current = null
      }

      const currentLoading = loadingTaskRef.current
      if (currentLoading?.id === requestId) {
        currentLoading.task.destroy()
        loadingTaskRef.current = null
      }
    }
  }, [scoreId])

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

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <p>
        <strong>File:</strong> {meta?.filename ?? '?'}
      </p>
      <p>
        <strong>Pages:</strong> {meta ? meta.pageCount : '?'}
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
