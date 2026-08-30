import type { GameMap, MapId, ZoneDef, ZoneKind } from '@/lib/types'
import type { PropDef, TileKind } from '@/lib/iso'

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

// ── 메인 마을 (26 × 20) — 아이소메트릭 도트 엔진 ────────────────────────────
// 3×3 지구: [학교·광장·하우징] / [연금·마도·기숙사 · 콜로세움·공원 · 상점가] / [신전 · 농가 · 주둔지]
const VILLAGE_ZONES: ZoneDef[] = [
  z('z-magic-hall', 'school', '마법동', 0, 0, 8, 7, '#5b6bd6', '전직을 담당하는 미르엘 교수와 도서관이 있는 첨탑 본관.'),
  z('z-quad', 'plaza', '중앙 광장', 8, 0, 14, 7, '#8891b5', '분수가 있는 학교 부지 한가운데 광장. 사방으로 길이 통한다.'),
  z('z-housing', 'village', '하우징 마을', 14, 0, 26, 7, '#6fae5d', '지붕색이 제각각인 저층 주거 블록. 하우징은 준비 중.'),
  z('z-alchemy-hall', 'school', '연금술동', 0, 7, 4, 11, '#4a8f7a', '연금술과 마법약을 연구하는 실습동.'),
  z('z-artifact-hall', 'school', '마도구동', 0, 11, 4, 14, '#7a6bc0', '마도구와 마법 공학을 다루는 공방동.'),
  z('z-dorm', 'village', '기숙사 마을', 4, 7, 8, 14, '#5a9a6a', '견습생 기숙사 구역.'),
  z('z-plaza', 'colosseum', '수련의 광장', 8, 7, 14, 12, '#c9622b', '콜로세움. 파티 단위 대전이 준비 중이다.'),
  z('z-park', 'park', '마로니에 공원', 8, 12, 14, 14, '#4e9c4a', '콜로세움과 농가 사이의 녹지 완충대.'),
  z('z-shops', 'shopStreet', '별빛 상점가', 14, 7, 26, 14, '#d9a441', '차양 천막이 늘어선 무기·물약·도구 상인과 펫 조련사의 상가.'),
  z('z-temple', 'temple', '성역 신전', 0, 14, 8, 20, '#d8c98a', '돔과 정원이 있는 신관·성녀의 성역.'),
  z('z-farm', 'farm', '햇살 농가', 8, 14, 14, 20, '#c9a44a', '밭이랑과 헛간이 있는 농가. 농사·펫 농장은 준비 중.'),
  z('z-barracks', 'military', '통문 주둔지', 14, 14, 26, 20, '#8a8f9c', '목책과 연병장. 야생으로 통하는 군 통문이 있다.'),
]

const VW = 26
const VH = 20
const FOUNTAIN = { x: 11, y: 3.2 }
const COLOSSEUM = { x: 11, y: 9.6 }

/** 마을 지면 타일 */
function villageTileAt(x: number, y: number): TileKind {
  // 맵 밖 여백
  if (x < 0.5 || x > VW - 0.5 || y < 0.5 || y > VH - 0.5) return 'path'
  // 콜로세움 모래 바닥
  const dc = Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y)
  if (dc < 2.4) return 'sand'
  // 분수 광장 포석
  const df = Math.hypot(x - FOUNTAIN.x, y - FOUNTAIN.y)
  if (df < 3.4) return 'plaza'
  // 농가 밭
  if (x > 8.4 && x < 13.6 && y > 16.3 && y < 19.4) return 'field'
  // 대로 (십자 + 지구 경계)
  const onV = (x > 7.2 && x < 8.0) || (x > 13.4 && x < 14.0)
  const onH = (y > 6.5 && y < 7.2) || (y > 13.4 && y < 14.0)
  if (onV || onH) return 'path'
  // 공원 잔디(짙게)
  if (x > 8 && x < 14 && y > 12 && y < 14) return 'grass-dark'
  // 나머지 잔디 — 드문 얼룩만
  return (Math.floor(x) * 7 + Math.floor(y) * 13) % 5 === 0 ? 'grass-dark' : 'grass'
}

