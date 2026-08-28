import type {
  Element,
  GameSettings,
  JobTier,
  JobTierId,
  Stats,
  ZoneDef,
  ZoneKind,
} from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// 맵 설정 (기획 10번 항목)
// 정사각형, 주인공 키 180cm 기준 가로·세로 2km, 200m 그리드 셀 = 10x10
// ────────────────────────────────────────────────────────────────
export const MAP_SIZE_METERS = 2000
export const CELL_SIZE_METERS = 200
export const GRID_CELLS = MAP_SIZE_METERS / CELL_SIZE_METERS // 10
export const MONSTERS_PER_CELL = 5

export const ZONES: ZoneDef[] = [
  {
    id: 'zone-school',
    kind: 'school',
    name: '아르피아 마법학교',
    cell: { x0: 0, y0: 0, x1: 3, y1: 3 },
    color: '#5b6bd6',
    description: '북서쪽에 자리한 유서 깊은 마법학교. 전직 담당 NPC가 상주한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-shop-street',
    kind: 'shopStreet',
    name: '별빛 상점가',
    cell: { x0: 7, y0: 0, x1: 10, y1: 3 },
    color: '#d9a441',
    description: '북동쪽 상점가. 무기·물약·도구 상인이 모여있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-colosseum',
    kind: 'colosseum',
    name: '중앙 콜로세움',
    cell: { x0: 4, y0: 4, x1: 6, y1: 6 },
    color: '#c9622b',
    description: '지도 정중앙의 투기장. 파티 단위 대전이 열린다.',
    hasMonsters: false,
  },
  {
    id: 'zone-village',
    kind: 'village',
    name: '루메 마을 (하우징)',
    cell: { x0: 0, y0: 3, x1: 3, y1: 7 },
    color: '#6fae5d',
    description: '서쪽 마을. 주민들의 집과 플레이어 하우징 부지가 모여있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-military',
    kind: 'military',
    name: '동부 마법 군부대',
    cell: { x0: 7, y0: 3, x1: 10, y1: 7 },
    color: '#8a8f9c',
    description: '동쪽의 마법 군부대. 경비병 NPC들이 순찰한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-forest',
    kind: 'forest',
    name: '위습 숲',
    cell: { x0: 0, y0: 7, x1: 5, y1: 10 },
    color: '#2f6b3a',
    description: '남서쪽 숲 스테이지. 몬스터가 배회하며 접촉 시 전투가 시작된다.',
    hasMonsters: true,
    monsterDensityPer200m: MONSTERS_PER_CELL,
  },
  {
    id: 'zone-sea',
    kind: 'sea',
    name: '가나폴리 해안',
    cell: { x0: 5, y0: 7, x1: 10, y1: 10 },
    color: '#1f5c8a',
    description: '남동쪽 바다 스테이지. 몬스터가 배회하며 접촉 시 전투가 시작된다.',
    hasMonsters: true,
    monsterDensityPer200m: MONSTERS_PER_CELL,
  },
]

export function zoneKindAt(x: number, y: number): ZoneKind {
  for (const z of ZONES) {
    if (x >= z.cell.x0 && x < z.cell.x1 && y >= z.cell.y0 && y < z.cell.y1) return z.kind
  }
  return 'field'
}

export function zoneAt(x: number, y: number): ZoneDef | null {
  for (const z of ZONES) {
    if (x >= z.cell.x0 && x < z.cell.x1 && y >= z.cell.y0 && y < z.cell.y1) return z
  }
  return null
}

// ────────────────────────────────────────────────────────────────
// 전직 단계 (기획 7번 항목)
// ────────────────────────────────────────────────────────────────
export const JOB_TIERS: JobTier[] = [
  {
    id: 'apprentice',
    order: 0,
    name: '견습 마법사',
    shortName: '견습',
    minLevel: 1,
    description: '아르피아 마법학교에 갓 입학한 견습생.',
  },
  {
    id: 'novice',
    order: 1,
    name: '초급 마법사',
    shortName: '초급',
    minLevel: 15,
    description: '기초 마법을 뗀 초급 마법사.',
  },
  {
    id: 'adept',
    order: 2,
    name: '중급 마법사',
    shortName: '중급',
    minLevel: 25,
    description: '실전 경험을 쌓은 중급 마법사.',
  },
  {
    id: 'magus',
    order: 3,
    name: '마도사',
    shortName: '마도사',
    minLevel: 35,
    description: '독자적인 마법 체계를 다루는 마도사.',
  },
  {
    id: 'archmagus',
    order: 4,
    name: '대마도사',
    shortName: '대마도사',
    minLevel: 45,
    description: '아르피아 최고위 전직, 대마도사.',
  },
]

