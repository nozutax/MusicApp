# Score PDF Annotator (Offline PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WindowsタブレットのEdgeで、画譜PDFを端末内に保存・管理し、1ページ表示＋横スワイプでページめくり、ペンで注釈（黒/赤/青・太さ3段階・消しゴム・Undo/Redo）をオフラインで使えるPWAを作る。

**Architecture:** Vite + React + TypeScript のSPAをPWA化し、PDF.jsでページをレンダリング。PDF本体と注釈（ストローク）をIndexedDBへ永続化。閲覧画面ではPDF描画Canvasの上に注釈Canvasを重ね、Pointer Eventsでペン描画、タッチでスワイプ判定。

**Tech Stack:** React, Vite, TypeScript, `pdfjs-dist`, IndexedDB（`idb`）, PWA（`vite-plugin-pwa`）, ルーティング（`react-router-dom`）, テスト（Vitest + Testing Library、Playwrightは任意）

---

## File Structure（作成/変更予定）

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/routes.tsx`
- Create: `src/app/styles.css`
- Create: `src/lib/db.ts`（IndexedDBのスキーマ/CRUD）
- Create: `src/lib/pdf.ts`（PDF.js 初期化とページレンダリング）
- Create: `src/lib/gesture.ts`（横スワイプ判定）
- Create: `src/lib/annotation/types.ts`
- Create: `src/lib/annotation/normalize.ts`（座標正規化/変換）
- Create: `src/lib/annotation/draw.ts`（描画）
- Create: `src/lib/annotation/eraser.ts`（ストローク単位削除判定）
- Create: `src/lib/annotation/history.ts`（Undo/Redo）
- Create: `src/pages/HomePage.tsx`（管理画面）
- Create: `src/pages/ViewerPage.tsx`（閲覧＋注釈）
- Create: `src/components/Toolbar.tsx`（色/太さ/ツール/Undo/Redo）
- Create: `src/components/ScoreList.tsx`
- Create: `src/components/FileImportButton.tsx`
- Create: `src/components/PageChrome.tsx`（戻る/ファイル名/ページ表示）
- Create: `public/icons/icon-192.png`（後で生成でも可）
- Create: `public/icons/icon-512.png`
- Create: `public/manifest.webmanifest`（PWAマニフェスト）
- Create: `src/sw.ts`（生成に任せる場合は不要。vite-plugin-pwa方針に合わせる）

Tests:
- Create: `src/lib/gesture.test.ts`
- Create: `src/lib/annotation/history.test.ts`
- Create: `src/lib/annotation/normalize.test.ts`
- Create: `src/lib/annotation/eraser.test.ts`

---

### Task 1: Scaffold（Vite + React + TS）と最低限の起動

**Files:**
- Create: `package.json`（Vite scaffoldingで生成）
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/styles.css`

- [ ] **Step 1: プロジェクトを作成**

Run:

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Expected: `src/` と `vite.config.ts` が生成され、`npm run dev` が実行可能。

- [ ] **Step 2: 起動確認**

Run:

```bash
npm run dev
```

Expected: ブラウザでViteの開発画面が表示される。

- [ ] **Step 3: UIの最小骨格（タイトルのみ）**

Edit `src/app/App.tsx` を最小アプリ骨格に置き換える（スタイルも最小）。

```tsx
import "./styles.css";

export function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">Score Shelf</h1>
      </header>
      <main className="content">Loading…</main>
    </div>
  );
}
```

- [ ] **Step 4: テスト基盤追加**

Run:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add `vite` 設定 or `vitest` 設定（`package.json` に `test` スクリプト）。

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold vite react app"
```

---

### Task 2: ルーティング（Home / Viewer）とページ遷移

**Files:**
- Create: `src/app/routes.tsx`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/ViewerPage.tsx`

- [ ] **Step 1: 依存追加**

```bash
npm install react-router-dom
```

- [ ] **Step 2: ルート定義**

```tsx
// src/app/routes.tsx
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { ViewerPage } from "../pages/ViewerPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/viewer/:scoreId", element: <ViewerPage /> },
]);
```

- [ ] **Step 3: Routerを配線**

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

- [ ] **Step 4: ページ雛形**

```tsx
// src/pages/HomePage.tsx
export function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h2>ライブラリ</h2>
      <p>PDFを追加して曲を管理します。</p>
    </div>
  );
}
```

