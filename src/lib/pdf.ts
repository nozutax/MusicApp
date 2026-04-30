import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
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

export type PdfLoadingTask = ReturnType<typeof getDocument>

export function createPdfLoadingTask(pdfBytes: ArrayBuffer): PdfLoadingTask {
  ensureWorker()
  return getDocument({ data: pdfBytes })
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
}): Promise<{ viewportW: number; viewportH: number; renderTask: RenderTask }> {
  const { pdf, pageIndex, canvas, scale } = opts

  const pageNumber = pageIndex + 1
  const page = await pdf.getPage(pageNumber)

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
    renderTask,
  }
}

