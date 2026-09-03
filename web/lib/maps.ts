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
//   village ──군 통문──▶ forest / sea / stormhaven / ruins / snowfield / volcano
//   forest    ─▶ cave ─▶ mine,   forest ─▶ swamp
//   sea       ─▶ deepsea,        sea    ─▶ atlantis(안전)
//   stormhaven─▶ sky-temple(천공 신전, 안전)
//   ruins     ─▶ graveyard,      ruins  ─▶ temple-ruin(버려진 신전, 안전)
//   snowfield ─▶ aurora-village(오로라 마을, 안전)
//   volcano   ─▶ demon-village(마물 마을, 안전),  volcano ─▶ demon-castle
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
  // 마로니에 공원 잔디 — 투기장 남측, 농가 위까지 넉넉히 (밝은 잔디)
  if (
    x > 19.8 && x < 33 && y > ST_S.b && y < 32.6 &&
    Math.hypot(x - COLOSSEUM.x, y - COLOSSEUM.y) >= 5.6
  )
    return 'grass'
  // 공원 산책로 (동서, 공원 한가운데)
  if (x > 19.8 && x < 33 && Math.abs(y - 29.9) < 0.7) return 'path'
  // 나머지 잔디 — 얼룩은 아주 드물게(풀 비율↑)
  return (Math.floor(x) * 7 + Math.floor(y) * 13) % 9 === 0 ? 'grass-dark' : 'grass'
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
  // 앞광장 — 성녀 상 앞, 마주보는 벤치 두 쌍(관상 공간)
  const yardBench: [number, number, 'l' | 'r'][] = [
    [TEMPLE_YARD.x - 2.6, TEMPLE_YARD.y - 0.2, 'l'], [TEMPLE_YARD.x + 2.6, TEMPLE_YARD.y - 0.2, 'r'],
    [TEMPLE_YARD.x - 2.6, TEMPLE_YARD.y + 2.1, 'r'], [TEMPLE_YARD.x + 2.6, TEMPLE_YARD.y + 2.1, 'l'],
  ]
  yardBench.forEach(([x, y, v], i) => {
    if (!blocked(x, y) && !onRoad(x, y)) P.push({ id: `be-tp${i}`, kind: 'bench', cell: { x, y }, variant: v })
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

  // ── 마로니에 공원 벤치 — 산책로 양편에 마주보게, 가운데 정자 축은 비워 자연스럽게 ──
  const parkBench: { x: number; y: number; v: 'l' | 'r' }[] = []
  for (const bx of [21.2, 23.8, 29.6, 32.2]) {
    parkBench.push({ x: bx, y: 28.7, v: 'l' }) // 북측: 산책로 남향
    parkBench.push({ x: bx + 0.5, y: 31.0, v: 'r' }) // 남측: 살짝 엇갈려 북향
  }
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

// ── 필드(야생) 지역 프롭 세트 ────────────────────────────────────────────────
// world-screen 의 쿼터뷰 경로에서 빌보드 PNG 로 세워 렌더한다(FieldProp).
// kind 는 쿼터뷰 빌보드에서 쓰이지 않으므로 형식상 근사값을 넣는다.
// px = 파일 실제 픽셀, anchor = 파일 좌상단 기준 발밑(그라운드) 오프셋.
type FieldSprite = { sprite: string; px: { w: number; h: number }; anchor: { x: number; y: number }; kind: PropDef['kind'] }
const FIELD_SPRITES = {
  forest: {
    tree: { sprite: '/images/map/props/f_forest_tree.png', px: { w: 128, h: 160 }, anchor: { x: 64, y: 150 }, kind: 'tree' },
    bush: { sprite: '/images/map/props/f_forest_bush.png', px: { w: 96, h: 56 }, anchor: { x: 48, y: 52 }, kind: 'bush' },
    rock: { sprite: '/images/map/props/f_forest_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 60 }, kind: 'bush' },
    mushroom: { sprite: '/images/map/props/f_forest_mushroom.png', px: { w: 72, h: 56 }, anchor: { x: 36, y: 52 }, kind: 'bush' },
    log: { sprite: '/images/map/props/f_forest_log.png', px: { w: 120, h: 56 }, anchor: { x: 60, y: 48 }, kind: 'bush' },
    firefly: { sprite: '/images/map/props/f_forest_firefly.png', px: { w: 56, h: 96 }, anchor: { x: 28, y: 92 }, kind: 'lamp' },
  },
  volcano: {
    spire: { sprite: '/images/map/props/f_volcano_spire.png', px: { w: 72, h: 144 }, anchor: { x: 36, y: 134 }, kind: 'tree' },
    deadtree: { sprite: '/images/map/props/f_volcano_deadtree.png', px: { w: 104, h: 136 }, anchor: { x: 52, y: 128 }, kind: 'tree' },
    rock: { sprite: '/images/map/props/f_volcano_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 58 }, kind: 'bush' },
    vent: { sprite: '/images/map/props/f_volcano_vent.png', px: { w: 88, h: 56 }, anchor: { x: 44, y: 50 }, kind: 'bush' },
    sulfur: { sprite: '/images/map/props/f_volcano_sulfur.png', px: { w: 64, h: 64 }, anchor: { x: 32, y: 58 }, kind: 'bush' },
    ashmound: { sprite: '/images/map/props/f_volcano_ashmound.png', px: { w: 72, h: 48 }, anchor: { x: 36, y: 44 }, kind: 'bush' },
  },
} as const satisfies Record<string, Record<string, FieldSprite>>

function fprop<B extends keyof typeof FIELD_SPRITES>(
  biome: B,
  key: keyof (typeof FIELD_SPRITES)[B],
  id: string,
  x: number,
  y: number,
): PropDef {
  const s = FIELD_SPRITES[biome][key] as FieldSprite
  return { id, kind: s.kind, cell: { x, y }, sprite: s.sprite, px: s.px, anchor: s.anchor }
}

// 에르디아 숲 (12×10) — 스폰(6,8.6)·포탈(6,9.4 / 2,1.6 / 10,1.6) 셀은 비워 둔다.
// 가장자리를 큰나무로 둘러 개활지(클리어링)를 만들고 안쪽에 낮은 소품을 흩뿌린다.
const FOREST_PROPS: PropDef[] = [
  fprop('forest', 'tree', 'ft1', 1.2, 2.3), fprop('forest', 'tree', 'ft2', 3.6, 1.1), fprop('forest', 'tree', 'ft3', 8.0, 1.0),
  fprop('forest', 'tree', 'ft4', 11.0, 2.6), fprop('forest', 'tree', 'ft5', 0.8, 5.6), fprop('forest', 'tree', 'ft6', 11.2, 6.2),
  fprop('forest', 'tree', 'ft7', 2.0, 8.6), fprop('forest', 'tree', 'ft8', 9.7, 8.8), fprop('forest', 'tree', 'ft9', 6.2, 0.7),
  fprop('forest', 'bush', 'fb1', 4.4, 3.2), fprop('forest', 'bush', 'fb2', 8.6, 4.0), fprop('forest', 'bush', 'fb3', 2.7, 6.7),
  fprop('forest', 'bush', 'fb4', 10.2, 4.7),
  fprop('forest', 'rock', 'fr1', 7.4, 2.6), fprop('forest', 'rock', 'fr2', 3.0, 4.6),
  fprop('forest', 'log', 'fl1', 5.6, 5.2), fprop('forest', 'log', 'fl2', 8.8, 6.8),
  fprop('forest', 'mushroom', 'fm1', 4.8, 6.3), fprop('forest', 'mushroom', 'fm2', 6.9, 4.1), fprop('forest', 'mushroom', 'fm3', 9.4, 2.2),
  fprop('forest', 'firefly', 'ff1', 3.9, 7.7), fprop('forest', 'firefly', 'ff2', 7.7, 7.6),
]

// 화산지대 (12×10) — 스폰(6,8.6)·포탈(6,9.4 / 2,1.6 / 10,1.6) 셀은 비워 둔다.
// forest 와 동일 배치 골격(가장자리 큰 실루엣 + 안쪽 산개)을 재사용, 소품만 화산 세트로 교체.
const VOLCANO_PROPS: PropDef[] = [
  fprop('volcano', 'spire', 'vt1', 1.2, 2.3), fprop('volcano', 'spire', 'vt2', 3.6, 1.1), fprop('volcano', 'spire', 'vt3', 8.0, 1.0),
  fprop('volcano', 'deadtree', 'vt4', 11.0, 2.6), fprop('volcano', 'deadtree', 'vt5', 0.8, 5.6), fprop('volcano', 'deadtree', 'vt6', 11.2, 6.2),
  fprop('volcano', 'deadtree', 'vt7', 2.0, 8.6), fprop('volcano', 'spire', 'vt8', 9.7, 8.8), fprop('volcano', 'spire', 'vt9', 6.2, 0.7),
  fprop('volcano', 'sulfur', 'vb1', 4.4, 3.2), fprop('volcano', 'ashmound', 'vb2', 8.6, 4.0), fprop('volcano', 'sulfur', 'vb3', 2.7, 6.7),
  fprop('volcano', 'ashmound', 'vb4', 10.2, 4.7),
  fprop('volcano', 'rock', 'vr1', 7.4, 2.6), fprop('volcano', 'rock', 'vr2', 3.0, 4.6),
  fprop('volcano', 'rock', 'vl1', 5.6, 5.2), fprop('volcano', 'rock', 'vl2', 8.8, 6.8),
  fprop('volcano', 'vent', 'vm1', 4.8, 6.3), fprop('volcano', 'vent', 'vm2', 6.9, 4.1), fprop('volcano', 'vent', 'vm3', 9.4, 2.2),
  fprop('volcano', 'ashmound', 'vf1', 3.9, 7.7), fprop('volcano', 'sulfur', 'vf2', 7.7, 7.6),
]

// ── 아틀란티스 마을 (32×28, 대형 건물 + 다양한 디자인 + 궁전 성벽·정원) ──────
// 맵 기준 북(위)=궁전(성벽+정원으로 둘러싼 구역), 중앙=길드, 서(왼)=마을(주택가), 동(오)=상점가, 남(아래)=진주공원+환영길.
// 환영길(남북 대로, 폭 4.4)이 항구→공원→길드→궁전을 관통, 동서 교차로(폭 3.2)가 마을·길드·상점가를 잇는다.
const AW = 32
const AH = 28
const ACX = 16 // 환영길·길드·공원 광장 중심 x
const GUILD_CY = 14 // 길드 앞 광장 중심 y
const PARK_CY = 22.5 // 진주공원 중심 y
const PALACE_CX = 5.6 // 궁전 중심 x — 스케치대로 가장 위 왼쪽 구석
const PALACE_CY = 3.6 // 궁전 중심 y

function atlantisTileAt(x: number, y: number): TileKind {
  // 바깥 테두리 = 물(마을을 감싼 항구/해자) — 바다 위에 뜬 돔 마을 느낌
  if (x < 1.6 || x > AW - 1.6 || y < 1.6 || y > AH - 1.6) return 'water'
  // 궁전 앞 정원 광장(왼쪽 위 구석) · 진주공원 광장 · 길드 앞 광장 — 원형 포석
  if (Math.hypot(x - PALACE_CX, y - PALACE_CY) < 4.2) return 'plaza'
  if (Math.hypot(x - ACX, y - PARK_CY) < 4.6) return 'plaza'
  if (Math.hypot(x - ACX, y - GUILD_CY) < 2.6) return 'plaza'
  // 환영길(남북 대로, 항구 ↔ 공원 ↔ 길드) — 폭 4.4로 넉넉하게
  if (Math.abs(x - ACX) < 2.2) return 'path'
  // 동서 교차로(마을 ↔ 길드 ↔ 상점가) — 폭 3.2
  if (Math.abs(y - GUILD_CY) < 1.6) return 'path'
  return 'sand'
}

// PixelLab 생성 → sharp 트림 완료 (public/images/map/props/atlantis/). 건물 비중을 키우고
// 집·상점 각 3종 variant로 단조로움을 없앴다.
const ATLANTIS_SPRITE = {
  palace: { sprite: '/images/map/props/atlantis/atl_palace2.png', px: { w: 335, h: 373 } },
  house: { sprite: '/images/map/props/atlantis/atl_house.png', px: { w: 104, h: 111 } },
  houseB: { sprite: '/images/map/props/atlantis/atl_houseB.png', px: { w: 88, h: 114 } },
  houseC: { sprite: '/images/map/props/atlantis/atl_houseC.png', px: { w: 102, h: 125 } },
  guildhall: { sprite: '/images/map/props/atlantis/atl_guildhall.png', px: { w: 150, h: 174 } },
  stall: { sprite: '/images/map/props/atlantis/atl_stall.png', px: { w: 84, h: 84 } },
  stallB: { sprite: '/images/map/props/atlantis/atl_stallB.png', px: { w: 81, h: 91 } },
  stallC: { sprite: '/images/map/props/atlantis/atl_stallC.png', px: { w: 76, h: 87 } },
  tradinghouse: { sprite: '/images/map/props/atlantis/atl_tradinghouse.png', px: { w: 166, h: 177 } },
  pearl: { sprite: '/images/map/props/atlantis/atl_pearlmonument.png', px: { w: 156, h: 155 } },
  gazebo: { sprite: '/images/map/props/atlantis/atl_gazebo.png', px: { w: 67, h: 77 } },
  tidepool: { sprite: '/images/map/props/atlantis/atl_tidepool.png', px: { w: 46, h: 33 } },
  bench: { sprite: '/images/map/props/atlantis/atl_bench.png', px: { w: 39, h: 25 } },
  flowerbed: { sprite: '/images/map/props/atlantis/atl_flowerbed.png', px: { w: 46, h: 27 } },
  kelp: { sprite: '/images/map/props/atlantis/atl_kelp.png', px: { w: 53, h: 78 } },
  lamp: { sprite: '/images/map/props/atlantis/atl_lamp.png', px: { w: 14, h: 66 } },
  banner: { sprite: '/images/map/props/atlantis/atl_banner.png', px: { w: 21, h: 47 } },
  barrel: { sprite: '/images/map/props/atlantis/atl_barrel.png', px: { w: 33, h: 32 } },
  noticeboard: { sprite: '/images/map/props/atlantis/atl_noticeboard.png', px: { w: 34, h: 48 } },
  guard: { sprite: '/images/map/props/atlantis/atl_guard.png', px: { w: 28, h: 47 } },
  citizen: { sprite: '/images/map/props/atlantis/atl_citizen.png', px: { w: 18, h: 46 } },
  wall: { sprite: '/images/map/props/atlantis/atl_wallsegment.png', px: { w: 73, h: 48 } },
  topiary: { sprite: '/images/map/props/atlantis/atl_topiary.png', px: { w: 53, h: 65 } },
}

function atlantisProps(): PropDef[] {
  const P: PropDef[] = []

  // ════════ 궁전 구역 (가장 위 왼쪽 구석) — 스케치대로 코너에 몰아서 배치 ════════
  P.push({
    id: 'atl-palace', kind: 'dome', cell: { x: PALACE_CX - 2.8, y: 1.8 }, size: { w: 5.6, d: 4.4 },
    solid: true, label: '인어궁전', ...ATLANTIS_SPRITE.palace,
  })
  // 궁전 뒤 성벽 — 궁전 폭에 맞춰 구석에 딱 붙여서(밖으로 삐져나오지 않게)
  for (let wx = 2.0, wi = 0; wx <= 9.4; wx += 1.3, wi++) {
    P.push({ id: `atl-wall${wi}`, kind: 'wall', cell: { x: wx, y: 1.65 }, size: { w: 1.2, d: 0.4 }, solid: true, ...ATLANTIS_SPRITE.wall })
  }
  // 정원 앞뜰 — 근위병·깃발·회양목 정원·화단·벤치, 전부 궁전 발치에 붙여서
  ;[[4.2, 7.0], [7.0, 7.0]].forEach(([x, y], i) =>
    P.push({ id: `atl-guard${i}`, kind: 'statue', cell: { x, y }, size: { w: 0.6, d: 0.5 }, solid: true, ...ATLANTIS_SPRITE.guard }),
  )
  ;[[2.0, 2.2], [9.2, 2.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-pbanner${i}`, kind: 'banner', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.banner }),
  )
  ;[[3.0, 7.6], [8.2, 7.6], [2.2, 5.0], [9.0, 5.0]].forEach(([x, y], i) =>
    P.push({ id: `atl-topiary${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary }),
  )
  ;[[2.0, 3.6], [9.2, 3.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-pkelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[2.2, 8.4], [9.0, 8.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-pflower${i}`, kind: 'bush', cell: { x, y }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed }),
  )
  ;[[4.4, 8.2], [6.8, 8.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-pbench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, ...ATLANTIS_SPRITE.bench }),
  )

  // ════════ 길드홀 (중앙, 마을↔상점가 사이) — 평판을 쌓는 곳, 크고 존재감 있게 ════════
  P.push({
    id: 'atl-guildhall', kind: 'shop', cell: { x: ACX - 1.3, y: GUILD_CY - 3.4 }, size: { w: 2.5, d: 2.3 },
    solid: true, label: '항해자 길드', ...ATLANTIS_SPRITE.guildhall,
  })
  ;[[12.8, GUILD_CY - 1.8], [19.2, GUILD_CY - 1.8]].forEach(([x, y], i) =>
    P.push({ id: `atl-gbanner${i}`, kind: 'banner', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.banner }),
  )
  P.push({ id: 'atl-notice', kind: 'postbox', cell: { x: ACX + 2.8, y: GUILD_CY - 0.4 }, size: { w: 0.5, d: 0.4 }, ...ATLANTIS_SPRITE.noticeboard })
  ;[[12.2, GUILD_CY - 3.2], [19.8, GUILD_CY - 3.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-gtopiary${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary }),
  )

  // ════════ 마을(주택가, 서쪽) — 집 3종 variant를 섞어 빼곡하게 ════════
  const houseSprites = [ATLANTIS_SPRITE.house, ATLANTIS_SPRITE.houseB, ATLANTIS_SPRITE.houseC]
  const houseFoot: [number, number][] = [[1.7, 1.5], [1.5, 1.3], [1.7, 1.5]]
  const houseRows = [9.4, 17.6, 21.2]
  const houseCols = [2.8, 6.4, 10.0]
  let hi = 0
  houseRows.forEach((hy, ri) => houseCols.forEach((hx, ci) => {
    const v = (ri + ci) % 3
    const [w, d] = houseFoot[v]
    P.push({ id: `atl-house${hi}`, kind: 'cottage', cell: { x: hx, y: hy }, size: { w, d }, solid: true, ...houseSprites[v] })
    hi++
  }))
  ;[[1.8, 6.6], [11.6, 6.6], [1.8, 24.8], [11.6, 24.8]].forEach(([x, y], i) =>
    P.push({ id: `atl-hkelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[6.8, 6.8], [6.8, 24.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-hlamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp }),
  )
  ;[[4.6, 13.2], [8.2, 13.2], [4.6, 19.6], [8.2, 19.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-hbench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, ...ATLANTIS_SPRITE.bench }),
  )
  ;[[2.4, 11.0], [10.4, 11.0]].forEach(([x, y], i) =>
    P.push({ id: `atl-hbarrel${i}`, kind: 'trashbin', cell: { x, y }, size: { w: 0.5, d: 0.5 }, ...ATLANTIS_SPRITE.barrel }),
  )

  // ════════ 상점가 (동쪽) — 노점 3종 variant + 무역상관(대형) ════════
  const stallSprites = [ATLANTIS_SPRITE.stall, ATLANTIS_SPRITE.stallB, ATLANTIS_SPRITE.stallC]
  const stallFoot: [number, number][] = [[1.4, 1.3], [1.4, 1.3], [1.3, 1.2]]
  const stallRows = [9.4, 17.6, 21.2]
  const stallCols = [21.8, 25.2, 28.6]
  let si = 0
  stallRows.forEach((sy, ri) => stallCols.forEach((sx, ci) => {
    const v = (ri + ci) % 3
    const [w, d] = stallFoot[v]
    P.push({ id: `atl-stall${si}`, kind: 'stall', cell: { x: sx, y: sy }, size: { w, d }, solid: true, ...stallSprites[v] })
    si++
  }))
  P.push({
    id: 'atl-tradinghouse', kind: 'shop', cell: { x: 19.6, y: GUILD_CY + 0.4 }, size: { w: 2.8, d: 2.5 },
    solid: true, label: '원양 무역상관', ...ATLANTIS_SPRITE.tradinghouse,
  })
  ;[[20.6, 6.6], [30.2, 6.6], [20.6, 24.8], [30.2, 24.8]].forEach(([x, y], i) =>
    P.push({ id: `atl-skelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[25.0, 6.8], [25.0, 24.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp }),
  )
  ;[[23.4, 11.2], [27.0, 11.2], [23.4, 19.6], [27.0, 19.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-sbarrel${i}`, kind: 'trashbin', cell: { x, y }, size: { w: 0.5, d: 0.5 }, ...ATLANTIS_SPRITE.barrel }),
  )

  // ════════ 진주공원 (남) — 진주 기념물 중심, 정자·연못·화단·벤치 ════════
  P.push({
    id: 'atl-pearl', kind: 'fountain', cell: { x: ACX, y: PARK_CY }, size: { w: 2.6, d: 2.6 },
    collide: { w: 3.2, d: 3.2 }, radial: true, solid: true, label: '진주공원', ...ATLANTIS_SPRITE.pearl,
  })
  P.push({ id: 'atl-gazebo', kind: 'gazebo', cell: { x: 21.8, y: PARK_CY - 0.6 }, size: { w: 1.3, d: 1.3 }, solid: true, ...ATLANTIS_SPRITE.gazebo })
  P.push({ id: 'atl-tidepool', kind: 'fountain', cell: { x: 10.2, y: PARK_CY - 0.4 }, size: { w: 1.0, d: 0.7 }, radial: true, ...ATLANTIS_SPRITE.tidepool })
  ;[[13.0, 20.5], [19.0, 20.5], [13.0, 24.9], [19.0, 24.9], [10.4, 23.1], [21.8, 23.1]].forEach(([x, y], i) =>
    P.push({ id: `atl-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, ...ATLANTIS_SPRITE.bench }),
  )
  ;[[7.8, 20.1], [24.2, 20.1], [7.8, 25.5], [24.2, 25.5], [11.8, 25.9], [20.2, 25.9]].forEach(([x, y], i) =>
    P.push({ id: `atl-flower${i}`, kind: 'bush', cell: { x, y }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed }),
  )
  ;[[6.2, 20.7], [25.8, 20.7], [6.2, 25.7], [25.8, 25.7]].forEach(([x, y], i) =>
    P.push({ id: `atl-pkelp2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[9.4, 18.6], [22.6, 18.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-ptopiary${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary }),
  )
  P.push({ id: 'atl-citizen0', kind: 'statue', cell: { x: 14.2, y: 24.1 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.citizen })
  P.push({ id: 'atl-citizen1', kind: 'statue', cell: { x: 18.0, y: 21.5 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.citizen })

  // ════════ 환영길(대로) 가로등 — 항구 → 공원 → 길드 → 궁전 ════════
  ;[10.4, 18.6, 26.4].forEach((y, i) => {
    P.push({ id: `atl-blamp${i}a`, kind: 'lamp', cell: { x: 14.1, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
    P.push({ id: `atl-blamp${i}b`, kind: 'lamp', cell: { x: 17.9, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
  })

  return P
}

const ATLANTIS_PROPS = atlantisProps()
const ATLANTIS_BLOCKERS = buildBlockers(ATLANTIS_PROPS)

// ── 천공 신전 (32×28, 흰색·황금색 하늘 신전) ────────────────────────────────
// 북=대신전+길드(바람의 교단), 중앙=수정 제단(트레이드마크) 광장, 좌우=노점·순례자 숙소, 남=진입로.
const SKY_AW = 32
const SKY_AH = 28
const SKY_CX = 16
const SKY_TEMPLE_CY = 6
const SKY_ALTAR_CY = 15

function skyTempleTileAt(x: number, y: number): TileKind {
  if (x < 1.6 || x > SKY_AW - 1.6 || y < 1.6 || y > SKY_AH - 1.6) return 'water'
  if (Math.hypot(x - SKY_CX, y - SKY_TEMPLE_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - SKY_CX, y - SKY_ALTAR_CY) < 3.6) return 'plaza'
  if (Math.abs(x - SKY_CX) < 2.0) return 'path'
  if (Math.abs(y - SKY_ALTAR_CY) < 1.4) return 'path'
  return 'cloud'
}

const SKY_SPRITE = {
  temple: { sprite: '/images/map/props/skytemple/sky_temple.png', px: { w: 330, h: 319 } },
  guild: { sprite: '/images/map/props/skytemple/sky_guild.png', px: { w: 192, h: 219 } },
  houseA: { sprite: '/images/map/props/skytemple/sky_houseA.png', px: { w: 107, h: 125 } },
  houseB: { sprite: '/images/map/props/skytemple/sky_houseB.png', px: { w: 101, h: 107 } },
  stallA: { sprite: '/images/map/props/skytemple/sky_stallA.png', px: { w: 82, h: 91 } },
  stallB: { sprite: '/images/map/props/skytemple/sky_stallB.png', px: { w: 90, h: 90 } },
  landmark: { sprite: '/images/map/props/skytemple/sky_landmark.png', px: { w: 107, h: 158 } },
  lamp: { sprite: '/images/map/props/skytemple/sky_lamp.png', px: { w: 18, h: 81 } },
  tree: { sprite: '/images/map/props/skytemple/sky_tree.png', px: { w: 69, h: 92 } },
  bench: { sprite: '/images/map/props/skytemple/sky_bench.png', px: { w: 32, h: 8 } },
}

function skyTempleProps(): PropDef[] {
  const P: PropDef[] = []
  P.push({
    id: 'sky-temple-b', kind: 'dome', cell: { x: SKY_CX - 2.8, y: 1.8 }, size: { w: 5.6, d: 4.3 },
    solid: true, label: '천공 대신전', ...SKY_SPRITE.temple,
  })
  P.push({
    id: 'sky-guild', kind: 'shop', cell: { x: 21.0, y: 3.4 }, size: { w: 2.6, d: 2.6 },
    solid: true, label: '바람의 교단', ...SKY_SPRITE.guild,
  })
  // 서쪽 — 순례자 노점 4개(2종 variant)
  const stallSprites = [SKY_SPRITE.stallA, SKY_SPRITE.stallB]
  const stallFoot: [number, number][] = [[1.4, 1.5], [1.5, 1.5]]
  ;[[4.6, 9.0], [8.2, 9.0], [4.6, 18.4], [8.2, 18.4]].forEach(([x, y], i) => {
    const v = i % 2
    P.push({ id: `sky-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: stallFoot[v][0], d: stallFoot[v][1] }, solid: true, ...stallSprites[v] })
  })
  // 동쪽 — 순례자 숙소 4개(2종 variant)
  const houseSprites = [SKY_SPRITE.houseA, SKY_SPRITE.houseB]
  const houseFoot: [number, number][] = [[1.7, 1.6], [1.6, 1.4]]
  ;[[23.4, 9.0], [27.0, 9.0], [23.4, 18.4], [27.0, 18.4]].forEach(([x, y], i) => {
    const v = i % 2
    P.push({ id: `sky-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: houseFoot[v][0], d: houseFoot[v][1] }, solid: true, ...houseSprites[v] })
  })
  // 중앙 — 수정 제단(트레이드마크)
  P.push({
    id: 'sky-landmark', kind: 'fountain', cell: { x: SKY_CX, y: SKY_ALTAR_CY }, size: { w: 1.6, d: 1.6 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '수정 제단', ...SKY_SPRITE.landmark,
  })
  ;[[13.0, 13.6], [19.0, 13.6], [13.0, 16.4], [19.0, 16.4]].forEach(([x, y], i) =>
    P.push({ id: `sky-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.4 }, ...SKY_SPRITE.bench }),
  )
  // 진입로(남북 대로) 가로수 + 가로등 — 항구 → 제단 → 신전
  ;[9.0, 20.0, 24.6].forEach((y, i) => {
    P.push({ id: `sky-lamp${i}a`, kind: 'lamp', cell: { x: 14.1, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })
    P.push({ id: `sky-lamp${i}b`, kind: 'lamp', cell: { x: 17.9, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })
  })
  ;[[10.0, 4.0], [22.0, 4.0], [4.0, 12.0], [28.0, 12.0], [4.0, 21.0], [28.0, 21.0]].forEach(([x, y], i) =>
    P.push({ id: `sky-tree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree }),
  )
  return P
}

const SKY_PROPS = skyTempleProps()
const SKY_BLOCKERS = buildBlockers(SKY_PROPS)

// ── 버려진 신전 (32×28, 어두운 폐허 느낌) ────────────────────────────────────
const RUIN_AW = 32
const RUIN_AH = 28
const RUIN_CX = 16
const RUIN_TEMPLE_CY = 6
const RUIN_ALTAR_CY = 15

function templeRuinTileAt(x: number, y: number): TileKind {
  if (x < 1.6 || x > RUIN_AW - 1.6 || y < 1.6 || y > RUIN_AH - 1.6) return 'dirt'
  if (Math.hypot(x - RUIN_CX, y - RUIN_TEMPLE_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - RUIN_CX, y - RUIN_ALTAR_CY) < 3.6) return 'plaza'
  if (Math.abs(x - RUIN_CX) < 2.0) return 'path'
  if (Math.abs(y - RUIN_ALTAR_CY) < 1.4) return 'path'
  return 'ash'
}

const RUIN_SPRITE = {
  temple: { sprite: '/images/map/props/templeruin/ruin_temple.png', px: { w: 307, h: 294 } },
  guild: { sprite: '/images/map/props/templeruin/ruin_guild.png', px: { w: 197, h: 224 } },
  houseA: { sprite: '/images/map/props/templeruin/ruin_houseA.png', px: { w: 118, h: 119 } },
  houseB: { sprite: '/images/map/props/templeruin/ruin_houseB.png', px: { w: 106, h: 104 } },
  stallA: { sprite: '/images/map/props/templeruin/ruin_stallA.png', px: { w: 92, h: 94 } },
  stallB: { sprite: '/images/map/props/templeruin/ruin_stallB.png', px: { w: 91, h: 91 } },
  landmark: { sprite: '/images/map/props/templeruin/ruin_landmark.png', px: { w: 81, h: 144 } },
  lamp: { sprite: '/images/map/props/templeruin/ruin_lamp.png', px: { w: 23, h: 83 } },
  tree: { sprite: '/images/map/props/templeruin/ruin_tree.png', px: { w: 62, h: 97 } },
  bench: { sprite: '/images/map/props/templeruin/ruin_bench.png', px: { w: 36, h: 24 } },
}

function templeRuinProps(): PropDef[] {
  const P: PropDef[] = []
  P.push({
    id: 'ruin-temple-b', kind: 'dome', cell: { x: RUIN_CX - 2.6, y: 1.8 }, size: { w: 5.2, d: 4.3 },
    solid: true, label: '버려진 신전', ...RUIN_SPRITE.temple,
  })
  P.push({
    id: 'ruin-guild', kind: 'shop', cell: { x: 21.0, y: 3.4 }, size: { w: 2.6, d: 2.6 },
    solid: true, label: '유물 수호단', ...RUIN_SPRITE.guild,
  })
  const stallSprites = [RUIN_SPRITE.stallA, RUIN_SPRITE.stallB]
  ;[[4.6, 9.0], [8.2, 9.0], [4.6, 18.4], [8.2, 18.4]].forEach(([x, y], i) =>
    P.push({ id: `ruin-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.4, d: 1.3 }, solid: true, ...stallSprites[i % 2] }),
  )
  const houseSprites = [RUIN_SPRITE.houseA, RUIN_SPRITE.houseB]
  const houseFoot: [number, number][] = [[1.7, 1.5], [1.6, 1.4]]
  ;[[23.4, 9.0], [27.0, 9.0], [23.4, 18.4], [27.0, 18.4]].forEach(([x, y], i) => {
    const v = i % 2
    P.push({ id: `ruin-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: houseFoot[v][0], d: houseFoot[v][1] }, solid: true, ...houseSprites[v] })
  })
  P.push({
    id: 'ruin-landmark', kind: 'fountain', cell: { x: RUIN_CX, y: RUIN_ALTAR_CY }, size: { w: 1.4, d: 1.4 },
    collide: { w: 1.8, d: 1.8 }, radial: true, solid: true, label: '저주받은 제단', ...RUIN_SPRITE.landmark,
  })
  ;[[13.0, 13.6], [19.0, 13.6], [13.0, 16.4], [19.0, 16.4]].forEach(([x, y], i) =>
    P.push({ id: `ruin-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, ...RUIN_SPRITE.bench }),
  )
  ;[9.0, 20.0, 24.6].forEach((y, i) => {
    P.push({ id: `ruin-lamp${i}a`, kind: 'lamp', cell: { x: 14.1, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })
    P.push({ id: `ruin-lamp${i}b`, kind: 'lamp', cell: { x: 17.9, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })
  })
  ;[[10.0, 4.0], [22.0, 4.0], [4.0, 12.0], [28.0, 12.0], [4.0, 21.0], [28.0, 21.0]].forEach(([x, y], i) =>
    P.push({ id: `ruin-tree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree }),
  )
  return P
}

const RUIN_PROPS = templeRuinProps()
const RUIN_BLOCKERS = buildBlockers(RUIN_PROPS)

// ── 오로라 마을 (32×28, 밝은 남색 설원 느낌) ─────────────────────────────────
const AUR_AW = 32
const AUR_AH = 28
const AUR_CX = 16
const AUR_HALL_CY = 6
const AUR_ALTAR_CY = 15

function auroraTileAt(x: number, y: number): TileKind {
  if (x < 1.6 || x > AUR_AW - 1.6 || y < 1.6 || y > AUR_AH - 1.6) return 'water'
  if (Math.hypot(x - AUR_CX, y - AUR_HALL_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - AUR_CX, y - AUR_ALTAR_CY) < 3.6) return 'plaza'
  if (Math.abs(x - AUR_CX) < 2.0) return 'path'
  if (Math.abs(y - AUR_ALTAR_CY) < 1.4) return 'path'
  return 'ice'
}

const AUR_SPRITE = {
  hall: { sprite: '/images/map/props/aurora/aurora_temple.png', px: { w: 286, h: 288 } },
  guild: { sprite: '/images/map/props/aurora/aurora_guild.png', px: { w: 180, h: 195 } },
  houseA: { sprite: '/images/map/props/aurora/aurora_houseA.png', px: { w: 123, h: 96 } },
  houseB: { sprite: '/images/map/props/aurora/aurora_houseB.png', px: { w: 114, h: 111 } },
  stallA: { sprite: '/images/map/props/aurora/aurora_stallA.png', px: { w: 94, h: 94 } },
  stallB: { sprite: '/images/map/props/aurora/aurora_stallB.png', px: { w: 87, h: 87 } },
  landmark: { sprite: '/images/map/props/aurora/aurora_landmark.png', px: { w: 126, h: 143 } },
  lamp: { sprite: '/images/map/props/aurora/aurora_lamp.png', px: { w: 25, h: 78 } },
  tree: { sprite: '/images/map/props/aurora/aurora_tree.png', px: { w: 64, h: 92 } },
  bench: { sprite: '/images/map/props/aurora/aurora_bench.png', px: { w: 33, h: 22 } },
}

function auroraProps(): PropDef[] {
  const P: PropDef[] = []
  P.push({
    id: 'aurora-hall', kind: 'dome', cell: { x: AUR_CX - 2.5, y: 2.0 }, size: { w: 5.0, d: 4.0 },
    solid: true, label: '오로라 대전당', ...AUR_SPRITE.hall,
  })
  P.push({
    id: 'aurora-guild', kind: 'shop', cell: { x: 21.0, y: 3.4 }, size: { w: 2.6, d: 2.5 },
    solid: true, label: '서리사냥꾼 길드', ...AUR_SPRITE.guild,
  })
  const stallSprites = [AUR_SPRITE.stallA, AUR_SPRITE.stallB]
  ;[[4.6, 9.0], [8.2, 9.0], [4.6, 18.4], [8.2, 18.4]].forEach(([x, y], i) =>
    P.push({ id: `aurora-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.4, d: 1.3 }, solid: true, ...stallSprites[i % 2] }),
  )
  const houseSprites = [AUR_SPRITE.houseA, AUR_SPRITE.houseB]
  const houseFoot: [number, number][] = [[1.8, 1.2], [1.7, 1.5]]
  ;[[23.4, 9.0], [27.0, 9.0], [23.4, 18.4], [27.0, 18.4]].forEach(([x, y], i) => {
    const v = i % 2
    P.push({ id: `aurora-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: houseFoot[v][0], d: houseFoot[v][1] }, solid: true, ...houseSprites[v] })
  })
  P.push({
    id: 'aurora-landmark', kind: 'fountain', cell: { x: AUR_CX, y: AUR_ALTAR_CY }, size: { w: 1.6, d: 1.6 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '오로라 수정탑', ...AUR_SPRITE.landmark,
  })
  ;[[13.0, 13.6], [19.0, 13.6], [13.0, 16.4], [19.0, 16.4]].forEach(([x, y], i) =>
    P.push({ id: `aurora-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.4 }, ...AUR_SPRITE.bench }),
  )
  ;[9.0, 20.0, 24.6].forEach((y, i) => {
    P.push({ id: `aurora-lamp${i}a`, kind: 'lamp', cell: { x: 14.1, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })
    P.push({ id: `aurora-lamp${i}b`, kind: 'lamp', cell: { x: 17.9, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })
  })
  ;[[10.0, 4.0], [22.0, 4.0], [4.0, 12.0], [28.0, 12.0], [4.0, 21.0], [28.0, 21.0]].forEach(([x, y], i) =>
    P.push({ id: `aurora-tree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree }),
  )
  return P
}

const AURORA_PROPS = auroraProps()
const AURORA_BLOCKERS = buildBlockers(AURORA_PROPS)

// ── 마물 마을 (32×28, 화산지대 붉은 느낌) ────────────────────────────────────
const DEMON_AW = 32
const DEMON_AH = 28
const DEMON_CX = 16
const DEMON_FORT_CY = 6
const DEMON_ALTAR_CY = 15

function demonVillageTileAt(x: number, y: number): TileKind {
  if (x < 1.6 || x > DEMON_AW - 1.6 || y < 1.6 || y > DEMON_AH - 1.6) return 'field'
  if (Math.hypot(x - DEMON_CX, y - DEMON_FORT_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - DEMON_CX, y - DEMON_ALTAR_CY) < 3.6) return 'plaza'
  if (Math.abs(x - DEMON_CX) < 2.0) return 'path'
  if (Math.abs(y - DEMON_ALTAR_CY) < 1.4) return 'path'
  return 'obsidian'
}

const DEMON_SPRITE = {
  fortress: { sprite: '/images/map/props/demon/demon_temple.png', px: { w: 298, h: 301 } },
  guild: { sprite: '/images/map/props/demon/demon_guild.png', px: { w: 179, h: 221 } },
  houseA: { sprite: '/images/map/props/demon/demon_houseA.png', px: { w: 113, h: 123 } },
  houseB: { sprite: '/images/map/props/demon/demon_houseB.png', px: { w: 118, h: 120 } },
  stallA: { sprite: '/images/map/props/demon/demon_stallA.png', px: { w: 90, h: 90 } },
  stallB: { sprite: '/images/map/props/demon/demon_stallB.png', px: { w: 95, h: 97 } },
  landmark: { sprite: '/images/map/props/demon/demon_landmark.png', px: { w: 126, h: 152 } },
  lamp: { sprite: '/images/map/props/demon/demon_lamp.png', px: { w: 36, h: 83 } },
  tree: { sprite: '/images/map/props/demon/demon_tree.png', px: { w: 83, h: 106 } },
  bench: { sprite: '/images/map/props/demon/demon_bench.png', px: { w: 40, h: 32 } },
}

function demonVillageProps(): PropDef[] {
  const P: PropDef[] = []
  P.push({
    id: 'demon-fortress', kind: 'dome', cell: { x: DEMON_CX - 2.5, y: 1.9 }, size: { w: 5.0, d: 4.1 },
    solid: true, label: '마물 거성', ...DEMON_SPRITE.fortress,
  })
  P.push({
    id: 'demon-guild', kind: 'shop', cell: { x: 21.0, y: 3.4 }, size: { w: 2.6, d: 2.6 },
    solid: true, label: '마물 용병단', ...DEMON_SPRITE.guild,
  })
  const stallSprites = [DEMON_SPRITE.stallA, DEMON_SPRITE.stallB]
  ;[[4.6, 9.0], [8.2, 9.0], [4.6, 18.4], [8.2, 18.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-stall${i}`, kind: 'stall', cell: { x, y }, size: { w: 1.4, d: 1.3 }, solid: true, ...stallSprites[i % 2] }),
  )
  const houseSprites = [DEMON_SPRITE.houseA, DEMON_SPRITE.houseB]
  ;[[23.4, 9.0], [27.0, 9.0], [23.4, 18.4], [27.0, 18.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-house${i}`, kind: 'cottage', cell: { x, y }, size: { w: 1.7, d: 1.5 }, solid: true, ...houseSprites[i % 2] }),
  )
  P.push({
    id: 'demon-landmark', kind: 'fountain', cell: { x: DEMON_CX, y: DEMON_ALTAR_CY }, size: { w: 1.6, d: 1.6 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '용암 분수', ...DEMON_SPRITE.landmark,
  })
  ;[[13.0, 13.6], [19.0, 13.6], [13.0, 16.4], [19.0, 16.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, ...DEMON_SPRITE.bench }),
  )
  ;[9.0, 20.0, 24.6].forEach((y, i) => {
    P.push({ id: `demon-lamp${i}a`, kind: 'lamp', cell: { x: 14.1, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })
    P.push({ id: `demon-lamp${i}b`, kind: 'lamp', cell: { x: 17.9, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })
  })
  ;[[10.0, 4.0], [22.0, 4.0], [4.0, 12.0], [28.0, 12.0], [4.0, 21.0], [28.0, 21.0]].forEach(([x, y], i) =>
    P.push({ id: `demon-tree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree }),
  )
  return P
}

const DEMON_PROPS = demonVillageProps()
const DEMON_BLOCKERS = buildBlockers(DEMON_PROPS)

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
      { id: 'gate-sea', cell: { x: 43.5, y: 36.6 }, to: 'sea', label: '바다', kind: 'gate', requiredLevel: 3 },
      { id: 'gate-stormhaven', cell: { x: 43.5, y: 36.6 }, to: 'stormhaven', label: '스톰헤이븐', kind: 'gate', requiredLevel: 7 },
      { id: 'gate-ruins', cell: { x: 43.5, y: 36.6 }, to: 'ruins', label: '버려진 폐허', kind: 'gate', requiredLevel: 10 },
      { id: 'gate-snowfield', cell: { x: 43.5, y: 36.6 }, to: 'snowfield', label: '루미나 설원', kind: 'gate', requiredLevel: 15 },
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
    props: FOREST_PROPS,
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

  // ── 바다 계열 (바다 해안 ─▶ 심해 / 아틀란티스 마을[안전]) ──────────────────
  sea: {
    id: 'sea',
    name: '바다 해안',
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
    grid: { w: AW, h: AH },
    bg: 'atlantis',
    render: 'iso',
    assets: 'raster',
    tileAt: atlantisTileAt,
    props: ATLANTIS_PROPS,
    blockers: ATLANTIS_BLOCKERS,
    zones: [
      z('z-atlantis', 'atlantis', '아틀란티스 마을', 0, 0, AW, AH, '#2f86c0', '심해 아래 잠든 수중 도시. 해류로 지은 유리 돔 아래 인어족이 살아간다.'),
    ],
    spawn: { x: ACX, y: 25.8 },
    portals: [
      { id: 'atlantis-exit', cell: { x: ACX, y: 26.5 }, to: 'sea', toSpawn: { x: 10, y: 2.6 }, label: '해안으로', kind: 'exit' },
    ],
  },

  // ── 스톰헤이븐 계열 (스톰헤이븐 ─▶ 천공 신전[안전]) ────────────────────────
  stormhaven: {
    id: 'stormhaven',
    name: '스톰헤이븐',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'sky',
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    recommendedLevel: 7,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'stormhaven-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'stormhaven-sky-temple', cell: { x: 6, y: 1.6 }, to: 'sky-temple', label: '천공 신전', kind: 'portal', requiredLevel: 9 },
    ],
  },
  'sky-temple': {
    id: 'sky-temple',
    name: '천공 신전',
    kind: 'town',
    grid: { w: SKY_AW, h: SKY_AH },
    bg: 'temple',
    render: 'iso',
    assets: 'raster',
    tileAt: skyTempleTileAt,
    props: SKY_PROPS,
    blockers: SKY_BLOCKERS,
    zones: [
      z('z-sky-temple', 'temple', '천공 신전', 0, 0, SKY_AW, SKY_AH, '#d8c98a', '폭풍 위에 떠 있는 하얀 신전. 바람을 읽는 사제들이 순례자를 맞는다.'),
    ],
    spawn: { x: SKY_CX, y: 25.6 },
    portals: [
      { id: 'sky-temple-exit', cell: { x: SKY_CX, y: 26.5 }, to: 'stormhaven', toSpawn: { x: 6, y: 2.6 }, label: '스톰헤이븐으로', kind: 'exit' },
    ],
  },

  // ── 버려진 폐허 계열 (버려진 폐허 ─▶ 버려진 묘지 / 버려진 신전[안전]) ─────
  ruins: {
    id: 'ruins',
    name: '버려진 폐허',
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
      { id: 'ruins-temple', cell: { x: 10, y: 1.6 }, to: 'temple-ruin', label: '버려진 신전', kind: 'portal', requiredLevel: 18 },
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
    name: '버려진 신전',
    kind: 'town',
    grid: { w: RUIN_AW, h: RUIN_AH },
    bg: 'temple',
    render: 'iso',
    assets: 'raster',
    tileAt: templeRuinTileAt,
    props: RUIN_PROPS,
    blockers: RUIN_BLOCKERS,
    zones: [
      z('z-abandoned-temple', 'temple', '버려진 신전', 0, 0, RUIN_AW, RUIN_AH, '#9a8a54', '폐허 깊숙이 남은 옛 신전. 은둔한 수도자들이 유물을 지키며 순례자를 맞는다.'),
    ],
    spawn: { x: RUIN_CX, y: 25.6 },
    portals: [
      { id: 'temple-ruin-exit', cell: { x: RUIN_CX, y: 26.5 }, to: 'ruins', toSpawn: { x: 10, y: 2.6 }, label: '폐허로', kind: 'exit' },
    ],
  },

  // ── 루미나 설원 계열 (루미나 설원 ─▶ 오로라 마을[안전]) ────────────────────
  snowfield: {
    id: 'snowfield',
    name: '루미나 설원',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'snow',
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    recommendedLevel: 15,
    spawn: { x: 6, y: 8.6 },
    portals: [
      { id: 'snowfield-exit', cell: { x: 6, y: 9.4 }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'snowfield-aurora', cell: { x: 6, y: 1.6 }, to: 'aurora-village', label: '오로라 마을', kind: 'portal', requiredLevel: 16 },
    ],
  },
  'aurora-village': {
    id: 'aurora-village',
    name: '오로라 마을',
    kind: 'town',
    grid: { w: AUR_AW, h: AUR_AH },
    bg: 'aurora',
    render: 'iso',
    assets: 'raster',
    tileAt: auroraTileAt,
    props: AURORA_PROPS,
    blockers: AURORA_BLOCKERS,
    zones: [
      z('z-aurora', 'aurora', '오로라 마을', 0, 0, AUR_AW, AUR_AH, '#7fb0d8', '설원 한가운데, 밤이면 하늘에 오로라가 흐르는 얼음집 마을. 설인족과 상인들이 산다.'),
    ],
    spawn: { x: AUR_CX, y: 25.6 },
    portals: [
      { id: 'aurora-exit', cell: { x: AUR_CX, y: 26.5 }, to: 'snowfield', toSpawn: { x: 6, y: 2.6 }, label: '설원으로', kind: 'exit' },
    ],
  },

  // ── 화산 계열 ─────────────────────────────────────────────────────────────
  volcano: {
    id: 'volcano',
    name: '화산지대',
    kind: 'field',
    grid: { w: 12, h: 10 },
    bg: 'volcano',
    props: VOLCANO_PROPS,
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
    kind: 'town',
    grid: { w: DEMON_AW, h: DEMON_AH },
    bg: 'demon',
    render: 'iso',
    assets: 'raster',
    tileAt: demonVillageTileAt,
    props: DEMON_PROPS,
    blockers: DEMON_BLOCKERS,
    zones: [
      z('z-demon-village', 'demon', '마물 마을', 0, 0, DEMON_AW, DEMON_AH, '#3a1230', '화산 기슭에 자리한 마물들의 정착지. 모르스를 따르지 않는 온건파 마물이 교역한다.'),
    ],
    spawn: { x: DEMON_CX, y: 25.6 },
    portals: [
      { id: 'demon-village-exit', cell: { x: DEMON_CX, y: 26.5 }, to: 'volcano', toSpawn: { x: 2, y: 2.6 }, label: '화산지대로', kind: 'exit' },
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
