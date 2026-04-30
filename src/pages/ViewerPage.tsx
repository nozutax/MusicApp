import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist/types/src/display/api'
import { AnnotationToolbar } from '../components/AnnotationToolbar'
import { homePath } from '../app/paths'
import { canvasPointToRef, clientPointToCanvas } from '../lib/annotation/coords'
import { strokeHitByCircle } from '../lib/annotation/eraser'
import { paintAnnotationLayer } from '../lib/annotation/paint'
import { StrokeHistory } from '../lib/annotation/strokeHistory'
import {
  getPageAnnotations,
  getPdfBytes,
  getScoreMeta,
  putPageAnnotations,
  putScore,
  type ScoreMeta,
  type Stroke,
} from '../lib/db'
import { classifyHorizontalSwipe } from '../lib/gesture'
import {
  createPdfLoadingTask,
  startRenderPageToCanvas,
  type PdfLoadingTask,
} from '../lib/pdf'

const SWIPE = { minDx: 120, maxDy: 60 }
/** Eraser radius in **screen/CSS pixels**; mapped to reference coords via layout. */
const ERASER_RADIUS_PX = 14

type PageLayout = {
  dispW: number
  dispH: number
  refW: number
  refH: number
  pageIndex: number
}

export function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>()

  const [meta, setMeta] = useState<ScoreMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pdfToken, setPdfToken] = useState(0)
  const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false })

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [penColor, setPenColor] = useState<'black' | 'red' | 'blue'>('black')
  const [penWidth, setPenWidth] = useState<1 | 2 | 3>(2)

  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const annoCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const layoutRef = useRef<PageLayout | null>(null)
  const strokeHistoryRef = useRef<StrokeHistory | null>(null)
  const pageStrokesRef = useRef<Stroke[]>([])
  const activeStrokeRef = useRef<Stroke | null>(null)
  const penPointerIdRef = useRef<number | null>(null)
  const eraserPointerIdRef = useRef<number | null>(null)
  const eraserHitsRef = useRef<Set<number>>(new Set())

  const renderRequestSeqRef = useRef(0)
  const loadRequestSeqRef = useRef(0)
  const loadingTaskRef = useRef<{ id: number; task: PdfLoadingTask } | null>(
    null,
  )
  const renderTaskRef = useRef<{ id: number; task: RenderTask } | null>(null)

  function redrawAnnotationCanvas() {
    const layout = layoutRef.current
    const anno = annoCanvasRef.current
    if (!layout || !anno) return
    const ctx = anno.getContext('2d')
    if (!ctx) return
    paintAnnotationLayer(
      ctx,
      { w: layout.dispW, h: layout.dispH },
      { w: layout.refW, h: layout.refH },
      pageStrokesRef.current,
      activeStrokeRef.current,
    )
  }

  const syncHistoryUi = useCallback(() => {
    const h = strokeHistoryRef.current
    setHistoryUi({
      canUndo: h?.canUndo() ?? false,
      canRedo: h?.canRedo() ?? false,
    })
  }, [])

  const persistPageStrokes = useCallback(
    (strokes: Stroke[]) => {
      const layout = layoutRef.current
      if (!layout || !scoreId) return
      return putPageAnnotations({
        scoreId,
        page: layout.pageIndex,
        updatedAt: Date.now(),
        viewportW: layout.refW,
        viewportH: layout.refH,
        strokes,
      })
    },
    [scoreId],
  )

  const handleUndo = useCallback(() => {
    const h = strokeHistoryRef.current
    if (!h) return
    const prev = h.undo()
    if (!prev) return
    pageStrokesRef.current = prev
    void persistPageStrokes(prev)
    redrawAnnotationCanvas()
    syncHistoryUi()
  }, [persistPageStrokes, syncHistoryUi])

  const handleRedo = useCallback(() => {
    const h = strokeHistoryRef.current
    if (!h) return
    const next = h.redo()
    if (!next) return
    pageStrokesRef.current = next
    void persistPageStrokes(next)
    redrawAnnotationCanvas()
    syncHistoryUi()
  }, [persistPageStrokes, syncHistoryUi])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable)
        return

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else {
          e.preventDefault()
          handleUndo()
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleRedo, handleUndo])

  useEffect(() => {
    if (!scoreId) return

    const requestId = ++loadRequestSeqRef.current

    if (loadingTaskRef.current) {
      loadingTaskRef.current.task.destroy()
      loadingTaskRef.current = null
    }
    pdfRef.current = null
    layoutRef.current = null
    pageStrokesRef.current = []
    strokeHistoryRef.current = null

    let didCleanup = false
    const isStale = () =>
      didCleanup || requestId !== loadRequestSeqRef.current

    void (async () => {
      setIsLoading(true)
      setError(null)
      setPageIndex(0)

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

      pdfRef.current = pdf

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

      setPdfToken((t) => t + 1)
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
      const currentLoading = loadingTaskRef.current
      if (currentLoading?.id === requestId) {
        currentLoading.task.destroy()
        loadingTaskRef.current = null
      }
    }
  }, [scoreId])

  useEffect(() => {
    if (!scoreId) return
    const pdf = pdfRef.current
    if (!pdf) return

    const requestId = ++renderRequestSeqRef.current

    if (renderTaskRef.current) {
      renderTaskRef.current.task.cancel()
      renderTaskRef.current = null
    }

    let didCleanup = false
    const isStale = () =>
      didCleanup || requestId !== renderRequestSeqRef.current

    void (async () => {
      const canvas = pdfCanvasRef.current
      if (!canvas) return

      const numPages = pdf.numPages
      const safeIndex = Math.min(
        Math.max(0, pageIndex),
        Math.max(0, numPages - 1),
      )

      const { renderTask, refViewportW, refViewportH } =
        await startRenderPageToCanvas({
          pdf,
          pageIndex: safeIndex,
          canvas,
          scale: 1.5,
        })
      renderTaskRef.current = { id: requestId, task: renderTask }
      if (isStale()) {
        renderTask.cancel()
        return
      }
      await renderTask.promise
      if (isStale()) return

      const anno = annoCanvasRef.current
      if (!anno) return

      const dispW = canvas.width
      const dispH = canvas.height

      anno.width = dispW
      anno.height = dispH

      layoutRef.current = {
        dispW,
        dispH,
        refW: refViewportW,
        refH: refViewportH,
        pageIndex: safeIndex,
      }

      const rec = await getPageAnnotations(scoreId, safeIndex)
      if (isStale()) return

      const strokes = rec?.strokes ?? []
      pageStrokesRef.current = strokes

      if (!strokeHistoryRef.current) {
        strokeHistoryRef.current = new StrokeHistory()
      }
      strokeHistoryRef.current.reset(strokes)
      if (isStale()) return
      syncHistoryUi()

      const actx = anno.getContext('2d')
      if (actx) {
        paintAnnotationLayer(
          actx,
          { w: dispW, h: dispH },
          { w: refViewportW, h: refViewportH },
          strokes,
          null,
        )
      }
    })().catch((e) => {
      if (isStale()) return
      setError(e instanceof Error ? e.message : String(e))
    })

    return () => {
      didCleanup = true
      const currentRender = renderTaskRef.current
      if (currentRender?.id === requestId) {
        currentRender.task.cancel()
        renderTaskRef.current = null
      }
    }
  }, [scoreId, pageIndex, pdfToken, syncHistoryUi])

  const onTouchPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    touchStartRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onTouchPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dir = classifyHorizontalSwipe({ dx, dy }, SWIPE)

    const total =
      meta?.pageCount ?? pdfRef.current?.numPages ?? 0
    if (total <= 0) return
    const maxPage = total - 1

    if (dir === 'next') {
      setPageIndex((p) => {
        const clamped = Math.min(Math.max(0, p), maxPage)
        return Math.min(clamped + 1, maxPage)
      })
    } else if (dir === 'prev') {
      setPageIndex((p) => {
        const clamped = Math.min(Math.max(0, p), maxPage)
        return Math.max(clamped - 1, 0)
      })
    }
  }

  const onTouchPointerCancel = () => {
    touchStartRef.current = null
  }

  const onAnnotPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'pen') return
    const layout = layoutRef.current
    const anno = annoCanvasRef.current
    if (!layout || !anno || !scoreId) return

    e.preventDefault()
    try {
      anno.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    if (tool === 'eraser') {
      activeStrokeRef.current = null
      penPointerIdRef.current = null
      eraserPointerIdRef.current = e.pointerId
      eraserHitsRef.current = new Set()

      const { x: cx, y: cy } = clientPointToCanvas(e.clientX, e.clientY, anno)
      const { x: rx, y: ry } = canvasPointToRef(
        cx,
        cy,
        { w: layout.dispW, h: layout.dispH },
        { w: layout.refW, h: layout.refH },
      )
      const rRef =
        ERASER_RADIUS_PX * (layout.refW / layout.dispW)
      const strokes = pageStrokesRef.current
      for (let i = 0; i < strokes.length; i++) {
        if (strokeHitByCircle(strokes[i], rx, ry, rRef)) {
          eraserHitsRef.current.add(i)
        }
      }
      return
    }

    eraserPointerIdRef.current = null
    penPointerIdRef.current = e.pointerId

    const { x: cx, y: cy } = clientPointToCanvas(e.clientX, e.clientY, anno)
    const { x: rx, y: ry } = canvasPointToRef(
      cx,
      cy,
      { w: layout.dispW, h: layout.dispH },
      { w: layout.refW, h: layout.refH },
    )

    activeStrokeRef.current = {
      tool: 'pen',
      color: penColor,
      width: penWidth,
      points: [{ x: rx, y: ry, t: performance.now() }],
    }
    redrawAnnotationCanvas()
  }

  const onAnnotPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'pen') return
    const layout = layoutRef.current
    const anno = annoCanvasRef.current
    if (!layout || !anno) return

    if (tool === 'eraser' && eraserPointerIdRef.current === e.pointerId) {
      const { x: cx, y: cy } = clientPointToCanvas(e.clientX, e.clientY, anno)
      const { x: rx, y: ry } = canvasPointToRef(
        cx,
        cy,
        { w: layout.dispW, h: layout.dispH },
        { w: layout.refW, h: layout.refH },
      )
      const rRef =
        ERASER_RADIUS_PX * (layout.refW / layout.dispW)
      const strokes = pageStrokesRef.current
      for (let i = 0; i < strokes.length; i++) {
        if (strokeHitByCircle(strokes[i], rx, ry, rRef)) {
          eraserHitsRef.current.add(i)
        }
      }
      return
    }

    if (penPointerIdRef.current !== e.pointerId) return
    const active = activeStrokeRef.current
    if (!active) return

    const { x: cx, y: cy } = clientPointToCanvas(e.clientX, e.clientY, anno)
    const { x: rx, y: ry } = canvasPointToRef(
      cx,
      cy,
      { w: layout.dispW, h: layout.dispH },
      { w: layout.refW, h: layout.refH },
    )
    active.points.push({ x: rx, y: ry, t: performance.now() })
    redrawAnnotationCanvas()
  }

  const onAnnotPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'pen') return

    const anno = annoCanvasRef.current
    const layout = layoutRef.current

    if (anno) {
      try {
        anno.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    if (
      tool === 'eraser' &&
      eraserPointerIdRef.current === e.pointerId
    ) {
      eraserPointerIdRef.current = null
      const hits = eraserHitsRef.current
      eraserHitsRef.current = new Set()

      if (!layout || !scoreId || hits.size === 0) {
        return
      }

      const next = pageStrokesRef.current.filter((_, i) => !hits.has(i))
      if (next.length === pageStrokesRef.current.length) {
        return
      }

      pageStrokesRef.current = next
      strokeHistoryRef.current?.commit(next)
      void persistPageStrokes(next)
      redrawAnnotationCanvas()
      syncHistoryUi()
      return
    }

    if (penPointerIdRef.current !== e.pointerId) return
    penPointerIdRef.current = null

    const active = activeStrokeRef.current
    activeStrokeRef.current = null

    if (!active || active.points.length === 0 || !layout || !scoreId) {
      redrawAnnotationCanvas()
      return
    }

    const next = [...pageStrokesRef.current, active]
    pageStrokesRef.current = next
    strokeHistoryRef.current?.commit(next)

    void persistPageStrokes(next)

    redrawAnnotationCanvas()
    syncHistoryUi()
  }

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

  const pageLabel =
    meta && meta.pageCount > 0
      ? `${Math.min(pageIndex, meta.pageCount - 1) + 1} / ${meta.pageCount}`
      : '?'

  return (
    <div>
      <h2>閲覧</h2>

      {isLoading ? <p>読み込み中…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <p>
        <strong>ファイル:</strong> {meta?.filename ?? '?'}
      </p>
      <p>
        <strong>ページ:</strong> {pageLabel}
      </p>

      <AnnotationToolbar
        tool={tool}
        onToolChange={setTool}
        color={penColor}
        onColorChange={setPenColor}
        width={penWidth}
        onWidthChange={setPenWidth}
        canUndo={historyUi.canUndo}
        canRedo={historyUi.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <div
        style={{ touchAction: 'none' }}
        onPointerDown={onTouchPointerDown}
        onPointerUp={onTouchPointerUp}
        onPointerCancel={onTouchPointerCancel}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            lineHeight: 0,
          }}
        >
          <canvas
            ref={pdfCanvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              border: '1px solid #ddd',
            }}
          />
          <canvas
            ref={annoCanvasRef}
            onPointerDown={onAnnotPointerDown}
            onPointerMove={onAnnotPointerMove}
            onPointerUp={onAnnotPointerUp}
            onPointerCancel={onAnnotPointerUp}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      <p>
        <Link to={homePath()}>一覧へ戻る</Link>
      </p>
    </div>
  )
}