```tsx
// src/pages/ViewerPage.tsx
import { useParams } from "react-router-dom";

export function ViewerPage() {
  const { scoreId } = useParams();
  return (
    <div style={{ padding: 16 }}>
      <h2>Viewer</h2>
      <p>scoreId: {scoreId}</p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add home and viewer routes"
```

---

### Task 3: IndexedDB（PDF + 注釈）永続化レイヤ

**Files:**
- Create: `src/lib/db.ts`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: 依存追加**

```bash
npm install idb
```

- [ ] **Step 2: DBスキーマ定義**

```ts
// src/lib/db.ts
import { openDB, type DBSchema } from "idb";

export type ScoreId = string;

export type ScoreMeta = {
  id: ScoreId;
  filename: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
};

export type PdfRecord = {
  scoreId: ScoreId;
  pdfBytes: ArrayBuffer;
};

export type AnnotationPoint = { x: number; y: number; t: number };
export type Stroke = {
  tool: "pen" | "eraser";
  color?: "black" | "red" | "blue";
  width: 1 | 2 | 3;
  points: AnnotationPoint[];
};

export type PageAnnotationRecord = {
  scoreId: ScoreId;
  page: number;
  updatedAt: number;
  viewportW: number;
  viewportH: number;
  strokes: Stroke[];
};

interface ScoreDb extends DBSchema {
  scores: {
    key: ScoreId;
    value: ScoreMeta;
    indexes: { "by-updatedAt": number };
  };
  pdfs: {
    key: ScoreId;
    value: PdfRecord;
  };
  annotations: {
    key: [ScoreId, number];
    value: PageAnnotationRecord;
    indexes: { "by-scoreId": ScoreId };
  };
}

const DB_NAME = "score-shelf";
const DB_VERSION = 1;

export async function getDb() {
  return openDB<ScoreDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const scores = db.createObjectStore("scores", { keyPath: "id" });
      scores.createIndex("by-updatedAt", "updatedAt");
      const annotations = db.createObjectStore("annotations", {
        keyPath: ["scoreId", "page"],
      });
      annotations.createIndex("by-scoreId", "scoreId");
    },
  });
}

export async function listScores(): Promise<ScoreMeta[]> {
  const db = await getDb();
  return db.getAllFromIndex("scores", "by-updatedAt");
}

export async function putScore(meta: ScoreMeta) {
  const db = await getDb();
  await db.put("scores", meta);
}

export async function deleteScore(scoreId: ScoreId) {
  const db = await getDb();
  await db.delete("scores", scoreId);
  await db.delete("pdfs", scoreId);
  const keys = await db.getAllKeysFromIndex("annotations", "by-scoreId", scoreId);
  for (const k of keys) await db.delete("annotations", k);
}

export async function getScoreMeta(scoreId: ScoreId) {
  const db = await getDb();
  return db.get("scores", scoreId);
}

export async function getPdfBytes(scoreId: ScoreId) {
  const db = await getDb();
  const rec = await db.get("pdfs", scoreId);
  return rec?.pdfBytes;
}

export async function putPdfBytes(scoreId: ScoreId, pdfBytes: ArrayBuffer) {
  const db = await getDb();
  await db.put("pdfs", { scoreId, pdfBytes });
}

export async function getPageAnnotations(scoreId: ScoreId, page: number) {
  const db = await getDb();
  return db.get("annotations", [scoreId, page]);
}

export async function putPageAnnotations(rec: PageAnnotationRecord) {
  const db = await getDb();
  await db.put("annotations", rec);
}
```

- [ ] **Step 3: Homeで一覧表示（まだ空でOK）**

HomePageで `listScores()` を呼び出し、ファイル名のリストだけ表示する。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add indexeddb persistence for scores and annotations"
```

---

### Task 4: PDF取り込み（Homeにインポートボタン）

**Files:**
- Create: `src/components/FileImportButton.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: 追加ボタン（file input）**

```tsx
// src/components/FileImportButton.tsx
import { useRef } from "react";

export function FileImportButton(props: {
  onFile: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          await props.onFile(f);
          e.target.value = "";
        }}
      />
      <button onClick={() => inputRef.current?.click()}>PDF追加</button>
    </>
  );
}
```

- [ ] **Step 2: PDFをArrayBufferで保存**

