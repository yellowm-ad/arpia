import type { GameMap, MapId, ZoneDef, ZoneKind } from '@/lib/types'

// ============================================================================
// 멀티맵 정의 — 메인 마을(안전) + 야생 스테이지(포탈 이동)
// 셀 = 200m. 맵마다 grid 크기가 다르며 정사각형이 아니어도 된다.
// 스테이지 트리:
//   village ──군 통문──▶ forest / sea / ruins / volcano
//   forest ─▶ cave ─▶ mine,   forest ─▶ swamp
//   sea    ─▶ deepsea,        sea    ─▶ atlantis(안전)
//   ruins  ─▶ graveyard,      ruins  ─▶ temple-ruin(고대 신전)
//   volcano─▶ demon-village,  volcano─▶ demon-castle
// ============================================================================

function z(
  id: string,
  kind: ZoneKind,
  name: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  description: string,
): ZoneDef {
  return { id, kind, name, cell: { x0, y0, x1, y1 }, color, description, hasMonsters: false }
}

// ── 메인 마을 (14 × 12) ─────────────────────────────────────────────────────
const VILLAGE_ZONES: ZoneDef[] = [
  z('z-magic-hall', 'school', '마법동', 0, 0, 3, 3, '#5b6bd6', '전직을 담당하는 미르엘 교수와 도서관이 있는 본관.'),
  z('z-alchemy-hall', 'school', '연금술동', 3, 0, 6, 3, '#4a8f7a', '연금술과 마법약을 연구하는 실습동.'),
  z('z-artifact-hall', 'school', '마도구동', 0, 3, 6, 5, '#7a6bc0', '마도구와 마법 공학을 다루는 공방동.'),
  z('z-quad', 'plaza', '중앙 광장', 6, 0, 9, 5, '#8891b5', '학교 부지 한가운데의 분수 광장. 사방으로 길이 통한다.'),
  z('z-housing', 'village', '하우징 마을', 9, 0, 14, 5, '#6fae5d', '학생·주민이 사는 저층 주거 블록. 하우징은 준비 중.'),
  z('z-dorm', 'village', '기숙사 마을', 0, 5, 4, 8, '#5a9a6a', '견습생 기숙사 구역.'),
  z('z-park', 'park', '마로니에 공원', 4, 5, 6, 8, '#4e9c4a', '기숙사와 광장 사이의 녹지 완충대.'),
  z('z-plaza', 'colosseum', '수련의 광장', 6, 5, 9, 8, '#c9622b', '콜로세움. 파티 단위 대전이 준비 중이다.'),
  z('z-shops', 'shopStreet', '별빛 상점가', 9, 5, 14, 8, '#d9a441', '무기·물약·도구 상인과 펫 조련사가 모인 상가.'),
  z('z-temple', 'temple', '성역 신전', 0, 8, 5, 12, '#d8c98a', '신관과 성녀가 머무는 성역. 앞마당과 정원이 넓다.'),
  z('z-farm', 'farm', '햇살 농가', 5, 8, 9, 12, '#c9a44a', '농사와 펫 농장을 시험하는 농가. 시스템은 준비 중.'),
  z('z-barracks', 'military', '통문 주둔지', 9, 8, 14, 12, '#8a8f9c', '연병장과 막사. 야생으로 통하는 군 통문이 있다.'),
]

// 야생 필드 맵은 라벨 구역을 두지 않고 맵 이름/배경으로 표시한다.
const NO_ZONES: ZoneDef[] = []

