import { describe, expect, it } from 'vitest'
import type { ScoreMeta } from '../db'
import {
  classifyByFirstChar,
  groupAndSortScores,
  type Category,
} from './classify'

function meta(id: string, filename: string): ScoreMeta {
  return {
    id,
    filename,
    createdAt: 0,
    updatedAt: 0,
    pageCount: 0,
  }
}

describe('classifyByFirstChar', () => {
  it.each<[string, Category]>([
    ['ありがとう.pdf', 'hira'],
    ['ぁ小さい.pdf', 'hira'],
    ['ゟ合字.pdf', 'hira'],
    ['アリス.pdf', 'kata'],
    ['ｱﾆｿﾝ.pdf', 'kata'],
    ['ヴィヴァルディ.pdf', 'kata'],
    ['桜.pdf', 'kanji'],
    ['亜細亜.pdf', 'kanji'],
    ['Alpha.pdf', 'atoz'],
    ['zeal.pdf', 'atoz'],
    ['123.pdf', 'other'],
    ['!bang.pdf', 'other'],
    ['.hidden.pdf', 'other'],
    ['', 'other'],
    ['  ', 'other'],
  ])('classifies %s as %s', (name, expected) => {
    expect(classifyByFirstChar(name)).toBe(expected)
  })

  it('treats leading whitespace as skipped', () => {
    expect(classifyByFirstChar('   ありがとう.pdf')).toBe('hira')
    expect(classifyByFirstChar('\tAlpha.pdf')).toBe('atoz')
  })

  it('handles surrogate pairs in the first position', () => {
    expect(classifyByFirstChar('\uD867\uDE3D.pdf')).toBe('kanji')
    expect(classifyByFirstChar('\uD83C\uDF38flower.pdf')).toBe('other')
  })
})

describe('groupAndSortScores', () => {
  it('groups scores into fixed category order and omits empty groups', () => {
    const scores = [
      meta('1', 'Zeta.pdf'),
      meta('2', 'alpha.pdf'),
      meta('3', 'ありがとう.pdf'),
      meta('4', 'あいうえお.pdf'),
      meta('5', 'アリス.pdf'),
      meta('6', '123song.pdf'),
    ]

    const groups = groupAndSortScores(scores)

    expect(groups.map((g) => g.category)).toEqual([
      'hira',
      'kata',
      'atoz',
      'other',
    ])
  })

  it('sorts filenames within each group ascending (ja locale)', () => {
    const scores = [
      meta('1', 'ん.pdf'),
      meta('2', 'あ.pdf'),
      meta('3', 'か.pdf'),
    ]

    const groups = groupAndSortScores(scores)
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((s) => s.filename)).toEqual([
      'あ.pdf',
      'か.pdf',
      'ん.pdf',
    ])
  })

  it('sorts A-Z case-insensitively', () => {
    const scores = [
      meta('1', 'banana.pdf'),
      meta('2', 'Apple.pdf'),
      meta('3', 'cherry.pdf'),
    ]

    const groups = groupAndSortScores(scores)
    expect(groups[0].items.map((s) => s.filename)).toEqual([
      'Apple.pdf',
      'banana.pdf',
      'cherry.pdf',
    ])
  })

  it('keeps the canonical category order when multiple groups coexist', () => {
    const scores = [
      meta('1', 'Alpha.pdf'),
      meta('2', '桜.pdf'),
      meta('3', '!bang.pdf'),
      meta('4', 'アリス.pdf'),
      meta('5', 'ありがとう.pdf'),
    ]

    const groups = groupAndSortScores(scores)
    expect(groups.map((g) => g.category)).toEqual([
      'hira',
      'kata',
      'kanji',
      'atoz',
      'other',
    ])
    expect(groups.map((g) => g.label)).toEqual([
      'ひらがな',
      'カタカナ',
      '漢字',
      'A-Z',
      'その他',
    ])
  })

  it('returns an empty array for no scores', () => {
    expect(groupAndSortScores([])).toEqual([])
  })
})
