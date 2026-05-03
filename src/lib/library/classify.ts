import type { ScoreMeta } from '../db'

export type Category = 'hira' | 'kata' | 'kanji' | 'atoz' | 'other'

export type ScoreGroup = {
  category: Category
  label: string
  items: ScoreMeta[]
}

const CATEGORY_ORDER: Category[] = ['hira', 'kata', 'kanji', 'atoz', 'other']

const CATEGORY_LABELS: Record<Category, string> = {
  hira: 'ひらがな',
  kata: 'カタカナ',
  kanji: '漢字',
  atoz: 'A-Z',
  other: 'その他',
}

function firstCodePoint(name: string): number | null {
  for (const ch of name.trimStart()) {
    return ch.codePointAt(0) ?? null
  }
  return null
}

function isHiragana(cp: number): boolean {
  return cp >= 0x3041 && cp <= 0x309f
}

function isKatakana(cp: number): boolean {
  if (cp >= 0x30a1 && cp <= 0x30ff) return true
  if (cp >= 0xff66 && cp <= 0xff9d) return true
  return false
}

function isKanji(cp: number): boolean {
  if (cp >= 0x3400 && cp <= 0x4dbf) return true
  if (cp >= 0x4e00 && cp <= 0x9fff) return true
  if (cp >= 0xf900 && cp <= 0xfaff) return true
  if (cp >= 0x20000 && cp <= 0x2ffff) return true
  return false
}

function isAtoZ(cp: number): boolean {
  return (
    (cp >= 0x41 && cp <= 0x5a) ||
    (cp >= 0x61 && cp <= 0x7a)
  )
}

export function classifyByFirstChar(name: string): Category {
  const cp = firstCodePoint(name)
  if (cp === null) return 'other'
  if (isHiragana(cp)) return 'hira'
  if (isKatakana(cp)) return 'kata'
  if (isKanji(cp)) return 'kanji'
  if (isAtoZ(cp)) return 'atoz'
  return 'other'
}

export function groupAndSortScores(scores: ScoreMeta[]): ScoreGroup[] {
  const buckets: Record<Category, ScoreMeta[]> = {
    hira: [],
    kata: [],
    kanji: [],
    atoz: [],
    other: [],
  }

  for (const score of scores) {
    buckets[classifyByFirstChar(score.filename)].push(score)
  }

  const collator = new Intl.Collator('ja', {
    sensitivity: 'base',
    numeric: true,
  })

  const result: ScoreGroup[] = []
  for (const category of CATEGORY_ORDER) {
    const items = buckets[category]
    if (items.length === 0) continue
    items.sort((a, b) => collator.compare(a.filename, b.filename))
    result.push({
      category,
      label: CATEGORY_LABELS[category],
      items,
    })
  }
  return result
}