HomePage側で `crypto.randomUUID()` により `id` を生成し、`file.arrayBuffer()` した `pdfBytes` は `putPdfBytes(id, pdfBytes)` で保存する。メタ情報（`filename/createdAt/updatedAt/pageCount`）は `putScore(meta)` で保存する（`pageCount` は次タスクでPDF.js導入後に埋めるため、この時点では 0 を許容する）。

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: import pdf and store bytes in indexeddb"
```

---

### Task 5: PDF.js導入とページ数取得 + 1ページレンダリング

**Files:**
- Create: `src/lib/pdf.ts`
- Modify: `src/pages/ViewerPage.tsx`
- Modify: `src/lib/db.ts`（pageCount更新の導線）

- [ ] **Step 1: 依存追加**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: PDF.js初期化（worker設定）**

```ts
// src/lib/pdf.ts
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function loadPdf(pdfBytes: ArrayBuffer) {
  const task = pdfjsLib.getDocument({ data: pdfBytes });
  return task.promise;
}

export async function renderPageToCanvas(opts: {
  pdf: any;
  pageIndex: number; // 0-based
  canvas: HTMLCanvasElement;
  scale: number;
}) {
  const page = await opts.pdf.getPage(opts.pageIndex + 1);
  const viewport = page.getViewport({ scale: opts.scale });
  const ctx = opts.canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context not available");
  opts.canvas.width = Math.floor(viewport.width);
  opts.canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { viewportW: viewport.width, viewportH: viewport.height };
}
```

- [ ] **Step 3: ViewerでPDFを表示（1ページ）**

`ViewerPage` で `getScoreMeta(scoreId)` と `getPdfBytes(scoreId)` を取得し、`loadPdf(pdfBytes)`→`renderPageToCanvas` を実行する。最初は `pageIndex=0` 固定でOK。

- [ ] **Step 4: ページ数をDBに反映**

`pdf.numPages` を `ScoreMeta.pageCount` に反映し、`putScore()` で保存してHome一覧にも反映できるようにする。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: render first pdf page with pdfjs"
```

---

### Task 6: スワイプ（横）でページ送り（タッチのみ）

**Files:**
- Create: `src/lib/gesture.ts`
- Create: `src/lib/gesture.test.ts`
- Modify: `src/pages/ViewerPage.tsx`

- [ ] **Step 1: failing test（スワイプ判定）**

```ts
// src/lib/gesture.test.ts
import { describe, expect, it } from "vitest";
import { classifyHorizontalSwipe } from "./gesture";

describe("classifyHorizontalSwipe", () => {
  it("returns next on sufficient left swipe", () => {
    expect(
      classifyHorizontalSwipe({ dx: -140, dy: 10 }, { minDx: 120, maxDy: 60 }),
    ).toBe("next");
  });

  it("returns prev on sufficient right swipe", () => {
    expect(
      classifyHorizontalSwipe({ dx: 140, dy: 10 }, { minDx: 120, maxDy: 60 }),
    ).toBe("prev");
  });

  it("returns none when vertical movement too large", () => {
    expect(
      classifyHorizontalSwipe({ dx: -200, dy: 120 }, { minDx: 120, maxDy: 60 }),
    ).toBe("none");
  });
});
```

- [ ] **Step 2: testを実行してfail確認**

Run:

```bash
npm test
```

Expected: FAIL（`classifyHorizontalSwipe` が存在しない）

- [ ] **Step 3: 最小実装**

```ts
// src/lib/gesture.ts
export function classifyHorizontalSwipe(
  delta: { dx: number; dy: number },
  cfg: { minDx: number; maxDy: number },
): "prev" | "next" | "none" {
  if (Math.abs(delta.dy) > cfg.maxDy) return "none";
  if (delta.dx >= cfg.minDx) return "prev";
  if (delta.dx <= -cfg.minDx) return "next";
  return "none";
}
```

- [ ] **Step 4: testを実行してpass確認**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Viewerへ配線**

`pointerType="touch"` のみ、`pointerdown` から `pointerup` までの移動量で `classifyHorizontalSwipe` を呼び、`pageIndex` を更新→再レンダリング。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: horizontal swipe page navigation for touch"
```

---

### Task 7: 注釈の型/座標正規化/再描画（基盤）

**Files:**
- Create: `src/lib/annotation/types.ts`
- Create: `src/lib/annotation/normalize.ts`
- Create: `src/lib/annotation/normalize.test.ts`
- Create: `src/lib/annotation/draw.ts`

- [ ] **Step 1: failing test（正規化変換）**

```ts
// src/lib/annotation/normalize.test.ts
import { describe, expect, it } from "vitest";
import { toNormalized, fromNormalized } from "./normalize";

