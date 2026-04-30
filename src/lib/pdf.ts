import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist'

// Vite: bundle worker as an asset URL.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let workerInitialized = false

function ensureWorker() {
  if (workerInitialized) return
  GlobalWorkerOptions.workerSrc = workerSrc
  workerInitialized = true
}

export async function loadPdf(pdfBytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  ensureWorker()
  const task = getDocument({ data: pdfBytes })
  return await task.promise
}

export async function renderPageToCanvas(opts: {
  pdf: PDFDocumentProxy
  pageIndex: number
  canvas: HTMLCanvasElement
  scale: number
}): Promise<{ viewportW: number; viewportH: number }> {
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

  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  return {
    viewportW: viewport.width,
    viewportH: viewport.height,
  }
}

