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

// ── 메인 마을 (52 × 40) — 아이소메트릭 도트 엔진 ────────────────────────────
// 3×3 지구를 넓게: [학교 쿼드·중앙 광장·하우징] / [기숙사·콜로세움+공원·상점가]
//                 / [대성당 성역·햇살 농가·통문 주둔지]
// 대로는 폭 3셀, 외곽 순환로 2.5셀. 지구 사이는 넉넉한 녹지 완충.
const VILLAGE_ZONES: ZoneDef[] = [
  z('z-magic-hall', 'school', '학교 본교 쿼드', 2, 2, 17, 13, '#5b6bd6', '마법동·연금술동·마도구동이 안뜰을 둘러싼 본교. 시계탑과 대강당, 도서관 별관이 있다.'),
  z('z-quad', 'plaza', '중앙 대광장', 20, 2, 33, 13, '#8891b5', '분수와 동상이 선 마을 심장부. 사방으로 대로가 뻗는다.'),
  z('z-housing', 'village', '하우징 마을', 36, 2, 50, 13, '#6fae5d', '지붕색이 제각각인 저층 주거 블록과 뒷마당 정원.'),
  z('z-dorm', 'village', '기숙사 마을', 2, 16, 17, 25, '#5a9a6a', '견습생 기숙사와 공동 식당.'),
  z('z-plaza', 'colosseum', '수련의 투기장', 20, 16, 33, 25, '#c9622b', '계단식 관중석의 원형 투기장. 파티 대전이 준비 중이다.'),
  z('z-park', 'park', '마로니에 공원', 20, 25, 33, 28, '#4e9c4a', '투기장과 농가 사이의 녹지 완충대.'),
  z('z-shops', 'shopStreet', '별빛 상점가', 36, 16, 50, 25, '#d9a441', '길게 늘어선 상가 — 무기·물약·도구·펫, 시장 회관과 여관, 길드홀.'),
  z('z-temple', 'temple', '성역 대성당', 2, 27, 17, 38, '#d8c98a', '돔 대성당과 종탑·회랑·성직자 숙소가 앞광장을 감싼다.'),
  z('z-farm', 'farm', '햇살 농가', 20, 28, 33, 38, '#c9a44a', '너른 밭이랑과 헛간·풍차·농가.'),
  z('z-barracks', 'military', '통문 주둔지', 36, 27, 50, 38, '#8a8f9c', '성벽과 망루로 두른 주둔지. 웅장한 군 통문이 야생으로 통한다.'),
]

const VW = 52
const VH = 40
const FOUNTAIN = { x: 26.5, y: 7.5 }
const COLOSSEUM = { x: 26.5, y: 20.5 }
const TEMPLE_YARD = { x: 9.5, y: 32 } // 대성당 앞광장 중심

// 대로 축(지구 경계) — 폭 3셀
const AV_L = { a: 16.8, b: 19.8 } // 세로 대로 (학교/광장 사이)
const AV_R = { a: 32.8, b: 35.8 } // 세로 대로 (광장/상점가 사이)
const ST_N = { a: 12.8, b: 15.8 } // 가로 대로 (북측 지구 경계)
const ST_S = { a: 24.8, b: 27.8 } // 가로 대로 (남측 지구 경계)
const GATE_WAY = { a: 41.5, b: 45.5 } // 주둔지 의전 대로 (ST_S → 군 통문)
const between = (v: number, r: { a: number; b: number }) => v > r.a && v < r.b

/** 마을 지면 타일 */
function villageTileAt(x: number, y: number): TileKind {
  // 외곽 순환 보도 (2.5셀 폭)
  if (x < 2.5 || x > VW - 2.5 || y < 2.5 || y > VH - 2.5) return 'path'
  // 콜로세움 모래 바닥 (구조물 반경과 맞춤)
  if (Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y) < 5.6) return 'sand'
  // 중앙 대광장 (세로로 약간 눌린 타원 포석)
  const df = Math.hypot(x - FOUNTAIN.x, (y - FOUNTAIN.y) * 1.15)
  if (df < 7.4) return 'plaza'
  // 대성당 앞광장 포석
  if (Math.hypot((x - TEMPLE_YARD.x) * 1.1, y - TEMPLE_YARD.y) < 4.8) return 'plaza'
  // 농가 밭이랑 (공원에 자리 내주고 남쪽으로)
  if (x > 22.5 && x < 30.8 && y > 32.6 && y < 37.4) return 'field'
  // 대성당 앞광장 좌·우 대칭 반사 연못 (parterre d'eau)
  if (Math.hypot((x - 5.7) * 0.85, y - 33.4) < 1.5) return 'water'
  if (Math.hypot((x - 13.3) * 0.85, y - 33.4) < 1.5) return 'water'
  // 대로 격자 (지구 경계)
  if (between(x, AV_L) || between(x, AV_R) || between(y, ST_N) || between(y, ST_S)) return 'path'
  // 주둔지 의전 대로 (ST_S → 군 통문, 폭 4셀)
  if (between(x, GATE_WAY) && y > ST_S.a) return 'path'
  // 광장 → 사방 진입로 (폭 ~2.4)
  if (Math.abs(x - FOUNTAIN.x) < 2.4 && y > 2.0 && y < ST_N.b) return 'path'
  if (Math.abs(y - FOUNTAIN.y) < 2.2 && x > 2.0 && x < AV_R.b) return 'path'
  // 상점가 중앙 아케이드 통로 (동서)
  if (x > AV_R.a && x < VW - 2.5 && Math.abs(y - 20.5) < 1.5) return 'path'
  // 대성당 진입로 (외곽 순환로 → 앞광장)
  if (Math.abs(x - TEMPLE_YARD.x) < 1.5 && y > ST_S.a) return 'path'
  // 마로니에 공원 잔디(짙게) — 투기장 남측, 농가 위까지 넉넉히
  if (
    x > 19.8 && x < 33 && y > ST_S.b && y < 32.6 &&
    Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y) >= 5.6
  )
    return 'grass-dark'
  // 공원 산책로 (동서, 공원 한가운데)
  if (x > 19.8 && x < 33 && Math.abs(y - 29.9) < 0.7) return 'path'
  // 나머지 잔디 — 드문 얼룩만
  return (Math.floor(x) * 7 + Math.floor(y) * 13) % 5 === 0 ? 'grass-dark' : 'grass'
}

