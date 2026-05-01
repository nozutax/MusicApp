import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist/types/src/display/api'

// Vite: bundle worker as an asset URL.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let workerInitialized = false

function ensureWorker() {
  if (workerInitialized) return
  GlobalWorkerOptions.workerSrc = workerSrc
  workerInitialized = true
}

/** Trailing slash required by pdf.js. Used for JPX / JBIG2 / ICC in image-heavy PDFs. */
function wasmUrlForPdfJs(): string {
  const base = import.meta.env.BASE_URL
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}pdfjs/wasm/`
}

export type PdfLoadingTask = ReturnType<typeof getDocument>

export function createPdfLoadingTask(pdfBytes: ArrayBuffer): PdfLoadingTask {
  ensureWorker()
  // Uint8Array is the most reliable input shape for pdf.js across environments.
  return getDocument({
    data: new Uint8Array(pdfBytes),
    wasmUrl: wasmUrlForPdfJs(),
  })
}

export async function loadPdf(pdfBytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const task = createPdfLoadingTask(pdfBytes)
  return await task.promise
}

export async function startRenderPageToCanvas(opts: {
  pdf: PDFDocumentProxy
  pageIndex: number
  canvas: HTMLCanvasElement
  scale: number
  /** When set, skips an extra getPage (callers can compute scale from ref viewport first). */
  page?: PDFPageProxy
}): Promise<{
  viewportW: number
  viewportH: number
  refViewportW: number
  refViewportH: number
  renderTask: RenderTask
}> {
  const { pdf, pageIndex, canvas, scale, page: pageIn } = opts

  const pageNumber = pageIndex + 1
  const page = pageIn ?? (await pdf.getPage(pageNumber))

  const refViewport = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale })

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2d context')
  }

  const renderTask = page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0])

  return {
    viewportW: viewport.width,
    viewportH: viewport.height,
    refViewportW: refViewport.width,
    refViewportH: refViewport.height,
    renderTask,
  }
}

