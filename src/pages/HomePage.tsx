import { useCallback, useEffect, useRef, useState } from 'react'
import { FileImportButton } from '../components/FileImportButton'
import { ScoreList } from '../components/ScoreList'
import { listScores, type ScoreMeta } from '../lib/db'

export function HomePage() {
  const [scores, setScores] = useState<ScoreMeta[]>([])
  const mountedRef = useRef(false)

  const refresh = useCallback(async () => {
    const rows = await listScores()
    if (mountedRef.current) {
      setScores(rows)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  return (
    <div>
      <h2>ライブラリ</h2>
      <p>PDFを追加して曲を管理します。一覧のファイル名を開くと閲覧・手書きメモができます。</p>

      <FileImportButton
        onImported={async () => {
          await refresh()
        }}
      />

      {scores.length === 0 ? (
        <p style={{ marginTop: 16 }}>
          まだ曲がありません。「PDF追加」から画譜を取り込んでください。
        </p>
      ) : (
        <ScoreList scores={scores} onChanged={refresh} />
      )}
    </div>
  )
}