describe("normalize", () => {
  it("round-trips a point across viewport sizes", () => {
    const base = { w: 600, h: 800 };
    const view = { w: 1200, h: 1600 };
    const p = { x: 150, y: 200 };
    const n = toNormalized(p, base);
    const p2 = fromNormalized(n, view);
    expect(p2.x).toBeCloseTo(300, 6);
    expect(p2.y).toBeCloseTo(400, 6);
  });
});
```

- [ ] **Step 2: test fail確認**

```bash
npm test
```

Expected: FAIL

- [ ] **Step 3: 最小実装**

```ts
// src/lib/annotation/normalize.ts
export type Size = { w: number; h: number };
export type Pt = { x: number; y: number };
export type NormPt = { nx: number; ny: number };

export function toNormalized(p: Pt, base: Size): NormPt {
  return { nx: p.x / base.w, ny: p.y / base.h };
}

export function fromNormalized(n: NormPt, view: Size): Pt {
  return { x: n.nx * view.w, y: n.ny * view.h };
}
```

- [ ] **Step 4: test pass確認**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: 描画ユーティリティ**

```ts
// src/lib/annotation/draw.ts
import type { Stroke } from "../db";

export function strokeToCssColor(c: Stroke["color"]) {
  switch (c) {
    case "red":
      return "#d22";
    case "blue":
      return "#2563eb";
    default:
      return "#111";
  }
}