// 충돌·정렬을 그림에서 그대로 뽑는 구조물 종류
const SOLID_KINDS = new Set<PropDef['kind']>([
  'hall', 'cottage', 'shop', 'dome', 'barn', 'windmill', 'colosseum', 'fountain', 'tower', 'wall',
  'statue', 'gazebo', 'cloister',
])
// 앵커가 footprint 중심인 원형 구조물 (z정렬·충돌 모두 중심 기준)
const RADIAL_KINDS = new Set<PropDef['kind']>(['colosseum', 'fountain', 'statue', 'gazebo'])

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
  bush: { sprite: '/images/map/props/bush.png', px: { w: 28, h: 24 }, anchor: { x: 14, y: 24 } },
}

// 나무는 variant 별 스프라이트 — a/b/c 는 같은 초록나무의 소·중·대 프리스케일
const TREE_SPRITE: Record<string, { sprite: string; px: { w: number; h: number }; anchor: { x: number; y: number } }> = {
  b: { sprite: '/images/map/props/tree_green_sm.png', px: { w: 42, h: 48 }, anchor: { x: 21, y: 48 } },
  a: { sprite: '/images/map/props/tree_green_md.png', px: { w: 56, h: 64 }, anchor: { x: 28, y: 64 } },
  c: { sprite: '/images/map/props/tree_green_lg.png', px: { w: 70, h: 80 }, anchor: { x: 35, y: 80 } },
  g: { sprite: '/images/map/props/tree_gold.png', px: { w: 64, h: 70 }, anchor: { x: 32, y: 70 } },
  o: { sprite: '/images/map/props/tree_orange.png', px: { w: 56, h: 66 }, anchor: { x: 28, y: 66 } },
}

// 건물 라스터 스프라이트. anchor = 이미지 좌상단 기준, footprint 뒤쪽(격자 원점측) 꼭짓점 픽셀 위치.
type Rs = { sprite: string; px: { w: number; h: number }; anchor: { x: number; y: number } }
const B_ = (n: string, w: number, h: number, ax: number, ay: number): Rs => ({
  sprite: `/images/map/props/${n}.png`, px: { w, h }, anchor: { x: ax, y: ay },
})
// id 별 (개별 footprint)
const BUILDING_SPRITE: Record<string, Rs> = {
  'b-magic': B_('b_hall_magic', 259, 283, 130, 150),
  'b-alch': B_('b_hall_small', 157, 178, 79, 100),
  'b-arti': B_('b_hall_small', 157, 178, 79, 100),
  'b-auditorium': B_('b_hall_small', 157, 178, 79, 100),
  'b-library': B_('b_hall_small', 157, 178, 79, 100),
  'b-commons': B_('b_hall_small', 157, 178, 79, 100),
  'b-clock': B_('b_clocktower', 83, 195, 42, 153),
  'b-belltower': B_('b_belltower', 90, 236, 45, 191),
  'b-market': B_('b_market', 198, 175, 99, 76),
  'b-inn': B_('b_inn', 173, 197, 87, 111),
  'b-guild': B_('b_guildhall', 173, 204, 87, 118),
  'b-gate': B_('b_gate_grand', 192, 171, 96, 75),
  'b-stable': B_('b_stable', 141, 121, 71, 51),
  'b-barrack0': B_('b_barrack', 154, 117, 77, 40),
  'b-barrack1': B_('b_barrack', 154, 117, 77, 40),
  'b-statue': B_('b_statue', 86, 156, 43, 134),
  'b-statue-saint': B_('b_statue', 86, 156, 43, 134),
  'b-gazebo': B_('b_gazebo', 120, 143, 60, 114),
}
// kind 별 (동일 스프라이트 반복)
const KIND_BUILDING_SPRITE: Partial<Record<PropDef['kind'], Rs>> = {
  shop: B_('b_shop', 170, 171, 85, 86),
  stall: B_('b_stall', 70, 75, 35, 40),
  dome: B_('b_temple', 243, 232, 122, 110),
  barn: B_('b_barn', 115, 111, 58, 53),
  windmill: B_('b_windmill', 77, 134, 39, 96),
  tower: B_('b_tower', 58, 105, 29, 76),
  colosseum: B_('b_colosseum', 218, 149, 109, 89),
  fountain: B_('b_fountain', 115, 114, 58, 82),
  statue: B_('b_statue', 86, 156, 43, 134),
  gazebo: B_('b_gazebo', 120, 143, 60, 114),
  cloister: B_('b_cloister', 58, 44, 29, 44),
}
// 주택 지붕색 variant 별
const COTTAGE_SPRITE: Record<string, Rs> = {
  red: B_('b_cottage_red', 96, 111, 48, 63),
  slate: B_('b_cottage_slate', 96, 98, 48, 50),
  teal: B_('b_cottage_teal', 96, 115, 48, 67),
}
// 벤치 방향 variant (아이소 격자축 평행)
const BENCH_SPRITE: Record<string, Rs> = {
  l: B_('b_bench_l', 30, 30, 15, 30),
  r: B_('b_bench_r', 28, 30, 14, 30),
}
// 성벽 세그먼트 (타일링) — facing 별 축
const WALL_SPRITE: Record<'left' | 'right', Rs> = {
  right: B_('b_wall_se', 46, 40, 23, 40), // +x 축 (화면 우하)
  left: B_('b_wall_sw', 46, 40, 23, 40), // +y 축 (화면 좌하)
}

