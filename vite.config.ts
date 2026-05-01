import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

/**
 * GitHub Pages（プロジェクトサイト）は `https://<user>.github.io/<repo>/` のため
 * リリース時は `BASE_PATH=/<repo名>/` を付けてビルドする。
 * ローカルは未指定で `/`。
 */
function viteBaseFromEnv(): string {
  const raw = process.env.BASE_PATH?.trim()
  if (!raw || raw === '/') return '/'
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

const base = viteBaseFromEnv()

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/wasm/*',
          dest: 'pdfjs/wasm',
          rename: { stripBase: true },
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Score Shelf',
        short_name: 'ScoreShelf',
        description: '画譜PDFの閲覧と手書きメモ（オフライン）',
        lang: 'ja',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0b0f19',
        theme_color: '#0b0f19',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Include .mjs so pdf.js worker is precached (PWA / offline).
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,mjs,wasm}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