export const MAPS: Record<MapId, GameMap> = {
  village: {
    id: 'village',
    name: '아르피아 마법학교 마을',
    kind: 'town',
    grid: { w: 14, h: 12 },
    bg: 'school',
    zones: VILLAGE_ZONES,
    spawn: { x: 7, y: 4 },
    respawn: { x: 2.6, y: 9.4 },
    portals: [
      { id: 'gate-forest', cell: { x: 12.5, y: 11 }, to: 'forest', label: '숲', kind: 'gate' },
      { id: 'gate-sea', cell: { x: 12.5, y: 11 }, to: 'sea', label: '바다', kind: 'gate', requiredLevel: 3 },
      { id: 'gate-ruins', cell: { x: 12.5, y: 11 }, to: 'ruins', label: '폐허', kind: 'gate', requiredLevel: 10 },
      { id: 'gate-volcano', cell: { x: 12.5, y: 11 }, to: 'volcano', label: '화산지대', kind: 'gate', requiredLevel: 20 },
    ],
  },

  // ── 숲 계열 ───────────────────────────────────────────────────────────────
  forest: {
    id: 'forest',
    name: '위습 숲',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'forest',
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    recommendedLevel: 2,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'forest-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 12.5, y: 9.8 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'forest-cave', cell: { x: 2, y: 1.6 }, to: 'cave', label: '동굴 입구', kind: 'portal' },
      { id: 'forest-swamp', cell: { x: 10, y: 1.6 }, to: 'swamp', label: '안개 늪지', kind: 'portal', requiredLevel: 5 },
    ],
  },
  cave: {
    id: 'cave',
    name: '이끼 동굴',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'cave',
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    recommendedLevel: 6,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'cave-exit', cell: { x: 5, y: 7.4 }, to: 'forest', toSpawn: { x: 2, y: 2.6 }, label: '숲으로', kind: 'exit' },
      { id: 'cave-mine', cell: { x: 2, y: 1.4 }, to: 'mine', label: '폐광산 갱도', kind: 'portal', requiredLevel: 10 },
    ],
  },
  mine: {
    id: 'mine',
    name: '폐광산',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'mine',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 10,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'mine-exit', cell: { x: 5, y: 7.4 }, to: 'cave', toSpawn: { x: 2, y: 2.4 }, label: '동굴로', kind: 'exit' },
    ],
  },
  swamp: {
    id: 'swamp',
    name: '안개 늪지',
    kind: 'field',
    grid: { w: 10, h: 10 },
    bg: 'swamp',
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    recommendedLevel: 5,
    spawn: { x: 5, y: 8.6 },
    portals: [
      { id: 'swamp-exit', cell: { x: 5, y: 9.4 }, to: 'forest', toSpawn: { x: 10, y: 2.6 }, label: '숲으로', kind: 'exit' },
    ],
  },

  // ── 바다 계열 ─────────────────────────────────────────────────────────────
  sea: {
    id: 'sea',
    name: '가나폴리 해안',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'sea',
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    recommendedLevel: 3,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'sea-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 12.5, y: 9.8 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'sea-deepsea', cell: { x: 2, y: 1.6 }, to: 'deepsea', label: '심해로', kind: 'portal', requiredLevel: 9 },
      { id: 'sea-atlantis', cell: { x: 10, y: 1.6 }, to: 'atlantis', label: '아틀란티스 마을', kind: 'portal' },
    ],
  },
  deepsea: {
    id: 'deepsea',
    name: '심해',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'deepsea',
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    recommendedLevel: 9,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'deepsea-exit', cell: { x: 5, y: 7.4 }, to: 'sea', toSpawn: { x: 2, y: 2.6 }, label: '해안으로', kind: 'exit' },
    ],
  },
  atlantis: {
    id: 'atlantis',
    name: '아틀란티스 마을',
    kind: 'town',
    grid: { w: 10, h: 8 },
    bg: 'atlantis',
    zones: [
      z('z-atlantis', 'atlantis', '아틀란티스 마을', 0, 0, 10, 8, '#2f86c0', '심해 아래 잠든 수중 도시. 주민 NPC는 준비 중.'),
    ],
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'atlantis-exit', cell: { x: 5, y: 7.4 }, to: 'sea', toSpawn: { x: 10, y: 2.6 }, label: '해안으로', kind: 'exit' },
    ],
  },

  // ── 폐허 계열 ─────────────────────────────────────────────────────────────
  ruins: {
    id: 'ruins',
    name: '아즈카의 폐허',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'ruins',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 10,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'ruins-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 12.5, y: 9.8 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'ruins-graveyard', cell: { x: 2, y: 1.6 }, to: 'graveyard', label: '버려진 묘지', kind: 'portal', requiredLevel: 13 },
      { id: 'ruins-temple', cell: { x: 10, y: 1.6 }, to: 'temple-ruin', label: '고대 신전', kind: 'portal', requiredLevel: 18 },
    ],
  },
  graveyard: {
    id: 'graveyard',
    name: '버려진 묘지',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'graveyard',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 13,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'graveyard-exit', cell: { x: 5, y: 7.4 }, to: 'ruins', toSpawn: { x: 2, y: 2.6 }, label: '폐허로', kind: 'exit' },
    ],
  },
  'temple-ruin': {
    id: 'temple-ruin',
    name: '고대 신전',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'temple',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 18,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'temple-ruin-exit', cell: { x: 5, y: 7.4 }, to: 'ruins', toSpawn: { x: 10, y: 2.6 }, label: '폐허로', kind: 'exit' },
    ],
  },

  // ── 화산 계열 ─────────────────────────────────────────────────────────────
  volcano: {
    id: 'volcano',
    name: '화산지대',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'volcano',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 20,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'volcano-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 12.5, y: 9.8 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'volcano-demon-village', cell: { x: 2, y: 1.6 }, to: 'demon-village', label: '마족 마을', kind: 'portal', requiredLevel: 25 },
      { id: 'volcano-demon-castle', cell: { x: 10, y: 1.6 }, to: 'demon-castle', label: '마왕성', kind: 'portal', requiredLevel: 32 },
    ],
  },
  'demon-village': {
    id: 'demon-village',
    name: '마족 마을',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'demon',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 25,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'demon-village-exit', cell: { x: 5, y: 7.4 }, to: 'volcano', toSpawn: { x: 2, y: 2.6 }, label: '화산지대로', kind: 'exit' },
    ],
  },
  'demon-castle': {
    id: 'demon-castle',
    name: '마왕성',
    kind: 'field',
    grid: { w: 10, h: 8 },
    bg: 'demon',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 32,
    spawn: { x: 5, y: 6.6 },
    portals: [
      { id: 'demon-castle-exit', cell: { x: 5, y: 7.4 }, to: 'volcano', toSpawn: { x: 10, y: 2.6 }, label: '화산지대로', kind: 'exit' },
    ],
  },
}

export const VILLAGE_MAP_ID: MapId = 'village'

export function mapById(id: MapId): GameMap {
  return MAPS[id]
}

/** 현재 맵 기준으로 좌표가 속한 라벨 구역 */
export function zoneAt(map: GameMap, x: number, y: number): ZoneDef | null {
  for (const zone of map.zones) {
    const c = zone.cell
    if (x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1) return zone
  }
  return null
}

export function zoneKindAt(map: GameMap, x: number, y: number): ZoneKind {
  return zoneAt(map, x, y)?.kind ?? (map.bg as ZoneKind) ?? 'field'
}

/** 좌표를 맵 경계 안으로 clamp */
export function clampToMap(map: GameMap, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0.2, Math.min(map.grid.w - 0.2, x)),
    y: Math.max(0.2, Math.min(map.grid.h - 0.2, y)),
  }
}