/** 마을 오브젝트 배치 */
function villageProps(): PropDef[] {
  const P: PropDef[] = []
  // 학교 3동
  P.push({ id: 'b-magic', kind: 'hall', cell: { x: 1.8, y: 1.6 }, size: { w: 4.6, d: 3.2 }, label: '마법동' })
  P.push({ id: 'b-alch', kind: 'hall', cell: { x: 0.7, y: 7.7 }, size: { w: 2.8, d: 2.4 }, label: '연금술동' })
  P.push({ id: 'b-arti', kind: 'hall', cell: { x: 0.7, y: 11.2 }, size: { w: 2.8, d: 2.2 }, label: '마도구동' })
  // 기숙사
  P.push({ id: 'b-dorm1', kind: 'cottage', cell: { x: 4.8, y: 7.8 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-dorm2', kind: 'cottage', cell: { x: 4.8, y: 10.6 }, size: { w: 1.6, d: 1.4 }, variant: 'teal' })
  P.push({ id: 'b-dorm3', kind: 'cottage', cell: { x: 6.0, y: 12.4 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  // 하우징 마을 (제각각 지붕색)
  const houseSpots: [number, number, string][] = [
    [15.5, 1.0, 'red'], [18.5, 0.8, 'slate'], [21.5, 1.2, 'teal'], [24.0, 1.6, 'red'],
    [16.5, 3.8, 'slate'], [19.8, 3.5, 'red'], [22.8, 4.0, 'teal'], [24.6, 5.2, 'slate'],
  ]
  houseSpots.forEach(([x, y, v], i) => P.push({ id: `b-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: 1.6, d: 1.4 }, variant: v }))
  // 중앙 분수
  P.push({ id: 'b-fountain', kind: 'fountain', cell: { x: FOUNTAIN.x - 0.9, y: FOUNTAIN.y - 0.9 }, size: { w: 1.8, d: 1.8 } })
  // 콜로세움
  P.push({ id: 'b-colosseum', kind: 'colosseum', cell: { x: COLOSSEUM.x, y: COLOSSEUM.y }, size: { w: 3.4, d: 3.4 }, label: '수련의 광장' })
  // 상점가
  P.push({ id: 'b-shop', kind: 'shop', cell: { x: 14.6, y: 7.6 }, size: { w: 3.2, d: 2.4 } })
  const stalls: [number, number, string][] = [
    [19.0, 8.4, '#c76153'], [20.8, 10.2, '#4f9b93'], [22.4, 8.6, '#c58f42'], [23.6, 10.8, '#6b6a9c'],
  ]
  stalls.forEach(([x, y, c], i) => P.push({ id: `b-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.2, d: 1 }, variant: c }))
  // 신전
  P.push({ id: 'b-temple', kind: 'dome', cell: { x: 1.0, y: 14.6 }, size: { w: 4.4, d: 3.6 }, label: '성역 신전' })
  // 농가
  P.push({ id: 'b-barn', kind: 'barn', cell: { x: 8.8, y: 14.8 }, size: { w: 2, d: 1.6 } })
  P.push({ id: 'b-mill', kind: 'windmill', cell: { x: 11.6, y: 14.8 }, size: { w: 1.3, d: 1.1 } })
  // 주둔지 — 목책으로 둘러싼 사각 연병장 + 망루 + 막사 + 군 통문
  const BX0 = 14.8, BX1 = 24.8, BY0 = 14.8, BY1 = 18.9
  P.push({ id: 'b-tw1', kind: 'tower', cell: { x: BX0, y: BY0 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw2', kind: 'tower', cell: { x: BX1, y: BY0 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw3', kind: 'tower', cell: { x: BX1, y: BY1 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw4', kind: 'tower', cell: { x: BX0, y: BY1 }, size: { w: 0.9, d: 0.9 } })
  // 북벽 (x축) — 가운데 마을 출입구
  P.push({ id: 'b-wN1', kind: 'wall', cell: { x: BX0 + 0.9, y: BY0 + 0.2 }, size: { w: 3.0, d: 0.5 }, facing: 'right' })
  P.push({ id: 'b-wN2', kind: 'wall', cell: { x: BX0 + 6.1, y: BY0 + 0.2 }, size: { w: 2.8, d: 0.5 }, facing: 'right' })
  // 남벽 (x축) — 가운데 군 통문 개구부
  P.push({ id: 'b-wS1', kind: 'wall', cell: { x: BX0 + 0.9, y: BY1 + 0.2 }, size: { w: 2.7, d: 0.5 }, facing: 'right' })
  P.push({ id: 'b-wS2', kind: 'wall', cell: { x: BX0 + 6.1, y: BY1 + 0.2 }, size: { w: 2.8, d: 0.5 }, facing: 'right' })
  // 서벽 / 동벽 (y축)
  P.push({ id: 'b-wW', kind: 'wall', cell: { x: BX0 + 0.2, y: BY0 + 0.9 }, size: { w: BY1 - BY0 - 0.9, d: 0.5 }, facing: 'left' })
  P.push({ id: 'b-wE', kind: 'wall', cell: { x: BX1 + 0.2, y: BY0 + 0.9 }, size: { w: BY1 - BY0 - 0.9, d: 0.5 }, facing: 'left' })
  P.push({ id: 'b-brk1', kind: 'cottage', cell: { x: 16.4, y: 15.6 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-brk2', kind: 'cottage', cell: { x: 21.6, y: 15.8 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-gate', kind: 'gate', cell: { x: 18.6, y: 19.0 }, size: { w: 2.2, d: 0.8 }, label: '군 통문' })
  // 자연물 — 나무 (길·광장·모래밭 피해서 정원 가장자리에만, 단풍 섞어서)
  const trees: [number, number, string][] = [
    [2.0, 6.0, 'g'], [5.6, 6.2, 'a'], [6.7, 3.0, 'c'], [1.2, 3.4, 'o'],
    [15.6, 5.9, 'b'], [20.0, 6.1, 'g'], [23.6, 6.0, 'c'], [17.4, 2.4, 'a'], [24.6, 2.8, 'o'], [21.0, 4.4, 'b'],
    [3.1, 10.0, 'a'], [3.3, 12.8, 'g'], [6.7, 9.3, 'c'], [6.5, 12.7, 'o'],
    [9.1, 12.6, 'b'], [12.7, 12.6, 'c'], [10.9, 13.5, 'g'],
    [6.1, 15.6, 'a'], [6.7, 18.3, 'c'], [3.0, 16.6, 'g'], [4.4, 13.2, 'o'],
    [13.3, 15.1, 'b'], [24.6, 8.6, 'g'], [24.8, 12.6, 'c'], [13.4, 18.4, 'a'],
  ]
  trees.forEach(([x, y, v], i) => P.push({ id: `t${i}`, kind: 'tree', cell: { x, y }, variant: v }))
  // 낮은 관목 울타리 — 광장·분수 정원 테두리
  const hedges: [number, number, number, 'left' | 'right'][] = [
    [8.4, 1.6, 2.4, 'right'], [13.6, 1.6, 2.4, 'right'],
    [8.2, 5.2, 5.6, 'right'],
    [8.4, 7.8, 5.4, 'right'], [8.6, 11.4, 5.0, 'right'],
  ]
  hedges.forEach(([x, y, w, f], i) => P.push({ id: `hd${i}`, kind: 'hedge', cell: { x, y }, size: { w, d: 0.4 }, facing: f }))
  // 가로등 (대로변)
  const lamps: [number, number][] = [
    [7.6, 4], [7.6, 11], [7.6, 17], [13.7, 4], [13.7, 11], [13.7, 17],
    [11, 6.8], [18, 6.8], [4, 13.7], [20, 13.7],
  ]
  lamps.forEach(([x, y], i) => P.push({ id: `l${i}`, kind: 'lamp', cell: { x, y } }))
  // 광장 현수막 + 벤치
  P.push({ id: 'bn1', kind: 'banner', cell: { x: 8.6, y: 0.9 }, variant: '#5b6bd6' })
  P.push({ id: 'bn2', kind: 'banner', cell: { x: 13.4, y: 0.9 }, variant: '#c58f42' })
  P.push({ id: 'be1', kind: 'bench', cell: { x: 9.3, y: 5.2 } })
  P.push({ id: 'be2', kind: 'bench', cell: { x: 12.7, y: 5.2 } })
  P.push({ id: 'be3', kind: 'bench', cell: { x: 11, y: 13.2 } })
  return P
}

const VILLAGE_BLOCKERS = [
  { x0: 1.2, y0: 1.0, x1: 7.6, y1: 5.4 }, // 마법동
  { x0: 0.5, y0: 7.4, x1: 3.8, y1: 10.4 }, // 연금술동
  { x0: 0.5, y0: 11.0, x1: 3.8, y1: 13.8 }, // 마도구동
  { x0: 4.6, y0: 7.6, x1: 6.6, y1: 9.4 }, // 기숙사1
  { x0: 4.6, y0: 10.4, x1: 6.6, y1: 12.2 }, // 기숙사2
  { x0: 5.8, y0: 12.2, x1: 7.8, y1: 14.0 }, // 기숙사3
  { x0: 9.6, y0: 1.6, x1: 12.6, y1: 4.8 }, // 분수
  { x0: 14.4, y0: 7.4, x1: 18.0, y1: 10.2 }, // 상점 건물
  { x0: 0.8, y0: 14.4, x1: 5.6, y1: 18.4 }, // 신전
  { x0: 8.6, y0: 14.6, x1: 10.9, y1: 16.5 }, // 헛간
  { x0: 11.5, y0: 14.6, x1: 13.0, y1: 15.9 }, // 풍차
  // 주둔지 목책 (북·남은 가운데 개구부)
  { x0: 14.5, y0: 14.5, x1: 15.4, y1: 19.3 }, // 서벽
  { x0: 24.5, y0: 14.5, x1: 25.4, y1: 19.3 }, // 동벽
  { x0: 15.5, y0: 14.5, x1: 18.7, y1: 15.4 }, // 북벽 좌
  { x0: 20.9, y0: 14.5, x1: 24.5, y1: 15.4 }, // 북벽 우
  { x0: 15.5, y0: 18.6, x1: 18.3, y1: 19.4 }, // 남벽 좌
  { x0: 20.9, y0: 18.6, x1: 24.5, y1: 19.4 }, // 남벽 우
  { x0: 16.3, y0: 15.4, x1: 18.1, y1: 17.1 }, // 막사 A
  { x0: 21.5, y0: 15.6, x1: 23.3, y1: 17.3 }, // 막사 B
  // 하우징 주택들
  { x0: 15.3, y0: 0.8, x1: 17.3, y1: 2.6 },
  { x0: 18.3, y0: 0.6, x1: 20.3, y1: 2.4 },
  { x0: 21.3, y0: 1.0, x1: 23.3, y1: 2.8 },
  { x0: 23.8, y0: 1.4, x1: 25.8, y1: 3.2 },
  { x0: 16.3, y0: 3.6, x1: 18.3, y1: 5.4 },
  { x0: 19.6, y0: 3.3, x1: 21.6, y1: 5.1 },
  { x0: 22.6, y0: 3.8, x1: 24.6, y1: 5.6 },
]

// 야생 필드 맵은 라벨 구역을 두지 않고 맵 이름/배경으로 표시한다.
const NO_ZONES: ZoneDef[] = []

export const MAPS: Record<MapId, GameMap> = {
  village: {
    id: 'village',
    name: '아르피아 마법학교 마을',
    kind: 'town',
    grid: { w: VW, h: VH },
    bg: 'school',
    render: 'iso',
    tileAt: villageTileAt,
    props: villageProps(),
    zones: VILLAGE_ZONES,
    blockers: VILLAGE_BLOCKERS,
    spawn: { x: 11, y: 6.2 },
    respawn: { x: 6.4, y: 15.0 },
    portals: [
      { id: 'gate-forest', cell: { x: 19.5, y: 18.6 }, to: 'forest', label: '숲', kind: 'gate' },
      { id: 'gate-sea', cell: { x: 19.5, y: 18.6 }, to: 'sea', label: '바다', kind: 'gate', requiredLevel: 3 },
      { id: 'gate-ruins', cell: { x: 19.5, y: 18.6 }, to: 'ruins', label: '폐허', kind: 'gate', requiredLevel: 10 },
      { id: 'gate-volcano', cell: { x: 19.5, y: 18.6 }, to: 'volcano', label: '화산지대', kind: 'gate', requiredLevel: 20 },
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
      { id: 'forest-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 19.5, y: 17.4 }, label: '마을로 돌아가기', kind: 'exit' },
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
      { id: 'sea-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 19.5, y: 17.4 }, label: '마을로 돌아가기', kind: 'exit' },
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
      { id: 'ruins-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 19.5, y: 17.4 }, label: '마을로 돌아가기', kind: 'exit' },
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
      { id: 'volcano-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 19.5, y: 17.4 }, label: '마을로 돌아가기', kind: 'exit' },
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