export function jobTierForLevel(level: number): JobTier {
  let best = JOB_TIERS[0]
  for (const t of JOB_TIERS) {
    if (level >= t.minLevel) best = t
  }
  return best
}

export function nextJobTier(currentId: JobTierId): JobTier | null {
  const cur = JOB_TIERS.find((t) => t.id === currentId)!
  return JOB_TIERS.find((t) => t.order === cur.order + 1) ?? null
}

// ────────────────────────────────────────────────────────────────
// 속성 (기획 6번 항목)
// ────────────────────────────────────────────────────────────────
export const ELEMENT_META: Record<
  Element,
  { name: string; color: string; icon: string; leanStats: Partial<Stats>; weakAgainst: Element; strongAgainst: Element }
> = {
  // 상성 순환: 불 > 바람 > 흙 > 물 > 불 (각 속성은 다음 속성에 강하고 이전 속성에 약함)
  // ReArpia(동인 리메이크) 전투 기획서의 "불꽃>얼음>대지>불꽃" 3속성 순환 상성 구조를
  // 참고해 본 게임의 4속성(불/물/바람/흙) 체계에 맞게 확장 적용함
  fire: {
    name: '불',
    color: 'var(--elem-fire)',
    icon: '/images/elements/fire.svg',
    leanStats: { matk: 3, atk: 1 },
    weakAgainst: 'water',
    strongAgainst: 'wind',
  },
  water: {
    name: '물',
    color: 'var(--elem-water)',
    icon: '/images/elements/water.svg',
    leanStats: { mdef: 2, maxMp: 10 },
    weakAgainst: 'earth',
    strongAgainst: 'fire',
  },
  wind: {
    name: '바람',
    color: 'var(--elem-wind)',
    icon: '/images/elements/wind.svg',
    leanStats: { spd: 3, luck: 1 },
    weakAgainst: 'fire',
    strongAgainst: 'earth',
  },
  earth: {
    name: '흙',
    color: 'var(--elem-earth)',
    icon: '/images/elements/earth.svg',
    leanStats: { def: 2, maxHp: 15 },
    weakAgainst: 'wind',
    strongAgainst: 'water',
  },
}

export const BASE_STATS: Stats = {
  maxHp: 60,
  maxMp: 40,
  atk: 6,
  def: 4,
  matk: 8,
  mdef: 4,
  spd: 6,
  luck: 3,
}

/** 레벨업 시 스탯 성장치(레벨당) — 추후 밸런싱 예정, 임시값 */
export const STAT_GROWTH_PER_LEVEL: Stats = {
  maxHp: 14,
  maxMp: 8,
  atk: 2.2,
  def: 1.6,
  matk: 2.6,
  mdef: 1.6,
  spd: 1.2,
  luck: 0.8,
}

export function computeStatsForLevel(element: Element, level: number): Stats {
  const lean = ELEMENT_META[element].leanStats
  const out = {} as Stats
  ;(Object.keys(BASE_STATS) as (keyof Stats)[]).forEach((key) => {
    const base = BASE_STATS[key]
    const growth = STAT_GROWTH_PER_LEVEL[key] * (level - 1)
    const leanBonus = (lean[key] ?? 0) * level * 0.4
    out[key] = Math.round(base + growth + leanBonus)
  })
  return out
}

// ────────────────────────────────────────────────────────────────
// 파티 / 기타
// ────────────────────────────────────────────────────────────────
export const MAX_PARTY_SIZE = 4 // 기획 5번 항목

export const DEFAULT_SETTINGS: GameSettings = {
  testMode: true,
  bgmVolume: 60,
  sfxVolume: 80,
  battleAnimSpeed: 1,
}

export const STARTING_GOLD = 500
