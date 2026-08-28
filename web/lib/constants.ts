import type {
  Element,
  ElementOrNeutral,
  GameSettings,
  JobTier,
  JobTierId,
  Stats,
  ZoneDef,
  ZoneKind,
} from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// 맵 설정 — 정사각형 2km, 200m 그리드 셀 = 10x10
// ────────────────────────────────────────────────────────────────
export const MAP_SIZE_METERS = 2000
export const CELL_SIZE_METERS = 200
export const GRID_CELLS = MAP_SIZE_METERS / CELL_SIZE_METERS // 10
export const MONSTERS_PER_CELL = 1 // 200m 정사각형(셀 1칸)당 1마리

export const ZONES: ZoneDef[] = [
  {
    id: 'zone-school',
    kind: 'school',
    name: '아르피아 마법학교',
    cell: { x0: 0, y0: 0, x1: 3, y1: 3 },
    color: '#5b6bd6',
    description: '북서쪽의 유서 깊은 마법학교. 전직을 담당하는 미르엘 교수가 상주한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-shop',
    kind: 'shopStreet',
    name: '별빛 상점가',
    cell: { x0: 7, y0: 0, x1: 10, y1: 3 },
    color: '#d9a441',
    description: '북동쪽 상점가. 무기·물약·도구 상인과 펫 조련사가 모여 있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-plaza',
    kind: 'colosseum',
    name: '수련의 광장',
    cell: { x0: 4, y0: 4, x1: 6, y1: 6 },
    color: '#c9622b',
    description: '지도 정중앙의 콜로세움. 파티 단위 대전이 준비 중이다.',
    hasMonsters: false,
  },
  {
    id: 'zone-dorm',
    kind: 'village',
    name: '기숙사 마을',
    cell: { x0: 0, y0: 3, x1: 3, y1: 7 },
    color: '#6fae5d',
    description: '서쪽 마을. 학생 기숙사와 하우징 부지가 있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-research',
    kind: 'military',
    name: '마법 연구동',
    cell: { x0: 7, y0: 3, x1: 10, y1: 7 },
    color: '#8a8f9c',
    description: '동쪽의 마법 연구동. 경비대가 순찰한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-forest',
    kind: 'forest',
    name: '위습 숲',
    cell: { x0: 0, y0: 7, x1: 5, y1: 10 },
    color: '#2f6b3a',
    description: '남서쪽 숲. 몬스터가 배회하며 접촉 시 전투가 시작된다.',
    hasMonsters: true,
    monsterDensityPer200m: 1,
    recommendedLevel: 2,
  },
  {
    id: 'zone-sea',
    kind: 'sea',
    name: '가나폴리 해안',
    cell: { x0: 5, y0: 7, x1: 8, y1: 10 },
    color: '#1f5c8a',
    description: '남동쪽 바다. 수생 몬스터가 배회한다.',
    hasMonsters: true,
    monsterDensityPer200m: 1,
    recommendedLevel: 3,
  },
  {
    id: 'zone-ruins',
    kind: 'ruins',
    name: '아즈카의 폐허',
    cell: { x0: 8, y0: 7, x1: 10, y1: 10 },
    color: '#4a3a5c',
    description: '봉인이 약해진 대마왕 아즈카의 폐허. 언데드와 흑마법사가 출몰한다. (권장 Lv.10+)',
    hasMonsters: true,
    monsterDensityPer200m: 1,
    recommendedLevel: 10,
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
// 전직 5단계 — 견습 → 초보 → 숙련 → 마도사 → 대마도사 (Lv 1/10/20/30/40)
// ────────────────────────────────────────────────────────────────
export const JOB_TIERS: JobTier[] = [
  { id: 'apprentice', order: 0, name: '견습 마법사', shortName: '견습', minLevel: 1, description: '아르피아 마법학교에 갓 입학한 견습생.' },
  { id: 'novice', order: 1, name: '초보 마법사', shortName: '초보', minLevel: 10, description: '기초 마법 과정을 수료한 초보 마법사.' },
  { id: 'adept', order: 2, name: '숙련 마법사', shortName: '숙련', minLevel: 20, description: '실전 경험을 쌓은 숙련 마법사.' },
  { id: 'magus', order: 3, name: '마도사', shortName: '마도사', minLevel: 30, description: '독자적 마법 체계를 다루는 마도사.' },
  { id: 'archmagus', order: 4, name: '대마도사', shortName: '대마도사', minLevel: 40, description: '아르피아 최고위 전직, 대마도사.' },
]

export const JOB_TIER_ORDER: JobTierId[] = ['apprentice', 'novice', 'adept', 'magus', 'archmagus']

export function jobTierForLevel(level: number): JobTier {
  let best = JOB_TIERS[0]
  for (const t of JOB_TIERS) if (level >= t.minLevel) best = t
  return best
}

export function nextJobTier(currentId: JobTierId): JobTier | null {
  const cur = JOB_TIERS.find((t) => t.id === currentId)!
  return JOB_TIERS.find((t) => t.order === cur.order + 1) ?? null
}

export function jobTierAtLeast(have: JobTierId, need: JobTierId): boolean {
  return JOB_TIER_ORDER.indexOf(have) >= JOB_TIER_ORDER.indexOf(need)
}

// ────────────────────────────────────────────────────────────────
// 속성 — 불꽃 > 얼음 > 대지 > 불꽃 (3속성 상성 순환)
// ────────────────────────────────────────────────────────────────
export const ELEMENTS: Element[] = ['fire', 'ice', 'earth']

export const ELEMENT_META: Record<
  ElementOrNeutral,
  {
    name: string
    color: string
    icon: string
    leanStats: Partial<Stats>
    strongAgainst: ElementOrNeutral
    weakAgainst: ElementOrNeutral
    blurb: string
  }
> = {
  fire: {
    name: '불꽃',
    color: 'var(--elem-fire)',
    icon: '/images/elements/fire.svg',
    leanStats: { matk: 3, atk: 1 },
    strongAgainst: 'ice',
    weakAgainst: 'earth',
    blurb: '강력한 화염 마법으로 적을 태우고 화상·출혈을 입힌다. 마법공격력에 특화되며 얼음에 강하고 대지에 약하다.',
  },
  ice: {
    name: '얼음',
    color: 'var(--elem-ice)',
    icon: '/images/elements/ice.svg',
    leanStats: { mdef: 2, maxMp: 10, spd: -1 },
    strongAgainst: 'earth',
    weakAgainst: 'fire',
    blurb: '냉기로 적의 행동을 묶는 제어 마법. 감속·마비에 특화되며 대지에 강하고 불꽃에 약하다.',
  },
  earth: {
    name: '대지',
    color: 'var(--elem-earth)',
    icon: '/images/elements/earth.svg',
    leanStats: { def: 2, maxHp: 15 },
    strongAgainst: 'fire',
    weakAgainst: 'ice',
    blurb: '단단한 방어와 약화·수면. 체력과 방어력에 특화되며 불꽃에 강하고 얼음에 약하다.',
  },
  neutral: {
    name: '무',
    color: 'var(--elem-neutral)',
    icon: '/images/elements/neutral.svg',
    leanStats: {},
    strongAgainst: 'neutral',
    weakAgainst: 'neutral',
    blurb: '속성 없음. 상성의 영향을 주고받지 않는다.',
  },
}

/** 상성 배율: 우위 1.5 / 열위 0.67 / 그 외 1.0 */
export function elementMultiplier(attacker: ElementOrNeutral, defender: ElementOrNeutral): number {
  if (attacker === 'neutral' || defender === 'neutral') return 1
  const meta = ELEMENT_META[attacker]
  if (meta.strongAgainst === defender) return 1.5
  if (meta.weakAgainst === defender) return 0.67
  return 1
}

// ────────────────────────────────────────────────────────────────
// 스탯 기본값 / 성장
// ────────────────────────────────────────────────────────────────
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

export function computeStatsForLevel(element: ElementOrNeutral, level: number): Stats {
  const lean = ELEMENT_META[element].leanStats
  const out = {} as Stats
  ;(Object.keys(BASE_STATS) as (keyof Stats)[]).forEach((key) => {
    const base = BASE_STATS[key]
    const growth = STAT_GROWTH_PER_LEVEL[key] * (level - 1)
    const leanBonus = (lean[key] ?? 0) * level * 0.4
    out[key] = Math.max(1, Math.round(base + growth + leanBonus))
  })
  return out
}

// ────────────────────────────────────────────────────────────────
// ATB 대기 게이지
// ────────────────────────────────────────────────────────────────
export const ATB = {
  THRESHOLD: 100,
  BASE_TICK: 8,
  REF_SPD: 20,
  SLOW_FACTOR: 0.6,
  DEFEND_GAIN: 20,
}

// ────────────────────────────────────────────────────────────────
// 파티 / 기타
// ────────────────────────────────────────────────────────────────
export const MAX_PARTY_SIZE = 4
export const MAX_ACTIVE_PETS = 2

export const DEFAULT_SETTINGS: GameSettings = {
  testMode: true,
  bgmVolume: 60,
  sfxVolume: 80,
  battleAnimSpeed: 1,
}

export const STARTING_GOLD = 500
