import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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
import { classifyHorizontalSwipe, classifyTapZone } from '../lib/gesture'
import {
  createPdfLoadingTask,
  startRenderPageToCanvas,
  type PdfLoadingTask,
} from '../lib/pdf'

const SWIPE = { minDx: 120, maxDy: 60 }
/** タップとみなす最大移動量（px）。仕様例: 10 */
const TAP_MOVE_MAX = 10
/** Eraser radius in **screen/CSS pixels**; mapped to reference coords via layout. */
const ERASER_RADIUS_PX = 14

type PageLayout = {
  dispW: number
  dispH: number
  refW: number
  refH: number
  pageIndex: number
}

/** 演奏時はPDF最大化・UI最小、メモ時はツールバーと情報を表示 */
export type ViewerUiMode = 'perform' | 'annotate'

export function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>()

  const [viewerUiMode, setViewerUiMode] = useState<ViewerUiMode>('perform')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })

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

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setStageSize({
        w: Math.max(0, Math.floor(cr.width)),
        h: Math.max(0, Math.floor(cr.height)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewerUiMode, scoreId])

  useEffect(() => {
    if (viewerUiMode !== 'perform') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [viewerUiMode])

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

      const page = await pdf.getPage(safeIndex + 1)
      const refViewport = page.getViewport({ scale: 1 })
      const pad = 0.992
      let scale = 1.5
      const sw = stageSize.w
      const sh = stageSize.h
      if (sw > 24 && sh > 24) {
        scale =
          Math.min(sw / refViewport.width, sh / refViewport.height) * pad
      }

      const { renderTask, refViewportW, refViewportH } =
        await startRenderPageToCanvas({
          pdf,
          pageIndex: safeIndex,
          canvas,
          scale,
          page,
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

      if (isStale()) return

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
  }, [
    scoreId,
    pageIndex,
    pdfToken,
    syncHistoryUi,
    viewerUiMode,
    stageSize,
  ])

  const onTouchPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    if (
      penPointerIdRef.current !== null ||
      eraserPointerIdRef.current !== null
    ) {
      return
    }
    touchStartRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const applyTouchPageNav = (dir: 'prev' | 'next') => {
    const total =
      meta?.pageCount ?? pdfRef.current?.numPages ?? 0
    if (total <= 0) return
    const maxPage = total - 1

    if (dir === 'next') {
      setPageIndex((p) => {
        const clamped = Math.min(Math.max(0, p), maxPage)
        return Math.min(clamped + 1, maxPage)
      })
    } else {
      setPageIndex((p) => {
        const clamped = Math.min(Math.max(0, p), maxPage)
        return Math.max(clamped - 1, 0)
      })
    }
  }

  const onTouchPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    if (
      penPointerIdRef.current !== null ||
      eraserPointerIdRef.current !== null
    ) {
      return
    }

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    let dir = classifyHorizontalSwipe({ dx, dy }, SWIPE)

    if (dir === 'none') {
      if (
        Math.abs(dx) <= TAP_MOVE_MAX &&
        Math.abs(dy) <= TAP_MOVE_MAX
      ) {
        const pdfEl = pdfCanvasRef.current
        if (pdfEl) {
          const rect = pdfEl.getBoundingClientRect()
          if (rect.width > 0) {
            const x = e.clientX - rect.left
            dir = classifyTapZone(x, rect.width, 0.3)
          }
        }
      }
    }

    if (dir === 'next' || dir === 'prev') {
      applyTouchPageNav(dir)
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

  const pdfBorder =
    viewerUiMode === 'annotate' ? '1px solid #ddd' : 'none'
  const annoPointerEvents =
    viewerUiMode === 'annotate' ? ('auto' as const) : ('none' as const)

  const scoreCanvasBlock = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        width: 'fit-content',
        maxWidth: '100%',
        maxHeight: '100%',
        lineHeight: 0,
      }}
    >
      <canvas
        ref={pdfCanvasRef}
        style={{
          gridColumn: 1,
          gridRow: 1,
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          height: 'auto',
          border: pdfBorder,
        }}
      />
      <canvas
        ref={annoCanvasRef}
        onPointerDown={onAnnotPointerDown}
        onPointerMove={onAnnotPointerMove}
        onPointerUp={onAnnotPointerUp}
        onPointerCancel={onAnnotPointerUp}
        style={{
          gridColumn: 1,
          gridRow: 1,
          zIndex: 1,
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          height: 'auto',
          pointerEvents: annoPointerEvents,
          touchAction: 'none',
        }}
      />
    </div>
  )

  if (viewerUiMode === 'perform') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: '#f4f4f5',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isLoading ? (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 56,
              fontSize: 13,
              color: '#666',
              zIndex: 2,
            }}
          >
            読み込み中…
          </div>
        ) : null}
        {error ? (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 56,
              right: 14,
              color: 'crimson',
              fontSize: 14,
              zIndex: 2,
            }}
          >
            {error}
          </div>
        ) : null}
        <Link
          to={homePath()}
          aria-label="一覧に戻る"
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 3,
            fontSize: 12,
            color: '#2c5282',
            textDecoration: 'none',
            padding: '4px 6px',
            borderRadius: 4,
          }}
        >
          一覧
        </Link>
        <div
          ref={stageRef}
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            position: 'relative',
          }}
          onPointerDown={onTouchPointerDown}
          onPointerUp={onTouchPointerUp}
          onPointerCancel={onTouchPointerCancel}
        >
          {scoreCanvasBlock}
        </div>
        <button
          type="button"
          onClick={() => setViewerUiMode('annotate')}
          aria-label="手書きモードへ切り替え"
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14,
            zIndex: 3,
            padding: '9px 14px',
            borderRadius: 999,
            border: '1px solid #c9c9cf',
            background: 'rgba(255,255,255,0.94)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          メモ
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          rowGap: 6,
          marginBottom: 4,
        }}
      >
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#888',
              fontVariantNumeric: 'tabular-nums',
            }}
            title="ページ"
          >
            {pageLabel}
          </span>
          <button
            type="button"
            onClick={() => setViewerUiMode('perform')}
            aria-label="演奏表示（最大化）"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #c5c5cc',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            演奏
          </button>
          <Link
            to={homePath()}
            style={{
              fontSize: 12,
              color: '#2c5282',
              textDecoration: 'none',
              padding: '4px 6px',
              borderRadius: 4,
            }}
          >
            一覧
          </Link>
        </div>
      </div>

      {isLoading || error ? (
        <div
          style={{
            fontSize: 11,
            color: error ? 'crimson' : '#777',
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          {isLoading ? '読み込み…' : error}
        </div>
      ) : null}

      <div
        ref={stageRef}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          position: 'relative',
        }}
        onPointerDown={onTouchPointerDown}
        onPointerUp={onTouchPointerUp}
        onPointerCancel={onTouchPointerCancel}
      >
        {scoreCanvasBlock}
      </div>
    </div>
  )
}