/** 마을 오브젝트 배치 — 모든 좌표는 격자(0..VW, 0..VH) 안에 있고 대로를 침범하지 않는다 */
function villageProps(): PropDef[] {
  const P: PropDef[] = []
  const TEMPLE_GARDEN: [number, number][] = [] // 대성당 앞광장 화단 좌표 — furniture 단계에서 배치
  // ════════ 학교 본교 쿼드 (x2–17, y2–13) — 안뜰을 건물이 둘러쌈 ════════
  P.push({ id: 'b-magic', kind: 'hall', cell: { x: 4.4, y: 2.8 }, size: { w: 5.0, d: 3.2 }, label: '마법동' })
  P.push({ id: 'b-alch', kind: 'hall', cell: { x: 2.6, y: 7.4 }, size: { w: 2.8, d: 2.6 }, label: '연금술동' })
  P.push({ id: 'b-arti', kind: 'hall', cell: { x: 2.6, y: 10.4 }, size: { w: 2.8, d: 2.4 }, label: '마도구동' })
  P.push({ id: 'b-auditorium', kind: 'hall', cell: { x: 13.0, y: 6.6 }, size: { w: 3.2, d: 3.0 }, label: '대강당' })
  P.push({ id: 'b-library', kind: 'hall', cell: { x: 6.6, y: 10.8 }, size: { w: 2.6, d: 1.8 }, label: '도서관 별관' })
  P.push({ id: 'b-clock', kind: 'tower', cell: { x: 13.6, y: 3.0 }, size: { w: 1.3, d: 1.3 }, label: '시계탑' })

  // ════════ 중앙 대광장 (x20–33, y2–13) ════════
  P.push({
    id: 'b-fountain', kind: 'fountain', cell: { x: FOUNTAIN.x, y: FOUNTAIN.y },
    size: { w: 2.8, d: 2.8 }, collide: { w: 4.2, d: 4.2 },
  })
  P.push({ id: 'b-statue', kind: 'statue', cell: { x: 21.5, y: 4.6 }, size: { w: 1.0, d: 1.0 }, label: '창립자 상' })
  P.push({ id: 'b-gazebo', kind: 'gazebo', cell: { x: 32.0, y: 10.8 }, size: { w: 1.8, d: 1.8 } })

  // ════════ 하우징 마을 (x36–50, y2–13) — 2줄 8동 ════════
  const houseVariants = ['red', 'slate', 'teal', 'red', 'slate', 'teal', 'red', 'slate']
  const houseSpots: [number, number][] = [
    [37.6, 3.0], [40.9, 3.0], [44.2, 3.0], [47.5, 3.0],
    [38.0, 7.6], [41.3, 7.6], [44.6, 7.6], [47.9, 7.6],
  ]
  houseSpots.forEach(([x, y], i) =>
    P.push({ id: `b-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: 1.6, d: 1.4 }, variant: houseVariants[i] }),
  )

  // ════════ 기숙사 마을 (x2–17, y16–25) — 2열 6동 + 공동 식당 ════════
  const dormVariants = ['slate', 'teal', 'slate', 'teal', 'slate', 'teal']
  const dormSpots: [number, number][] = [
    [4.4, 17.4], [4.4, 20.6], [4.4, 23.8],
    [8.6, 17.4], [8.6, 20.6], [8.6, 23.8],
  ]
  dormSpots.forEach(([x, y], i) =>
    P.push({ id: `b-dorm${i}`, kind: 'cottage', cell: { x, y }, size: { w: 1.6, d: 1.4 }, variant: dormVariants[i] }),
  )
  P.push({ id: 'b-commons', kind: 'hall', cell: { x: 12.4, y: 19.0 }, size: { w: 3.0, d: 2.4 }, label: '공동 식당' })

  // ════════ 수련의 투기장 (x20–33, y16–25) ════════
  P.push({
    id: 'b-colosseum', kind: 'colosseum', cell: { x: COLOSSEUM.x, y: COLOSSEUM.y },
    size: { w: 5.0, d: 5.0 }, collide: { w: 8.0, d: 7.6 }, label: '수련의 투기장',
  })

  // ════════ 별빛 상점가 (x36–50, y16–25) — 아케이드(y≈20.5) 양옆 상가 + 노점 ════════
  P.push({ id: 'b-shop', kind: 'shop', cell: { x: 37.4, y: 16.8 }, size: { w: 3.4, d: 2.6 }, label: '무기·물약 상가' })
  P.push({ id: 'b-market', kind: 'hall', cell: { x: 42.2, y: 16.6 }, size: { w: 3.4, d: 2.8 }, label: '시장 회관' })
  P.push({ id: 'b-guild', kind: 'hall', cell: { x: 46.6, y: 16.8 }, size: { w: 2.8, d: 2.6 }, label: '길드홀' })
  P.push({ id: 'b-inn', kind: 'hall', cell: { x: 37.6, y: 22.4 }, size: { w: 3.0, d: 2.4 }, label: '여관' })
  const stalls: [number, number, string][] = [
    [42.0, 19.0, '#c76153'], [44.6, 19.0, '#4f9b93'], [47.2, 19.0, '#c58f42'], [49.3, 19.0, '#6b6a9c'],
    [42.0, 22.2, '#6b6a9c'], [44.6, 22.2, '#c76153'], [47.2, 22.2, '#4f9b93'],
  ]
  stalls.forEach(([x, y, c], i) =>
    P.push({ id: `b-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.2, d: 1 }, variant: c }),
  )

  // ════════ 성역 대성당 (x2–17, y27–38) — 돔 + 종탑 + 회랑 + 숙소 + 앞광장 ════════
  P.push({ id: 'b-temple', kind: 'dome', cell: { x: 3.0, y: 27.8 }, size: { w: 4.8, d: 3.8 }, label: '성역 대성당' })
  P.push({ id: 'b-belltower', kind: 'tower', cell: { x: 13.4, y: 28.0 }, size: { w: 1.4, d: 1.4 }, label: '종탑' })
  // 회랑 — 앞광장 좌·우를 짧게 감싸는 콜로네이드 (돔 옆 3칸씩)
  for (let i = 0; i < 4; i++) {
    P.push({ id: `b-cloW${i}`, kind: 'cloister', cell: { x: 3.4, y: 28.6 + i * 0.95 }, size: { w: 0.6, d: 0.85 } })
    P.push({ id: `b-cloE${i}`, kind: 'cloister', cell: { x: 15.6, y: 28.6 + i * 0.95 }, size: { w: 0.6, d: 0.85 } })
  }
  P.push({ id: 'b-priest0', kind: 'cottage', cell: { x: 3.6, y: 35.4 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-priest1', kind: 'cottage', cell: { x: 6.4, y: 36.0 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-priest2', kind: 'cottage', cell: { x: 13.6, y: 35.6 }, size: { w: 1.6, d: 1.4 }, variant: 'slate' })
  P.push({ id: 'b-statue-saint', kind: 'statue', cell: { x: TEMPLE_YARD.x, y: 32.4 }, size: { w: 1.0, d: 1.0 }, label: '성녀 상' })
  // 앞광장 진입부 소형 봉헌 조상 2기
  P.push({ id: 'b-shrineL', kind: 'statue', cell: { x: 7.2, y: 36.4 }, size: { w: 0.8, d: 0.8 } })
  P.push({ id: 'b-shrineR', kind: 'statue', cell: { x: 11.8, y: 36.4 }, size: { w: 0.8, d: 0.8 } })
  // 대성당 정원 — 앞광장 둘레 화단(부시 타원 링) + 가로수 + 벤치 (배치 헬퍼는 아래에서 재적용)
  TEMPLE_GARDEN.push(
    ...Array.from({ length: 18 }, (_, a) => {
      const th = (a / 18) * Math.PI * 2
      return [TEMPLE_YARD.x + Math.cos(th) * 5.6, TEMPLE_YARD.y + Math.sin(th) * 4.9] as [number, number]
    }),
  )
  const templeGreen: [number, number, string][] = [
    [3.4, 31.2, 'c'], [3.4, 34.0, 'a'], [15.9, 34.6, 'c'], [15.9, 30.0, 'a'],
    [9.8, 37.2, 'a'], [6.0, 37.2, 'g'], [13.2, 37.2, 'o'], [3.6, 37.0, 'c'],
  ]
  templeGreen.forEach(([x, y, v], i) => P.push({ id: `tg-t${i}`, kind: 'tree', cell: { x, y }, variant: v }))

  // ════════ 햇살 농가 (x20–33, y33–38) — 밭을 서·동에서 헛간·풍차·농가가 감쌈 ════════
  P.push({ id: 'b-barn', kind: 'barn', cell: { x: 20.0, y: 32.8 }, size: { w: 2.6, d: 2.0 } })
  P.push({ id: 'b-mill', kind: 'windmill', cell: { x: 20.4, y: 35.6 }, size: { w: 1.6, d: 1.4 } })
  P.push({ id: 'b-farmhouse', kind: 'cottage', cell: { x: 30.6, y: 33.0 }, size: { w: 1.8, d: 1.6 }, variant: 'red' })

  // ════════ 통문 주둔지 (x36–50, y27–38) — 성벽 사각 + 망루 4 + 막사 + 마구간 + 군 통문 ════════
  const BX0 = 37, BX1 = 49, BY0 = 28.5, BY1 = 36.5
  P.push({ id: 'b-tw0', kind: 'tower', cell: { x: BX0, y: BY0 }, size: { w: 1.1, d: 1.1 } })
  P.push({ id: 'b-tw1', kind: 'tower', cell: { x: BX1, y: BY0 }, size: { w: 1.1, d: 1.1 } })
  P.push({ id: 'b-tw2', kind: 'tower', cell: { x: BX1, y: BY1 }, size: { w: 1.1, d: 1.1 } })
  P.push({ id: 'b-tw3', kind: 'tower', cell: { x: BX0, y: BY1 }, size: { w: 1.1, d: 1.1 } })
  // 성벽 세그먼트 타일링 — 개구부(북: ST_S 진입 x41.5~45.5 / 남: 군 통문 x41~45) 남기고
  const WSEG = 0.95
  const wallRunX = (tag: string, x0: number, x1: number, y: number) => {
    const n = Math.max(1, Math.round((x1 - x0) / WSEG))
    for (let i = 0; i < n; i++)
      P.push({ id: `b-w${tag}${i}`, kind: 'wall', cell: { x: x0 + (i + 0.5) * ((x1 - x0) / n), y }, size: { w: 0.9, d: 0.5 }, facing: 'right' })
  }
  const wallRunY = (tag: string, y0: number, y1: number, x: number) => {
    const n = Math.max(1, Math.round((y1 - y0) / WSEG))
    for (let i = 0; i < n; i++)
      P.push({ id: `b-w${tag}${i}`, kind: 'wall', cell: { x, y: y0 + (i + 0.5) * ((y1 - y0) / n) }, size: { w: 0.5, d: 0.9 }, facing: 'left' })
  }
  wallRunX('N0', BX0 + 1.0, 41.3, BY0 + 0.2) // 북벽 좌
  wallRunX('N1', 45.7, BX1 - 1.0, BY0 + 0.2) // 북벽 우
  wallRunX('S0', BX0 + 1.0, 40.8, BY1 + 0.2) // 남벽 좌
  wallRunX('S1', 45.2, BX1 - 1.0, BY1 + 0.2) // 남벽 우
  wallRunY('W', BY0 + 1.0, BY1 - 1.0, BX0 + 0.2) // 서벽
  wallRunY('E', BY0 + 1.0, BY1 - 1.0, BX1 + 0.2) // 동벽
  P.push({ id: 'b-barrack0', kind: 'hall', cell: { x: 38.0, y: 29.8 }, size: { w: 3.0, d: 1.8 }, label: '막사' })
  P.push({ id: 'b-barrack1', kind: 'hall', cell: { x: 38.0, y: 33.0 }, size: { w: 3.0, d: 1.8 }, label: '막사' })
  P.push({ id: 'b-stable', kind: 'hall', cell: { x: 46.0, y: 33.4 }, size: { w: 2.4, d: 2.0 }, label: '마구간' })
  P.push({ id: 'b-gate', kind: 'gate', cell: { x: 42.0, y: 37.4 }, size: { w: 3.4, d: 1.2 }, label: '군 통문' })
  // ════════════════════════════════════════════════════════════════════
  //  거리 furniture — 52×40 맵. 대로 가장자리 규칙 배치.
  //  건물 footprint 와 겹치면 자동 스킵(blocked).
  // ════════════════════════════════════════════════════════════════════
  const solidBoxes = P.filter((p) => p.solid && p.size)
    .map((p) => propAABB(p))
    .filter((b): b is NonNullable<typeof b> => !!b)
  const blocked = (x: number, y: number, m = 0.4) =>
    solidBoxes.some((b) => x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m)
  const onPlaza = (x: number, y: number) =>
    Math.hypot(x - FOUNTAIN.x, (y - FOUNTAIN.y) * 1.15) < 7.4 ||
    Math.hypot((x - TEMPLE_YARD.x) * 1.1, y - TEMPLE_YARD.y) < 4.8
  const onSand = (x: number, y: number) => Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y) < 5.6
  const onRoad = (x: number, y: number) =>
    x < 2.5 || x > VW - 2.5 || y < 2.5 || y > VH - 2.5 ||
    between(x, AV_L) || between(x, AV_R) || between(y, ST_N) || between(y, ST_S) ||
    (between(x, GATE_WAY) && y > ST_S.a) ||
    (Math.abs(x - FOUNTAIN.x) < 2.4 && y > 2.0 && y < ST_N.b) || // 광장 남북 진입로
    (Math.abs(y - FOUNTAIN.y) < 2.2 && x > 2.0 && x < AV_R.b) || // 광장 동서 진입로
    (x > AV_R.a && x < VW - 2.5 && Math.abs(y - 20.5) < 1.5) || // 상점가 아케이드
    (Math.abs(x - TEMPLE_YARD.x) < 1.5 && y > ST_S.a) || // 대성당 진입로
    (x > 19.8 && x < 33 && Math.abs(y - 29.9) < 0.7) || // 공원 산책로
    Math.hypot((x - 5.7) * 0.85, y - 33.4) < 1.9 || // 대성당 연못 좌
    Math.hypot((x - 13.3) * 0.85, y - 33.4) < 1.9 // 대성당 연못 우
  const place = (id: string, kind: PropDef['kind'], x: number, y: number, extra: Partial<PropDef> = {}) => {
    if (blocked(x, y) || onRoad(x, y) || onPlaza(x, y) || onSand(x, y)) return
    P.push({ id, kind, cell: { x, y }, ...extra })
  }

  // ── 관목 울타리 — 광장·공원·앞광장 테두리 부시 줄 ──
  const bushRow = (tag: string, x0: number, y: number, x1: number, step = 0.8) => {
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / step))
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      if (!blocked(x, y) && !onRoad(x, y)) P.push({ id: `hd-${tag}-${i}`, kind: 'bush', cell: { x, y } })
    }
  }
  bushRow('plazN', 20.5, 2.9, 32.5) // 광장 북
  bushRow('plazS', 20.5, 12.2, 32.5) // 광장 남
  bushRow('parkN', 20.0, 28.0, 33.0) // 공원 북 (산책로 위)
  bushRow('parkS', 20.0, 32.1, 33.0) // 공원 남
  bushRow('parkMidL', 20.0, 30.9, 24.8, 0.7) // 산책로 남측 화단 좌
  bushRow('parkMidR', 28.6, 30.9, 33.0, 0.7) // 산책로 남측 화단 우

  // 대성당 앞광장 화단 링 + 벤치 (앞광장 포장 위 벤치는 직접 push)
  TEMPLE_GARDEN.forEach(([x, y], i) => {
    if (!blocked(x, y) && !onRoad(x, y)) P.push({ id: `tg-bush${i}`, kind: 'bush', cell: { x, y } })
  })
  // 앞광장 — 성녀 상을 둘러싼 벤치 링 (좌·우 대칭)
  const yardBench: [number, number, 'l' | 'r'][] = [
    [TEMPLE_YARD.x - 3.0, TEMPLE_YARD.y - 1.4, 'l'], [TEMPLE_YARD.x + 3.0, TEMPLE_YARD.y - 1.4, 'r'],
    [TEMPLE_YARD.x - 3.0, TEMPLE_YARD.y + 1.4, 'r'], [TEMPLE_YARD.x + 3.0, TEMPLE_YARD.y + 1.4, 'l'],
    [TEMPLE_YARD.x - 1.6, TEMPLE_YARD.y - 3.0, 'l'], [TEMPLE_YARD.x + 1.6, TEMPLE_YARD.y - 3.0, 'r'],
  ]
  yardBench.forEach(([x, y, v], i) => {
    if (!blocked(x, y)) P.push({ id: `be-tp${i}`, kind: 'bench', cell: { x, y }, variant: v })
  })

  // ── 가로등 — 대로 양편(4셀 간격) + 광장·투기장·앞광장·의전대로 둘레 ──
  const lamps: [number, number][] = []
  for (const ex of [AV_L.a - 0.6, AV_L.b + 0.6, AV_R.a - 0.6, AV_R.b + 0.6])
    for (let y = 4; y <= 37; y += 4.2) lamps.push([ex, y])
  for (const ey of [ST_N.a - 0.6, ST_N.b + 0.6, ST_S.a - 0.6, ST_S.b + 0.6])
    for (let x = 4; x <= 49; x += 4.4) lamps.push([x, ey])
  for (let a = 0; a < 8; a++)
    lamps.push([FOUNTAIN.x + Math.cos((a / 8) * 6.283) * 8.4, FOUNTAIN.y + Math.sin((a / 8) * 6.283) * 7.2])
  for (let a = 0; a < 6; a++)
    lamps.push([COLOSSEUM.x + Math.cos((a / 6) * 6.283 + 0.5) * 6.6, COLOSSEUM.y + Math.sin((a / 6) * 6.283 + 0.5) * 6.4])
  for (let y = 29; y <= 36; y += 3) { lamps.push([GATE_WAY.a - 0.6, y]); lamps.push([GATE_WAY.b + 0.6, y]) }
  for (let a = 0; a < 6; a++)
    lamps.push([TEMPLE_YARD.x + Math.cos((a / 6) * 6.283) * 5.2, TEMPLE_YARD.y + Math.sin((a / 6) * 6.283) * 4.8])
  // 근접 중복 제거 (2.6셀 이내면 스킵)
  const keptLamps: [number, number][] = []
  for (const [x, y] of lamps) {
    if (keptLamps.some(([kx, ky]) => Math.hypot(kx - x, ky - y) < 2.6)) continue
    keptLamps.push([x, y])
  }
  keptLamps.forEach(([x, y], i) => place(`l${i}`, 'lamp', x, y))

  // ── 현수막 — 광장 남측 진입부 · 의전 대로 입구 ──
  place('bn0', 'banner', FOUNTAIN.x - 2.8, 12.4, { variant: '#5b6bd6' })
  place('bn1', 'banner', FOUNTAIN.x + 2.8, 12.4, { variant: '#c58f42' })
  place('bn2', 'banner', GATE_WAY.a - 0.7, ST_S.b + 0.6, { variant: '#b64430' })
  place('bn3', 'banner', GATE_WAY.b + 0.7, ST_S.b + 0.6, { variant: '#b64430' })

  // ── 벤치 — 분수 둘레 / 아케이드 / 투기장. variant l|r = 아이소 축 방향 ──
  const benchSpots: [number, number, 'l' | 'r'][] = [
    [FOUNTAIN.x - 3.4, FOUNTAIN.y - 2.2, 'l'], [FOUNTAIN.x + 3.4, FOUNTAIN.y - 2.2, 'r'],
    [FOUNTAIN.x - 3.4, FOUNTAIN.y + 2.2, 'r'], [FOUNTAIN.x + 3.4, FOUNTAIN.y + 2.2, 'l'],
    [40.2, 19.2, 'l'], [43.5, 22.2, 'r'], [46.6, 19.2, 'l'], // 아케이드
    [COLOSSEUM.x - 6.9, COLOSSEUM.y, 'r'], [COLOSSEUM.x + 6.9, COLOSSEUM.y, 'l'], // 투기장 동서
  ]
  benchSpots.forEach(([x, y, v], i) => {
    if (!blocked(x, y) && !onRoad(x, y)) P.push({ id: `be${i}`, kind: 'bench', cell: { x, y }, variant: v })
  })

  // ── 마로니에 공원 벤치 — 뤽상부르/튈르리식: 산책로 양편 화단 등지고 촘촘히 (약 2.3셀 간격) ──
  const parkBench: { x: number; y: number; v: 'l' | 'r' }[] = []
  for (let x = 20.8; x <= 32.4; x += 2.3) {
    parkBench.push({ x, y: 28.7, v: 'l' }) // 북측: 화단 등지고 남향(산책로)
    parkBench.push({ x: x + 1.15, y: 31.1, v: 'r' }) // 남측: 반 칸 엇갈려 북향
  }
  // 중앙 연주대(정자) 둘레 벤치 4
  parkBench.push({ x: 24.4, y: 31.4, v: 'r' }, { x: 28.8, y: 31.4, v: 'l' }, { x: 24.4, y: 32.0, v: 'l' }, { x: 28.8, y: 32.0, v: 'r' })
  parkBench.forEach(({ x, y, v }, i) => {
    if (!blocked(x, y) && !onRoad(x, y)) P.push({ id: `be-pk${i}`, kind: 'bench', cell: { x, y }, variant: v })
  })

  // ── 쓰레기통 — 대로 교차점 4곳 + 분수/공원 벤치 옆 ──
  const bins: [number, number][] = [
    [AV_L.a - 0.7, ST_N.a - 0.7], [AV_R.b + 0.7, ST_N.a - 0.7],
    [AV_L.a - 0.7, ST_S.b + 0.7], [AV_R.b + 0.7, ST_S.b + 0.7],
    [FOUNTAIN.x + 1.4, FOUNTAIN.y - 3.2], [24.0, 29.3], [41.7, 19.2],
    [TEMPLE_YARD.x + 1.4, TEMPLE_YARD.y - 3.0],
  ]
  bins.forEach(([x, y], i) => place(`tb${i}`, 'trashbin', x, y))

  // ── 우체통 — 광장 모서리·상점가·하우징 앞 ──
  const postboxes: [number, number][] = [[19.0, 3.0], [FOUNTAIN.x + 5.0, 12.2], [36.0, 15.0], [36.0, 3.0]]
  postboxes.forEach(([x, y], i) => place(`pb${i}`, 'postbox', x, y))

  // ── 자전거 — 상점·여관·집 입구 ──
  const bikes: [number, number][] = [[40.5, 19.6], [37.6, 24.4], [37.6, 5.0], [45.0, 5.2]]
  bikes.forEach(([x, y], i) => place(`bi${i}`, 'bicycle', x, y))

  // ── 나무 — 대로 verge 가로수 열 + 잔디 군집 ──
  const trees: [number, number, string][] = []
  // AV_L / AV_R verge 가로수 (건물 없는 구간)
  for (const ex of [AV_L.a - 1.3, AV_R.b + 1.3])
    for (let y = 5; y <= 36; y += 3.5) trees.push([ex, y, 'aacgo'[(y | 0) % 5]])
  // ST_N / ST_S verge
  for (const ey of [ST_N.a - 1.3, ST_S.b + 1.3])
    for (let x = 5; x <= 48; x += 4) trees.push([x, ey, 'gaoca'[(x | 0) % 5]])
  // 잔디 군집
  const clusters: [number, number, string][] = [
    [10.5, 6.0, 'c'], [15.0, 10.5, 'a'], [9.5, 12.0, 'g'], // 학교 안뜰 주변
    [24.0, 3.4, 'a'], [29.5, 4.0, 'o'], [22.0, 11.0, 'g'], [31.0, 11.5, 'c'], // 광장 코너
    [38.5, 11.0, 'a'], [43.0, 11.2, 'g'], [48.0, 5.5, 'o'], // 하우징 정원
    [12.5, 22.5, 'c'], [7.0, 15.5, 'g'], [3.5, 22.0, 'a'], // 기숙사
    [21.5, 35.0, 'o'], [31.6, 36.0, 'g'], // 농가 구석
    [48.0, 20.5, 'c'], [48.5, 30.0, 'g'], // 상점가·주둔지 동편
    [COLOSSEUM.x - 7.5, COLOSSEUM.y - 5, 'b'], [COLOSSEUM.x + 7.5, COLOSSEUM.y - 5, 'b'],
    // 마로니에 공원 — 밤나무 가로수 밀집. 산책로 y29.9 위·아래 2열 + 양 끝 큰나무
    [20.6, 28.3, 'c'], [23.0, 28.3, 'a'], [25.4, 28.3, 'c'], [28.0, 28.3, 'a'], [30.4, 28.3, 'c'], [32.3, 28.4, 'a'],
    [20.6, 31.7, 'a'], [23.6, 31.8, 'c'], [29.4, 31.8, 'c'], [32.4, 31.7, 'a'],
    [19.9, 29.9, 'g'], [32.8, 29.9, 'g'],
  ]
  trees.push(...clusters)
  trees.forEach(([x, y, v], i) => {
    if (!blocked(x, y, 0.6) && !onRoad(x, y) && !onPlaza(x, y) && !onSand(x, y))
      P.push({ id: `t${i}`, kind: 'tree', cell: { x, y }, variant: v })
  })
  // 공원 중앙 정자(연주대) + 산책로변 쓰레기통
  P.push({ id: 'b-parkgazebo', kind: 'gazebo', cell: { x: 26.6, y: 31.6 }, size: { w: 1.8, d: 1.6 } })
  place('tb-pk0', 'trashbin', 23.0, 30.9)
  place('tb-pk1', 'trashbin', 30.2, 29.0)

  // 종류 기반 플래그 + 라스터 스프라이트 일괄 부여 (개별 push 에서 누락 방지)
  for (const p of P) {
    if (SOLID_KINDS.has(p.kind)) p.solid = true
    if (RADIAL_KINDS.has(p.kind)) p.radial = true
    const rs =
      BUILDING_SPRITE[p.id] ??
      (p.kind === 'cottage'
        ? COTTAGE_SPRITE[p.variant ?? 'slate']
        : p.kind === 'tree'
          ? TREE_SPRITE[p.variant ?? 'a']
          : p.kind === 'bench'
            ? BENCH_SPRITE[p.variant ?? 'l']
            : p.kind === 'wall'
              ? WALL_SPRITE[p.facing ?? 'right']
              : KIND_BUILDING_SPRITE[p.kind] ?? PROP_SPRITE[p.kind])
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
    name: '울토르 마법학교 마을',
    kind: 'town',
    grid: { w: VW, h: VH },
    bg: 'school',
    render: 'iso',
    assets: 'raster', // Phase 2 테스트: 가로등만 PNG, 나머지는 sprite 없어 SVG 폴백
    tileAt: villageTileAt,
    props: VILLAGE_PROPS,
    zones: VILLAGE_ZONES,
    blockers: VILLAGE_BLOCKERS,
    spawn: { x: 26.5, y: 12.2 },
    respawn: { x: 9.5, y: 30.0 },
    portals: [
      { id: 'gate-forest', cell: { x: 43.5, y: 36.6 }, to: 'forest', label: '에르디아 숲', kind: 'gate' },
      { id: 'gate-sea', cell: { x: 43.5, y: 36.6 }, to: 'sea', label: '스톰헤이븐', kind: 'gate', requiredLevel: 3 },
      { id: 'gate-ruins', cell: { x: 43.5, y: 36.6 }, to: 'ruins', label: '하늘 유적', kind: 'gate', requiredLevel: 10 },
      { id: 'gate-volcano', cell: { x: 43.5, y: 36.6 }, to: 'volcano', label: '화산지대', kind: 'gate', requiredLevel: 20 },
    ],
  },

  // ── 숲 계열 ───────────────────────────────────────────────────────────────
  forest: {
    id: 'forest',
    name: '에르디아 숲',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'forest',
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    recommendedLevel: 2,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'forest-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
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
    name: '스톰헤이븐 해안',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'sea',
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    recommendedLevel: 3,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'sea-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'sea-deepsea', cell: { x: 2, y: 1.6 }, to: 'deepsea', label: '심해로', kind: 'portal', requiredLevel: 9 },
      { id: 'sea-atlantis', cell: { x: 10, y: 1.6 }, to: 'atlantis', label: '아틀란티스 마을', kind: 'portal' },
    ],
  },
  deepsea: {
    id: 'deepsea',
    name: '스톰헤이븐 심연',
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
    name: '하늘 유적',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'ruins',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 10,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'ruins-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'ruins-graveyard', cell: { x: 2, y: 1.6 }, to: 'graveyard', label: '버려진 묘지', kind: 'portal', requiredLevel: 13 },
      { id: 'ruins-temple', cell: { x: 10, y: 1.6 }, to: 'temple-ruin', label: '천공 신전', kind: 'portal', requiredLevel: 18 },
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
    name: '천공 신전',
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
      { id: 'volcano-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'volcano-demon-village', cell: { x: 2, y: 1.6 }, to: 'demon-village', label: '마물 마을', kind: 'portal', requiredLevel: 25 },
      { id: 'volcano-demon-castle', cell: { x: 10, y: 1.6 }, to: 'demon-castle', label: '모르스의 성', kind: 'portal', requiredLevel: 32 },
    ],
  },
  'demon-village': {
    id: 'demon-village',
    name: '마물 마을',
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
    name: '모르스의 성',
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