export function widthToPx(w: Stroke["width"]) {
  switch (w) {
    case 3:
      return 6;
    case 2:
      return 4;
    default:
      return 2;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add annotation normalization and draw helpers"
```

---

### Task 8: 注釈描画（ペン）+ 永続化（ページ単位）

**Files:**
- Modify: `src/pages/ViewerPage.tsx`
- Modify: `src/lib/db.ts`（viewportW/Hの保存を使う）

- [ ] **Step 1: Viewerに注釈Canvasを重ねる**

- PDF canvas と同じサイズに注釈canvasを追従させる
- ページ読み込み時に `getPageAnnotations(scoreId, pageIndex)` をロードし、ストロークを再描画

- [ ] **Step 2: pen入力（pointerType="pen"）でストローク追加**

- pointerdown: 新規ストローク開始
- pointermove: points追加し、ラフ描画（パフォーマンスのためrequestAnimationFrame）
- pointerup: ストローク確定→ `putPageAnnotations` で保存

- [ ] **Step 3: viewportW/H の保存**

`renderPageToCanvas` の戻り値で得た `viewportW/H` を `PageAnnotationRecord` に保存して正規化の基準にする。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: draw and persist pen annotations per page"
```

---

### Task 9: Undo/Redo（ページ単位）

**Files:**
- Create: `src/lib/annotation/history.ts`
- Create: `src/lib/annotation/history.test.ts`
- Modify: `src/pages/ViewerPage.tsx`
- Create/Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: failing test（stack操作）**

```ts
// src/lib/annotation/history.test.ts
import { describe, expect, it } from "vitest";
import { History } from "./history";

describe("History", () => {
  it("undo/redo restores strokes", () => {
    const h = new History<string>();
    h.push("a");
    h.push("b");
    expect(h.undo()).toBe("a");
    expect(h.redo()).toBe("b");
  });
});
```

- [ ] **Step 2: fail確認**

```bash
npm test
```

Expected: FAIL

- [ ] **Step 3: 最小実装**

```ts
// src/lib/annotation/history.ts
export class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  push(state: T) {
    this.undoStack.push(state);
    this.redoStack = [];
  }

  undo(): T | undefined {
    if (this.undoStack.length <= 1) return this.undoStack[0];
    const cur = this.undoStack.pop()!;
    this.redoStack.push(cur);
    return this.undoStack[this.undoStack.length - 1];
  }

  redo(): T | undefined {
    const next = this.redoStack.pop();
    if (!next) return this.undoStack[this.undoStack.length - 1];
    this.undoStack.push(next);
    return next;
  }
}
```

- [ ] **Step 4: pass確認**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Viewerに接続**

- ページごとに `History<Stroke[]>` を持つ
- ストローク確定時に `history.push(strokes)` を更新
- Undo/Redo押下で `strokes` を復元→再描画→DBへ保存

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: undo and redo annotations per page"
```

---

### Task 10: 消しゴム（ストローク単位削除）

**Files:**
- Create: `src/lib/annotation/eraser.ts`
- Create: `src/lib/annotation/eraser.test.ts`
- Modify: `src/pages/ViewerPage.tsx`
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: failing test（ヒット判定）**

```ts
// src/lib/annotation/eraser.test.ts
import { describe, expect, it } from "vitest";
import { hitStroke } from "./eraser";

describe("hitStroke", () => {
  it("hits when a point is within radius", () => {
    const stroke = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];
    expect(hitStroke(stroke, { x: 18, y: 18 }, 4)).toBe(true);
  });
});
```

- [ ] **Step 2: fail確認**

```bash
npm test
```

Expected: FAIL

- [ ] **Step 3: 最小実装**

```ts
// src/lib/annotation/eraser.ts
export function hitStroke(
  points: { x: number; y: number }[],
  p: { x: number; y: number },
  r: number,
) {
  const r2 = r * r;
  for (const q of points) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}
```

- [ ] **Step 4: pass確認**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Viewerに実装**

- 消しゴムモード時は `pointerType="pen"` の軌跡を取り、各moveで `hitStroke` により対象ストロークを検出
- ヒットしたストロークは削除し、Undo/Redoに反映、DBに保存
- 部分消しは実装しない（ストローク単位）

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: erase strokes and persist changes"
```

---

### Task 11: ツールバー（色/太さ/ツール/Undo/Redo）

**Files:**
- Create: `src/components/Toolbar.tsx`
- Modify: `src/pages/ViewerPage.tsx`
- Modify: `src/app/styles.css`

- [ ] **Step 1: Toolbar UI**

- 色ボタン（黒/赤/青）
- 太さボタン（3段階）
- モード切替（ペン/消しゴム）
- Undo/Redoボタン

- [ ] **Step 2: Viewerへ状態を接続**

Viewerで `tool/color/width` の状態を持ち、描画・消しゴム・Undo/Redoに伝播する。

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add annotation toolbar"
```

---

### Task 12: PWA（オフライン）対応

**Files:**
- Modify: `vite.config.ts`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: 依存追加**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: ViteにPWA設定**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "manifest.webmanifest"],
      manifest: {
        name: "Score Shelf",
        short_name: "ScoreShelf",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0f19",
        theme_color: "#0b0f19",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),
  ],
});
```

- [ ] **Step 3: オフライン動作確認**

Run:

```bash
npm run build
npm run preview
```

Expected:
- Edgeでインストール可能
- 一度アクセス後、DevToolsで「オフライン」にしても起動し、保存済みデータが参照できる

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: enable offline pwa via service worker"
```

---

### Task 13: 仕上げ（管理画面の完成・削除・UX）

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Create: `src/components/ScoreList.tsx`
- Modify: `src/lib/db.ts`（一覧の並び順を新しい順に）

- [ ] **Step 1: 一覧 + 開く + 削除**

- `ScoreList` を作り、一覧で `Open`（viewerへ遷移）と `Delete` を提供
- Deleteは確認ダイアログを出す

- [ ] **Step 2: 空状態/エラー表示**

- まだ曲がない時の空状態
- 例外時の簡易エラーメッセージ

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: finish library management screen"
```

---

## Plan Self-Review（仕様カバレッジ）

- **オフライン**: Task 12（PWA + SW + IndexedDB）
- **PDF取り込み/記憶**: Task 4 + Task 3
- **管理画面（トップ）**: Task 13（一覧/選択/削除、表示はファイル名のみ）
- **閲覧（1ページ表示）**: Task 5
- **横スワイプでページ送り**: Task 6（タッチのみ）
- **手書き注釈（色/太さ）**: Task 7/8/11
- **消しゴム**: Task 10
- **Undo/Redo**: Task 9 + Task 11
- **注釈の保存/復元（ページ単位）**: Task 8（get/put + 再描画）
- **誤スワイプ防止（ペンは描画のみ）**: Task 6（タッチのみ）+ Task 8（ペンのみ）

