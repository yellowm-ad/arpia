import type { GameMap, MapId, ZoneDef, ZoneKind } from '@/lib/types'
import type { PropDef, TileKind } from '@/lib/iso'
import { propAABB } from '@/lib/iso'

type Blocker = { x0: number; y0: number; x1: number; y1: number }

/** solid 프롭들의 충돌 사각형을 그림(footprint)에서 그대로 산출 → "보이는 것 = 막히는 것" */
function buildBlockers(props: PropDef[], extra: Blocker[] = []): Blocker[] {
  const out: Blocker[] = [...extra]
  for (const p of props) {
    if (!p.solid) continue
    const a = propAABB(p)
    if (a) out.push(a)
  }
  return out
}

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
const FOUNTAIN = { x: 11, y: 3.4 }
const COLOSSEUM = { x: 11, y: 9.8 }

// 대로 축(지구 경계) — 폭을 예전 0.8 → ~1.8셀로 확장
const AV_L = { a: 7.0, b: 8.8 } // 세로 대로 (마법동/광장 사이)
const AV_R = { a: 13.1, b: 14.9 } // 세로 대로 (광장/상점가 사이)
const ST_N = { a: 6.4, b: 8.1 } // 가로 대로 (북측 지구 경계)
const ST_S = { a: 13.0, b: 14.7 } // 가로 대로 (남측 지구 경계)
const between = (v: number, r: { a: number; b: number }) => v > r.a && v < r.b

/** 마을 지면 타일 */
function villageTileAt(x: number, y: number): TileKind {
  // 외곽 순환 보도 (1.4셀 폭)
  if (x < 1.4 || x > VW - 1.4 || y < 1.4 || y > VH - 1.4) return 'path'
  // 콜로세움 모래 바닥 (구조물 반경과 맞춤)
  if (Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y) < 3.0) return 'sand'
  // 분수 중앙 광장 (세로로 약간 눌린 타원 포석)
  const df = Math.hypot(x - FOUNTAIN.x, (y - FOUNTAIN.y) * 1.12)
  if (df < 4.3) return 'plaza'
  // 농가 밭이랑
  if (x > 8.5 && x < 13.5 && y > 15.8 && y < 19.1) return 'field'
  // 대로 십자 (지구 경계, 넓게)
  if (between(x, AV_L) || between(x, AV_R) || between(y, ST_N) || between(y, ST_S)) return 'path'
  // 광장 → 사방 진입로 (폭 1.6)
  if (Math.abs(x - FOUNTAIN.x) < 1.6 && y > 1.0 && y < ST_N.b) return 'path' // 남북 축
  if (Math.abs(y - FOUNTAIN.y) < 1.5 && x > 1.0 && x < AV_R.b) return 'path' // 동서 축
  // 상점가 중앙 아케이드 통로
  if (x > AV_R.a && x < VW - 1.4 && Math.abs(y - 9.2) < 0.9) return 'path'
  // 신전 진입로 (외곽 보도 → 신전 앞)
  if (Math.abs(x - 5.4) < 0.9 && y > ST_S.a) return 'path'
  // 주둔지 연병장 진입로 (가로 대로 → 통문)
  if (Math.abs(x - 19.5) < 1.1 && y > ST_S.a) return 'path'
  // 공원 잔디(짙게)
  if (x > 8.6 && x < 13.4 && y > ST_S.b && y < 16.0) return 'grass-dark'
  // 나머지 잔디 — 드문 얼룩만
  return (Math.floor(x) * 7 + Math.floor(y) * 13) % 5 === 0 ? 'grass-dark' : 'grass'
}

// 충돌·정렬을 그림에서 그대로 뽑는 구조물 종류
const SOLID_KINDS = new Set<PropDef['kind']>([
  'hall', 'cottage', 'shop', 'dome', 'barn', 'windmill', 'colosseum', 'fountain', 'tower', 'wall',
])
// 앵커가 footprint 중심인 원형 구조물 (z정렬·충돌 모두 중심 기준)
const RADIAL_KINDS = new Set<PropDef['kind']>(['colosseum', 'fountain'])

