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

// ============================================================================
// 《마법학교 울토르》 — 고정값 (맵 / 전직 / 삼원 속성)
// 세계관 기준: 게임 기획서 초안 「마법학교 울토르」
//  · 오리지널 세계관. 기존 《아르피아》 설정은 전부 배제한다.
//  · 삼원(三源): 화염계(변화) / 빙결계(차원) / 대지계(생명)
//  · 각 계통은 3단계로 각성한다.
//      🔥 불 → 번개 → 빛   (에너지·변화·시간)
//      ❄️ 얼음 → 물 → 우주 (물질·공간·차원)
//      🪨 흙 → 풀 → 어둠   (생명·죽음·존재)
// ============================================================================

// ────────────────────────────────────────────────────────────────
// 맵 설정 — 정사각형 2km, 200m 그리드 셀 = 10x10
// ────────────────────────────────────────────────────────────────
export const MAP_SIZE_METERS = 2000
export const CELL_SIZE_METERS = 200
export const GRID_CELLS = MAP_SIZE_METERS / CELL_SIZE_METERS // 10
export const MONSTERS_PER_CELL = 1 // 200m 정사각형(셀 1칸)당 1마리

// ────────────────────────────────────────────────────────────────
// 지역 — 1차 개발 범위: 시작 마을 / 울토르 / 에르디아 숲 / 아틀란티스 등
// (기획서 §30 전체 맵의 하위 집합)
// ────────────────────────────────────────────────────────────────
export const ZONES: ZoneDef[] = [
  {
    id: 'zone-school',
    kind: 'school',
    name: '마법학교 울토르',
    cell: { x0: 0, y0: 0, x1: 3, y1: 3 },
    color: '#5b6bd6',
    description: '두 번째 인마대전을 막을 마법사를 양성하는 대륙 최고의 마법학교. 마력학의 울프릭 교수가 전직을 담당한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-shop',
    kind: 'shopStreet',
    name: '울토르 상관 거리',
    cell: { x0: 7, y0: 0, x1: 10, y1: 3 },
    color: '#d9a441',
    description: '학교 정문 앞 상관 거리. 마도구·연금술 상점과 마수 관리점이 모여 있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-plaza',
    kind: 'colosseum',
    name: '대련장',
    cell: { x0: 4, y0: 4, x1: 6, y1: 6 },
    color: '#c9622b',
    description: '학생들이 실전 마법을 겨루는 원형 대련장. 파티 단위 대전이 준비 중이다.',
    hasMonsters: false,
  },
  {
    id: 'zone-dorm',
    kind: 'village',
    name: '기숙사 구역',
    cell: { x0: 0, y0: 3, x1: 3, y1: 7 },
    color: '#6fae5d',
    description: '신입생 기숙사와 사육장이 있는 구역. 사감 헬가에게 부탁하면 파티 전원이 휴식할 수 있다.',
    hasMonsters: false,
  },
  {
    id: 'zone-research',
    kind: 'military',
    name: '마력공학동',
    cell: { x0: 7, y0: 3, x1: 10, y1: 7 },
    color: '#8a8f9c',
    description: '마력공학과 고대 유적을 연구하는 건물. 경비대가 순찰한다.',
    hasMonsters: false,
  },
  {
    id: 'zone-forest',
    kind: 'forest',
    name: '에르디아 숲',
    cell: { x0: 0, y0: 7, x1: 5, y1: 10 },
    color: '#2f6b3a',
    description: '생명의 숲. 대지 → 풀 → 어둠 계열의 중심지로, 야생 마수가 배회한다. 접촉 시 전투가 시작된다.',
    hasMonsters: true,
    monsterDensityPer200m: 1,
    recommendedLevel: 2,
  },
  {
    id: 'zone-sea',
    kind: 'sea',
    name: '아틀란티스 수로',
    cell: { x0: 5, y0: 7, x1: 8, y1: 10 },
    color: '#1f5c8a',
    description: '수상도시 아틀란티스로 이어지는 수로. 물 계열 마수가 배회한다.',
    hasMonsters: true,
    monsterDensityPer200m: 1,
    recommendedLevel: 3,
  },
  {
    id: 'zone-ruins',
    kind: 'ruins',
    name: '폐허의 신전',
    cell: { x0: 8, y0: 7, x1: 10, y1: 10 },
    color: '#4a3a5c',
    description: '인마대전 당시의 봉인 신전. 악마왕 모르스의 봉인이 약해지며 언데드와 악마 첨병이 새어 나온다. (권장 Lv.10+)',
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
// 전직 5단계 — 계통의 3단계 각성(불→번개→빛)에 맞춘 세부 등급
//   견습(Lv1) → 정식(Lv10) → 각성1 술사(Lv20) → 각성1 마도사(Lv30) → 각성2 마도사(Lv40)
// 표시 이름은 속성 계통별로 달라진다. jobTitle() 참고.
// ────────────────────────────────────────────────────────────────
export const JOB_TIERS: JobTier[] = [
  { id: 'apprentice', order: 0, name: '견습 마법사', shortName: '견습', minLevel: 1, description: '울토르 마법학교에 갓 입학한 신입생. 계통의 첫 단계 마법을 배운다.' },
  { id: 'novice', order: 1, name: '정식 마법사', shortName: '정식', minLevel: 10, description: '기초 과정을 수료한 정식 마법사.' },
  { id: 'adept', order: 2, name: '술사', shortName: '술사', minLevel: 20, description: '계통의 두 번째 단계로 각성한 술사. (불→번개 / 얼음→물 / 흙→풀)' },
  { id: 'magus', order: 3, name: '마도사', shortName: '마도사', minLevel: 30, description: '각성한 힘을 자유로이 다루는 마도사. Lv.30 전후로 모르스가 부활한다.' },
  { id: 'archmagus', order: 4, name: '대마도사', shortName: '대마도사', minLevel: 40, description: '계통의 세 번째 단계에 도달한 대마도사. (번개→빛 / 물→우주 / 풀→어둠)' },
]

export const JOB_TIER_ORDER: JobTierId[] = ['apprentice', 'novice', 'adept', 'magus', 'archmagus']

/** 속성 계통별 전직 표시 이름. 계통의 3단계 각성(불→번개→빛)을 5등급에 매핑한다. */
const JOB_TITLE_BY_ELEMENT: Record<Element, [string, string, string, string, string]> = {
  fire: ['불 견습생', '불 마도생', '번개 술사', '번개 마도사', '빛의 마도사'],
  ice: ['얼음 견습생', '얼음 마도생', '물 술사', '물 마도사', '우주의 마도사'],
  earth: ['흙 견습생', '흙 마도생', '풀 술사', '풀 마도사', '어둠의 마도사'],
}

/** 캐릭터 속성 + 전직 등급(order 0~4) → 표시 직함 */
export function jobTitle(element: ElementOrNeutral, tierOrder: number): string {
  if (element === 'neutral') return JOB_TIERS[Math.max(0, Math.min(4, tierOrder))].name
  return JOB_TITLE_BY_ELEMENT[element][Math.max(0, Math.min(4, tierOrder))]
}

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
// 삼원(三源) 속성 — 화염계 / 빙결계 / 대지계
// 상성 순환(게임 밸런스용): 화염 > 빙결 > 대지 > 화염
// ────────────────────────────────────────────────────────────────
export const ELEMENTS: Element[] = ['fire', 'ice', 'earth']

export const ELEMENT_META: Record<
  ElementOrNeutral,
  {
    name: string
    line: string
    theme: string
    /** 계통 3단계 각성 이름 */
    evolution: [string, string, string]
    /** 계통이 최종적으로 접근하는 세계 법칙 */
    apex: string
    color: string
    icon: string
    leanStats: Partial<Stats>
    strongAgainst: ElementOrNeutral
    weakAgainst: ElementOrNeutral
    blurb: string
  }
> = {
  fire: {
    name: '화염',
    line: '화염계',
    theme: '변화',
    evolution: ['불', '번개', '빛'],
    apex: '시간',
    color: 'var(--elem-fire)',
    icon: '/images/elements/fire.svg',
    leanStats: { matk: 3, atk: 1 },
    strongAgainst: 'ice',
    weakAgainst: 'earth',
    blurb: '불 → 번개 → 빛. 에너지와 변화, 그리고 시간에 접근하는 계통. 지속 피해와 속도, 마법공격력에 특화된다. 빙결에 강하고 대지에 약하다.',
  },
  ice: {
    name: '빙결',
    line: '빙결계',
    theme: '차원',
    evolution: ['얼음', '물', '우주'],
    apex: '공간',
    color: 'var(--elem-ice)',
    icon: '/images/elements/ice.svg',
    leanStats: { mdef: 2, maxMp: 10, spd: -1 },
    strongAgainst: 'earth',
    weakAgainst: 'fire',
    blurb: '얼음 → 물 → 우주. 물질과 공간, 차원을 다루는 계통. 적의 행동을 묶는 제어와 회복에 특화된다. 대지에 강하고 화염에 약하다.',
  },
  earth: {
    name: '대지',
    line: '대지계',
    theme: '생명',
    evolution: ['흙', '풀', '어둠'],
    apex: '죽음',
    color: 'var(--elem-earth)',
    icon: '/images/elements/earth.svg',
    leanStats: { def: 2, maxHp: 15 },
    strongAgainst: 'fire',
    weakAgainst: 'ice',
    blurb: '흙 → 풀 → 어둠. 생명과 죽음, 존재를 다루는 계통. 단단한 방어와 재생, 저주에 특화된다. 화염에 강하고 빙결에 약하다.',
  },
  neutral: {
    name: '무',
    line: '무속성',
    theme: '—',
    evolution: ['무', '무', '무'],
    apex: '—',
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
// 행동 순서 대기 게이지 (TU / ATB)
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
export const MAX_ACTIVE_PETS = 1 // 계약수는 최대 3마리 보유, 전투에는 1마리 동반

export const DEFAULT_SETTINGS: GameSettings = {
  testMode: true,
  bgmVolume: 60,
  sfxVolume: 80,
  battleAnimSpeed: 1,
}

export const STARTING_GOLD = 500