// ── Phase 2 라스터 소품 세트 (PixelLab 생성 → 축소·트림 완료) ──
// px = 파일 실제 픽셀, anchor = 파일 좌상단 기준 발밑 오프셋
const PROP_SPRITE: Partial<
  Record<PropDef['kind'], { sprite: string; px: { w: number; h: number }; anchor: { x: number; y: number } }>
> = {
  lamp: { sprite: '/images/map/props/lamp.png', px: { w: 14, h: 72 }, anchor: { x: 7, y: 72 } },
  bench: { sprite: '/images/map/props/bench.png', px: { w: 44, h: 30 }, anchor: { x: 22, y: 30 } },
  banner: { sprite: '/images/map/props/banner.png', px: { w: 23, h: 66 }, anchor: { x: 12, y: 66 } },
  postbox: { sprite: '/images/map/props/postbox.png', px: { w: 16, h: 42 }, anchor: { x: 8, y: 42 } },
  bicycle: { sprite: '/images/map/props/bicycle.png', px: { w: 39, h: 40 }, anchor: { x: 20, y: 40 } },
  trashbin: { sprite: '/images/map/props/trashbin.png', px: { w: 16, h: 30 }, anchor: { x: 8, y: 30 } },
}

/** 마을 오브젝트 배치 — 모든 좌표는 격자(0..VW, 0..VH) 안에 있고 대로를 침범하지 않는다 */
function villageProps(): PropDef[] {
  const P: PropDef[] = []
  // ── 학교 3동 (서측 열, 세로 대로 AV_L 왼쪽) ──
  P.push({ id: 'b-magic', kind: 'hall', cell: { x: 1.8, y: 1.7 }, size: { w: 4.6, d: 3.0 }, label: '마법동' })
  P.push({ id: 'b-alch', kind: 'hall', cell: { x: 0.8, y: 8.4 }, size: { w: 2.7, d: 2.2 }, label: '연금술동' })
  P.push({ id: 'b-arti', kind: 'hall', cell: { x: 0.8, y: 10.8 }, size: { w: 2.7, d: 2.1 }, label: '마도구동' })
  // ── 기숙사 (dorm 지구: x4~6.6, y8.2~13.2) ──
  P.push({ id: 'b-dorm1', kind: 'cottage', cell: { x: 4.7, y: 8.3 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-dorm2', kind: 'cottage', cell: { x: 4.7, y: 10.2 }, size: { w: 1.6, d: 1.4 }, variant: 'teal' })
  P.push({ id: 'b-dorm3', kind: 'cottage', cell: { x: 4.7, y: 12.0 }, size: { w: 1.6, d: 1.3 }, variant: 'slate' })
  // ── 하우징 마을 (북동 지구: x15.4~24.4, y1.6~5.6) ──
  const houseSpots: [number, number, string][] = [
    [15.6, 1.7, 'red'], [18.2, 1.6, 'slate'], [20.8, 1.8, 'teal'], [22.8, 1.7, 'red'],
    [16.3, 4.0, 'slate'], [19.1, 3.8, 'red'], [21.9, 4.0, 'teal'],
  ]
  houseSpots.forEach(([x, y, v], i) =>
    P.push({ id: `b-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: 1.6, d: 1.4 }, variant: v }),
  )
  // ── 중앙 분수 (앵커 = 중심) ──
  P.push({
    id: 'b-fountain', kind: 'fountain', cell: { x: FOUNTAIN.x, y: FOUNTAIN.y },
    size: { w: 1.8, d: 1.8 }, collide: { w: 3.0, d: 3.0 },
  })
  // ── 콜로세움 (앵커 = 중심, 관중석까지 충돌) ──
  P.push({
    id: 'b-colosseum', kind: 'colosseum', cell: { x: COLOSSEUM.x, y: COLOSSEUM.y },
    size: { w: 3.4, d: 3.4 }, collide: { w: 5.6, d: 5.2 }, label: '수련의 광장',
  })
  // ── 상점가 (AV_R 오른쪽) ──
  P.push({ id: 'b-shop', kind: 'shop', cell: { x: 15.3, y: 7.7 }, size: { w: 3.0, d: 2.3 } })
  const stalls: [number, number, string][] = [
    [18.7, 7.6, '#c76153'], [20.6, 10.6, '#4f9b93'], [22.5, 7.7, '#c58f42'], [23.7, 10.9, '#6b6a9c'],
  ]
  stalls.forEach(([x, y, c], i) =>
    P.push({ id: `b-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.2, d: 1 }, variant: c }),
  )
  // ── 신전 (남서 지구) ──
  P.push({ id: 'b-temple', kind: 'dome', cell: { x: 1.0, y: 14.9 }, size: { w: 4.2, d: 3.4 }, label: '성역 신전' })
  // ── 농가 (남중 지구) ──
  P.push({ id: 'b-barn', kind: 'barn', cell: { x: 8.7, y: 15.1 }, size: { w: 2, d: 1.6 } })
  P.push({ id: 'b-mill', kind: 'windmill', cell: { x: 11.7, y: 15.1 }, size: { w: 1.3, d: 1.1 } })
  // ── 주둔지 — 목책 사각 연병장 + 망루 + 막사 + 군 통문 ──
  const BX0 = 15.1, BX1 = 24.2, BY0 = 15.0, BY1 = 18.8
  P.push({ id: 'b-tw1', kind: 'tower', cell: { x: BX0, y: BY0 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw2', kind: 'tower', cell: { x: BX1, y: BY0 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw3', kind: 'tower', cell: { x: BX1, y: BY1 }, size: { w: 0.9, d: 0.9 } })
  P.push({ id: 'b-tw4', kind: 'tower', cell: { x: BX0, y: BY1 }, size: { w: 0.9, d: 0.9 } })
  // 북벽 (x축) — 가운데 마을 출입구
  P.push({ id: 'b-wN1', kind: 'wall', cell: { x: BX0 + 0.9, y: BY0 + 0.2 }, size: { w: 2.7, d: 0.5 }, facing: 'right' })
  P.push({ id: 'b-wN2', kind: 'wall', cell: { x: BX0 + 5.6, y: BY0 + 0.2 }, size: { w: 2.6, d: 0.5 }, facing: 'right' })
  // 남벽 (x축) — 가운데 군 통문 개구부
  P.push({ id: 'b-wS1', kind: 'wall', cell: { x: BX0 + 0.9, y: BY1 + 0.2 }, size: { w: 2.5, d: 0.5 }, facing: 'right' })
  P.push({ id: 'b-wS2', kind: 'wall', cell: { x: BX0 + 5.6, y: BY1 + 0.2 }, size: { w: 2.6, d: 0.5 }, facing: 'right' })
  // 서벽 / 동벽 (y축)
  P.push({ id: 'b-wW', kind: 'wall', cell: { x: BX0 + 0.2, y: BY0 + 0.9 }, size: { w: BY1 - BY0 - 0.9, d: 0.5 }, facing: 'left' })
  P.push({ id: 'b-wE', kind: 'wall', cell: { x: BX1 + 0.2, y: BY0 + 0.9 }, size: { w: BY1 - BY0 - 0.9, d: 0.5 }, facing: 'left' })
  P.push({ id: 'b-brk1', kind: 'cottage', cell: { x: 16.6, y: 15.9 }, size: { w: 1.6, d: 1.3 }, variant: 'slate' })
  P.push({ id: 'b-brk2', kind: 'cottage', cell: { x: 21.2, y: 15.9 }, size: { w: 1.6, d: 1.3 }, variant: 'slate' })
  P.push({ id: 'b-gate', kind: 'gate', cell: { x: 19.5, y: 18.9 }, size: { w: 2.2, d: 0.8 }, label: '군 통문' })
  // ── 나무 (길·광장·모래밭·건물 피해서, 단풍 섞어서) ──
  const trees: [number, number, string][] = [
    [2.2, 6.0, 'g'], [6.4, 6.0, 'a'], [6.2, 3.2, 'c'], [1.7, 3.7, 'o'],
    [16.0, 6.0, 'b'], [19.4, 6.0, 'g'], [23.4, 6.0, 'c'], [17.6, 2.6, 'a'], [23.4, 2.9, 'o'], [21.2, 6.0, 'b'],
    [3.9, 9.7, 'a'], [3.8, 12.5, 'g'], [6.6, 9.4, 'c'], [6.5, 12.6, 'o'],
    [9.0, 12.4, 'b'], [12.7, 12.4, 'c'], [6.9, 15.4, 'g'],
    [6.8, 16.4, 'a'], [7.0, 18.2, 'c'], [3.2, 17.0, 'g'], [3.4, 12.9, 'o'],
    [12.7, 15.4, 'b'], [24.0, 10.8, 'g'], [23.8, 12.3, 'c'], [12.6, 18.2, 'a'],
  ]
  trees.forEach(([x, y, v], i) => P.push({ id: `t${i}`, kind: 'tree', cell: { x, y }, variant: v }))
  // ── 낮은 관목 울타리 — 광장·공원 테두리 (대로 밖) ──
  const hedges: [number, number, number, 'left' | 'right'][] = [
    [8.9, 1.7, 4.2, 'right'], [8.9, 5.3, 4.2, 'right'],
    [8.9, 11.9, 4.4, 'right'], [8.9, 14.7, 4.4, 'right'],
  ]
  hedges.forEach(([x, y, w, f], i) =>
    P.push({ id: `hd${i}`, kind: 'hedge', cell: { x, y }, size: { w, d: 0.4 }, facing: f }),
  )
  // ── 가로등 (넓힌 대로변) ──
  const lamps: [number, number][] = [
    [6.9, 3], [6.9, 10.5], [6.9, 16.5], [8.9, 5.5], [8.9, 11.5],
    [13.0, 3], [13.0, 10.5], [13.0, 16.5], [15.0, 5.5], [15.0, 11.5],
    [11, 7.4], [17, 9.2], [5.4, 13.4], [19.5, 15.6],
  ]
  lamps.forEach(([x, y], i) => P.push({ id: `l${i}`, kind: 'lamp', cell: { x, y } }))
  // ── 광장 현수막 + 벤치 ──
  P.push({ id: 'bn1', kind: 'banner', cell: { x: 8.9, y: 1.7 }, variant: '#5b6bd6' })
  P.push({ id: 'bn2', kind: 'banner', cell: { x: 13.0, y: 1.7 }, variant: '#c58f42' })
  P.push({ id: 'be1', kind: 'bench', cell: { x: 9.4, y: 5.0 } })
  P.push({ id: 'be2', kind: 'bench', cell: { x: 12.6, y: 5.0 } })
  P.push({ id: 'be3', kind: 'bench', cell: { x: 11, y: 15.3 } })

  // ── 거리 소품 (우체통·자전거·쓰레기통) — 대로변·상점가에 흩뿌림 ──
  P.push({ id: 'pb1', kind: 'postbox', cell: { x: 7.7, y: 8.6 } })
  P.push({ id: 'pb2', kind: 'postbox', cell: { x: 14.2, y: 13.4 } })
  P.push({ id: 'bi1', kind: 'bicycle', cell: { x: 8.4, y: 3.4 } })
  P.push({ id: 'bi2', kind: 'bicycle', cell: { x: 15.4, y: 8.0 } })
  P.push({ id: 'bi3', kind: 'bicycle', cell: { x: 5.9, y: 12.0 } })
  P.push({ id: 'tb1', kind: 'trashbin', cell: { x: 13.2, y: 7.6 } })
  P.push({ id: 'tb2', kind: 'trashbin', cell: { x: 6.6, y: 16.0 } })
  P.push({ id: 'tb3', kind: 'trashbin', cell: { x: 17.4, y: 9.6 } })

  // 종류 기반 플래그 일괄 부여 (개별 push 에서 누락 방지)
  for (const p of P) {
    if (SOLID_KINDS.has(p.kind)) p.solid = true
    if (RADIAL_KINDS.has(p.kind)) p.radial = true
    const rs = PROP_SPRITE[p.kind]
    if (rs) {
      p.sprite = rs.sprite
      p.px = rs.px
      p.anchor = rs.anchor
    }
  }
  return P
}

const VILLAGE_PROPS = villageProps()
// 블로커 = solid 프롭들의 footprint 에서 자동 생성 → 보이는 벽 = 막히는 벽
const VILLAGE_BLOCKERS = buildBlockers(VILLAGE_PROPS)

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
    assets: 'raster', // Phase 2 테스트: 가로등만 PNG, 나머지는 sprite 없어 SVG 폴백
    tileAt: villageTileAt,
    props: VILLAGE_PROPS,
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
