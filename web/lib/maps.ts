import type { GameMap, MapId, ZoneDef, ZoneKind } from '@/lib/types'
import type { PropDef, TileKind } from '@/lib/iso'
import { propAABB } from '@/lib/iso'
import { mulberry32 } from '@/lib/rng'

type Blocker = { x0: number; y0: number; x1: number; y1: number }

/**
 * 명시적 size/collide 가 없는 "점 배치" 프롭(야생 필드의 나무·기둥 등)에 줄 기본 충돌 반경.
 * kind 기준 — SOLID_KINDS 에 새 kind 를 추가할 때 여기도 같이 채워야 실제로 막힌다.
 */
const DEFAULT_COLLIDE_SIZE: Partial<Record<PropDef['kind'], { w: number; d: number }>> = {
  tree: { w: 0.5, d: 0.5 },
}

/** solid 프롭들의 충돌 사각형을 그림(footprint)에서 그대로 산출 → "보이는 것 = 막히는 것" */
function buildBlockers(props: PropDef[], extra: Blocker[] = []): Blocker[] {
  const out: Blocker[] = [...extra]
  for (const p of props) {
    const solid = p.solid || SOLID_KINDS.has(p.kind)
    if (!solid) continue
    if (p.collide || p.size) {
      const a = propAABB(p)
      if (a) out.push(a)
      continue
    }
    // size/collide 미지정 프롭(야생 필드 fprop 점배치) — kind 기본 반경으로 중심 기준 박스 생성
    const fb = DEFAULT_COLLIDE_SIZE[p.kind]
    if (!fb) continue
    const a = propAABB({ ...p, collide: fb, radial: true })
    if (a) out.push(a)
  }
  return out
}

/** props 배열의 셀 좌표만 균일 스케일(맵 확장 시 기존 배치를 그대로 넓힌다) */
function scaleProps(props: PropDef[], s: number): PropDef[] {
  return props.map((p) => ({ ...p, cell: { x: p.cell.x * s, y: p.cell.y * s } }))
}

/**
 * 빈 공간에 자연물을 흩뿌려 채운다(결정론적 시드) — 지형 확장으로 생긴 여백을
 * 손으로 일일이 배치하지 않고 자연스럽게 메우기 위한 헬퍼.
 */
function scatterProps(
  biome: keyof typeof FIELD_SPRITES,
  pool: string[],
  count: number,
  w: number,
  h: number,
  avoid: { x: number; y: number; r: number }[],
  seed: number,
  idPrefix: string,
  reject?: (x: number, y: number) => boolean,
): PropDef[] {
  const rand = mulberry32(seed)
  const out: PropDef[] = []
  let tries = 0
  while (out.length < count && tries < count * 25) {
    tries++
    const x = 1 + rand() * (w - 2)
    const y = 1 + rand() * (h - 2)
    if (avoid.some((a) => Math.hypot(x - a.x, y - a.y) < a.r)) continue
    if (reject?.(x, y)) continue
    if (out.some((p) => Math.hypot(p.cell.x - x, p.cell.y - y) < 1.7)) continue
    const key = pool[Math.floor(rand() * pool.length)] as keyof (typeof FIELD_SPRITES)[typeof biome]
    out.push(fprop(biome, key, `${idPrefix}${out.length}`, x, y))
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
  // 대성당 앞광장 좌·우 대칭 반사 연못 — 이제 PixelLab 프롭(b-pondL/R)이 물+테두리를
  // 통째로 그려서 바닥 타일로 물을 덧칠할 필요가 없다 (타일 몇 개만 찍은 것처럼 보이던 문제).
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
  // 야생 필드/던전 나무류(fprop 의 'tree' kind — 실제 나무·기둥·첨탑·맹그로브·켈프·현수막대 등
  // 굵은 수직 구조물 전부 포함)도 충돌 처리 — 뚫고 지나가지 못하게. bush/lamp kind(관목·작은
  // 바위·버섯·등불 등)는 저프로필 장식이라 의도적으로 보행 가능하게 둔다.
  'tree',
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
  // 대성당 앞광장 연못 — kind:'fountain' 공용이라 KIND_BUILDING_SPRITE.fountain(중앙광장 분수)로
  // 자동 덮어써지는 걸 막으려면 id 기준 오버라이드가 먼저 매치되어야 한다.
  'b-pondL': B_('temple_pond', 160, 96, 80, 96),
  'b-pondR': B_('temple_pond', 160, 96, 80, 96),
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
  // 대성당 앞광장 좌·우 대칭 반사 연못 — PixelLab 프롭(돌 테두리+수련) 로 교체.
  // radial: true → cell 이 중심점. solid: true → 벤치·나무가 실제 footprint 만큼만 피해감.
  P.push({ id: 'b-pondL', kind: 'fountain', cell: { x: 5.7, y: 33.4 }, size: { w: 2.0, d: 1.2 }, radial: true, solid: true })
  P.push({ id: 'b-pondR', kind: 'fountain', cell: { x: 13.3, y: 33.4 }, size: { w: 2.0, d: 1.2 }, radial: true, solid: true })
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
  // 공원 남측 가로수(y≈31.7)와 겹쳐 지붕을 뚫고 나와 보이던 문제 — 밭 쪽으로 더 내림
  P.push({ id: 'b-farmhouse', kind: 'cottage', cell: { x: 31.0, y: 34.3 }, size: { w: 1.8, d: 1.6 }, variant: 'red' })

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
  // 이 시점엔 아직 종류 기반 solid/radial 플래그 부여 루프(함수 맨 끝)가 안 돌았으므로
  // p.solid 뿐 아니라 SOLID_KINDS 로도 판정해야 건물 footprint 가 실제로 걸러지고,
  // radial 구조물(분수·콜로세움 등, collide 를 직접 지정하고 radial 은 안 적은 경우)도
  // RADIAL_KINDS 로 미리 보정해야 propAABB 가 중심 기준 박스를 계산한다 — 안 그러면
  // "뒤쪽 모서리부터 +collide" 로 잘못 계산되어 실제보다 훨씬 크고 엉뚱한 방향으로 치우친
  // 박스가 나와 멀쩡한 위치의 벤치까지 차단해버린다.
  // (안 그러면 "건물 footprint 와 겹치면 자동 스킵" 주석과 달리 나무·벤치 등이 건물을 뚫고 배치됨).
  const solidBoxes = P.filter((p) => (p.solid || SOLID_KINDS.has(p.kind)) && p.size)
    .map((p) => propAABB(p.radial != null ? p : { ...p, radial: RADIAL_KINDS.has(p.kind) }))
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
    (x > 19.8 && x < 33 && Math.abs(y - 29.9) < 0.7) // 공원 산책로
    // 대성당 연못은 이제 실제 프롭(b-pondL/R, solid+radial)이라 blocked()/solidBoxes 가
    // 정확한 footprint 로 자동 처리 — 예전엔 반경 1.9 짜리 과도한 제외구역이라 근처 벤치까지
    // 전부 조용히 걸러내던 문제가 있었음.
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
  // (원래 y오프셋 -0.2/+2.1 이 대성당 돔 남벽·연못 테두리와 겹쳐 4개 전부 조용히 걸러졌었음 —
  // 돔(y<32.0)·연못(y 32.4~34.4) 사이 빈 공간과 연못 남쪽으로 오프셋 재조정)
  const yardBench: [number, number, 'l' | 'r'][] = [
    [TEMPLE_YARD.x - 2.6, TEMPLE_YARD.y + 0.2, 'l'], [TEMPLE_YARD.x + 2.6, TEMPLE_YARD.y + 0.2, 'r'],
    [TEMPLE_YARD.x - 2.6, TEMPLE_YARD.y + 2.7, 'r'], [TEMPLE_YARD.x + 2.6, TEMPLE_YARD.y + 2.7, 'l'],
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
  // (과거 좌표들이 진입로/대로 판정 경계에 딱 걸쳐 onRoad()에 은근슬쩍 걸러지던 문제 —
  // 분수 진입로 폭 ±2.2, 아케이드 폭 ±1.5, 대로 AV_L/AV_R 과 확실히 떨어지도록 여유를 둠)
  const benchSpots: [number, number, 'l' | 'r'][] = [
    [FOUNTAIN.x - 3.4, FOUNTAIN.y - 2.7, 'l'], [FOUNTAIN.x + 3.4, FOUNTAIN.y - 2.7, 'r'],
    [FOUNTAIN.x - 3.4, FOUNTAIN.y + 2.7, 'r'], [FOUNTAIN.x + 3.4, FOUNTAIN.y + 2.7, 'l'],
    [36.2, 22.2, 'l'], [43.5, 22.2, 'r'], [48.0, 22.2, 'l'], // 아케이드(북측은 상가 건물과 겹쳐 전부 남측으로)
    [COLOSSEUM.x - 5.2, COLOSSEUM.y - 3.2, 'r'], [COLOSSEUM.x + 5.2, COLOSSEUM.y + 3.2, 'l'], // 투기장 대각 코너(동서는 대로에 걸림)
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
  sea: {
    driftwood: { sprite: '/images/map/props/f_sea_driftwood.png', px: { w: 120, h: 56 }, anchor: { x: 60, y: 52 }, kind: 'bush' },
    rock: { sprite: '/images/map/props/f_sea_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 59 }, kind: 'bush' },
    coral: { sprite: '/images/map/props/f_sea_coral.png', px: { w: 80, h: 56 }, anchor: { x: 40, y: 52 }, kind: 'bush' },
    dunegrass: { sprite: '/images/map/props/f_sea_dunegrass.png', px: { w: 56, h: 72 }, anchor: { x: 28, y: 66 }, kind: 'bush' },
  },
  stormhaven: {
    banner: { sprite: '/images/map/props/f_storm_banner.png', px: { w: 56, h: 120 }, anchor: { x: 28, y: 110 }, kind: 'tree' },
    stormgrass: { sprite: '/images/map/props/f_storm_grass.png', px: { w: 64, h: 48 }, anchor: { x: 32, y: 44 }, kind: 'bush' },
    floatrock: { sprite: '/images/map/props/f_storm_rock.png', px: { w: 88, h: 72 }, anchor: { x: 44, y: 66 }, kind: 'bush' },
  },
  ruinsField: {
    pillar: { sprite: '/images/map/props/f_ruins_pillar.png', px: { w: 72, h: 104 }, anchor: { x: 36, y: 96 }, kind: 'tree' },
    rubble: { sprite: '/images/map/props/f_ruins_rubble.png', px: { w: 88, h: 56 }, anchor: { x: 44, y: 52 }, kind: 'bush' },
    crystal: { sprite: '/images/map/props/f_ruins_crystal.png', px: { w: 56, h: 80 }, anchor: { x: 28, y: 74 }, kind: 'lamp' },
    vine: { sprite: '/images/map/props/f_ruins_vine.png', px: { w: 72, h: 48 }, anchor: { x: 36, y: 44 }, kind: 'bush' },
  },
  snowfield: {
    pine: { sprite: '/images/map/props/f_snow_pine.png', px: { w: 96, h: 148 }, anchor: { x: 48, y: 136 }, kind: 'tree' },
    frostrock: { sprite: '/images/map/props/f_snow_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 59 }, kind: 'bush' },
    icicle: { sprite: '/images/map/props/f_snow_icicle.png', px: { w: 64, h: 64 }, anchor: { x: 32, y: 59 }, kind: 'bush' },
    snowmound: { sprite: '/images/map/props/f_snow_mound.png', px: { w: 72, h: 44 }, anchor: { x: 36, y: 40 }, kind: 'bush' },
  },
  cave: {
    crystal: { sprite: '/images/map/props/f_cave_crystal.png', px: { w: 64, h: 88 }, anchor: { x: 32, y: 81 }, kind: 'lamp' },
    stalagmite: { sprite: '/images/map/props/f_cave_stalagmite.png', px: { w: 72, h: 104 }, anchor: { x: 36, y: 96 }, kind: 'tree' },
    mushroom: { sprite: '/images/map/props/f_forest_mushroom.png', px: { w: 72, h: 56 }, anchor: { x: 36, y: 52 }, kind: 'bush' },
    rock: { sprite: '/images/map/props/f_forest_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 60 }, kind: 'bush' },
  },
  mine: {
    orevein: { sprite: '/images/map/props/f_mine_orevein.png', px: { w: 80, h: 60 }, anchor: { x: 40, y: 55 }, kind: 'bush' },
    beam: { sprite: '/images/map/props/f_mine_beam.png', px: { w: 64, h: 112 }, anchor: { x: 32, y: 104 }, kind: 'lamp' },
    cart: { sprite: '/images/map/props/f_mine_cart.png', px: { w: 88, h: 72 }, anchor: { x: 44, y: 66 }, kind: 'bush' },
    rock: { sprite: '/images/map/props/f_forest_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 60 }, kind: 'bush' },
  },
  swamp: {
    reed: { sprite: '/images/map/props/f_swamp_reed.png', px: { w: 56, h: 88 }, anchor: { x: 28, y: 82 }, kind: 'bush' },
    mangrove: { sprite: '/images/map/props/f_swamp_mangrove.png', px: { w: 112, h: 140 }, anchor: { x: 56, y: 130 }, kind: 'tree' },
    lilypad: { sprite: '/images/map/props/f_swamp_lilypad.png', px: { w: 72, h: 40 }, anchor: { x: 36, y: 36 }, kind: 'bush' },
  },
  deepsea: {
    kelp: { sprite: '/images/map/props/f_deepsea_kelp.png', px: { w: 64, h: 100 }, anchor: { x: 32, y: 93 }, kind: 'tree' },
    wreck: { sprite: '/images/map/props/f_deepsea_wreck.png', px: { w: 120, h: 64 }, anchor: { x: 60, y: 59 }, kind: 'bush' },
    coral: { sprite: '/images/map/props/f_sea_coral.png', px: { w: 80, h: 56 }, anchor: { x: 40, y: 52 }, kind: 'bush' },
    rock: { sprite: '/images/map/props/f_sea_rock.png', px: { w: 88, h: 64 }, anchor: { x: 44, y: 59 }, kind: 'bush' },
  },
  graveyard: {
    tombstone: { sprite: '/images/map/props/f_grave_tombstone.png', px: { w: 56, h: 80 }, anchor: { x: 28, y: 74 }, kind: 'bush' },
    deadtree: { sprite: '/images/map/props/f_grave_deadtree.png', px: { w: 96, h: 136 }, anchor: { x: 48, y: 126 }, kind: 'tree' },
    lantern: { sprite: '/images/map/props/f_grave_lantern.png', px: { w: 48, h: 72 }, anchor: { x: 24, y: 66 }, kind: 'lamp' },
  },
  demonCastle: {
    bones: { sprite: '/images/map/props/f_demon_bones.png', px: { w: 80, h: 52 }, anchor: { x: 40, y: 48 }, kind: 'bush' },
    banner: { sprite: '/images/map/props/f_demon_banner.png', px: { w: 56, h: 128 }, anchor: { x: 28, y: 118 }, kind: 'tree' },
    spire: { sprite: '/images/map/props/f_volcano_spire.png', px: { w: 72, h: 144 }, anchor: { x: 36, y: 134 }, kind: 'tree' },
    vent: { sprite: '/images/map/props/f_volcano_vent.png', px: { w: 88, h: 56 }, anchor: { x: 44, y: 50 }, kind: 'bush' },
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

// ── 야생 스테이지 공통 템플릿 ────────────────────────────────────────────────
// 6개 야생 사냥터(숲·바다·스톰헤이븐·폐허·설원·화산) 전부 같은 12×10 원본 골격
// (스폰 6,8.6 / 마을출구 6,9.4 / 포탈 2,1.6·10,1.6 또는 단일 포탈 6,1.6) 을 공유한다.
// "좁아서 답답하다" 피드백 반영 — 1.5배(18×15)에서 2배(24×20)로 더 넓히고,
// 스폰↔포탈을 잇는 굽이치는 통로(nearRoad)를 깔아 시야가 트이게 한다.
const FIELD_SCALE = 2
const FIELD_W = 12 * FIELD_SCALE
const FIELD_H = 10 * FIELD_SCALE
const FIELD_SPAWN = { x: 6 * FIELD_SCALE, y: 8.6 * FIELD_SCALE }
const FIELD_EXIT = { x: 6 * FIELD_SCALE, y: 9.4 * FIELD_SCALE }
const FIELD_PORTAL_L = { x: 2 * FIELD_SCALE, y: 1.6 * FIELD_SCALE }
const FIELD_PORTAL_R = { x: 10 * FIELD_SCALE, y: 1.6 * FIELD_SCALE }
const FIELD_PORTAL_C = { x: 6 * FIELD_SCALE, y: 1.6 * FIELD_SCALE } // 포탈이 하나뿐인 맵(스톰헤이븐·설원)

/** 스폰→목적지 사이 굽이치는 통로 판정 — 통로 폭 안이면 true (지형 타일/장식 배치 양쪽에 사용) */
function nearRoad(
  x: number,
  y: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
  wiggle: number,
): boolean {
  const dy = to.y - from.y
  if (Math.abs(dy) < 0.01) return false
  const t = (y - from.y) / dy
  if (t < -0.08 || t > 1.08) return false
  const baseX = from.x + (to.x - from.x) * t
  const wob = Math.sin(t * Math.PI * 2.4) * wiggle
  return Math.abs(x - (baseX + wob)) < width
}
/** 스폰에서 여러 목적지로 뻗는 통로 중 하나에라도 걸리면 true */
function onFieldRoad(x: number, y: number, targets: { x: number; y: number }[], width = 1.3, wiggle = 1.7): boolean {
  return targets.some((t) => nearRoad(x, y, FIELD_SPAWN, t, width, wiggle))
}

// 에르디아 숲 — 원본 배치를 FIELD_SCALE 만큼 넓히고, 새로 생긴 여백은 scatterProps 로 채운다.
const FOREST_BASE_PROPS: PropDef[] = [
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
const FOREST_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_L.x, y: FIELD_PORTAL_L.y, r: 2.0 },
  { x: FIELD_PORTAL_R.x, y: FIELD_PORTAL_R.y, r: 2.0 },
]
const forestOnRoad = (x: number, y: number) => onFieldRoad(x, y, [FIELD_PORTAL_L, FIELD_PORTAL_R], 1.5, 2.0)
const FOREST_PROPS: PropDef[] = [
  ...scaleProps(FOREST_BASE_PROPS, FIELD_SCALE).filter((p) => !forestOnRoad(p.cell.x, p.cell.y)),
  ...scatterProps(
    'forest',
    ['tree', 'bush', 'bush', 'rock', 'mushroom', 'log', 'firefly'],
    30,
    FIELD_W,
    FIELD_H,
    FOREST_AVOID,
    7301,
    'ftx',
    forestOnRoad,
  ),
]

/** 에르디아 숲 지면 — 스폰↔포탈 굽이치는 오솔길(우선) + 완만한 개울 + 잔디 얼룩 */
function forestTileAt(x: number, y: number): TileKind {
  if (forestOnRoad(x, y)) return 'dirt'
  const streamY = FIELD_H * 0.5 + Math.sin(x * 0.24) * 2.6
  if (Math.abs(y - streamY) < 0.7) return 'water'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 3 ? 'grass-dark' : 'grass'
}

// 화산지대 — forest 와 동일한 원리로 넓히고, 스폰↔포탈 길은 맨 ash 로 정리해 걸어다니기 편하게.
const VOLCANO_BASE_PROPS: PropDef[] = [
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
const VOLCANO_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_L.x, y: FIELD_PORTAL_L.y, r: 2.0 },
  { x: FIELD_PORTAL_R.x, y: FIELD_PORTAL_R.y, r: 2.0 },
]
const volcanoOnRoad = (x: number, y: number) => onFieldRoad(x, y, [FIELD_PORTAL_L, FIELD_PORTAL_R], 1.5, 2.0)
const VOLCANO_PROPS: PropDef[] = [
  ...scaleProps(VOLCANO_BASE_PROPS, FIELD_SCALE).filter((p) => !volcanoOnRoad(p.cell.x, p.cell.y)),
  ...scatterProps(
    'volcano',
    ['spire', 'deadtree', 'rock', 'vent', 'sulfur', 'ashmound'],
    28,
    FIELD_W,
    FIELD_H,
    VOLCANO_AVOID,
    8302,
    'vtx',
    volcanoOnRoad,
  ),
]

/** 화산지대 지면 — 스폰↔포탈 길은 맨 ash로 정리, 나머지는 흑요석 얼룩 */
function volcanoTileAt(x: number, y: number): TileKind {
  if (volcanoOnRoad(x, y)) return 'path'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 4 ? 'ash' : 'obsidian'
}

// ── 바다 해안 — 위쪽 물결치는 해안선, 아래쪽 모래톱 뒤 사구 잔디 ─────────────
/** 해안선(위=바다) — x에 따라 완만히 굽이침 */
function seaShoreline(x: number): number {
  return FIELD_H * 0.27 + Math.sin(x * 0.22) * 2.4
}
function seaTileAt(x: number, y: number): TileKind {
  if (y < seaShoreline(x)) return 'water'
  if (y > FIELD_H - 5.5 + Math.sin(x * 0.22) * 1.6) {
    const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
    return h < 4 ? 'grass-dark' : 'grass'
  }
  const h = (Math.floor(x) * 5 + Math.floor(y) * 11) % 13
  return h < 2 ? 'dirt' : 'sand'
}
const SEA_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_L.x, y: FIELD_PORTAL_L.y, r: 2.0 },
  { x: FIELD_PORTAL_R.x, y: FIELD_PORTAL_R.y, r: 2.0 },
]
const seaOnRoad = (x: number, y: number) => onFieldRoad(x, y, [FIELD_PORTAL_L, FIELD_PORTAL_R], 1.6, 2.2)
const SEA_PROPS: PropDef[] = scatterProps(
  'sea',
  ['driftwood', 'rock', 'coral', 'dunegrass', 'dunegrass'],
  32,
  FIELD_W,
  FIELD_H,
  SEA_AVOID,
  4102,
  'sex',
  (x, y) => y < seaShoreline(x) + 0.6 || seaOnRoad(x, y), // 물속·바로 물가·통행로엔 세우지 않는다
)

// ── 스톰헤이븐 — 구름바다 위, 폭풍에 부서진 돌길이 스폰→천공 신전 포탈까지 굽이쳐 지나간다
function stormhavenTileAt(x: number, y: number): TileKind {
  if (onFieldRoad(x, y, [FIELD_PORTAL_C], 1.6, 2.6)) return 'path'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 9
  return h === 0 ? 'plaza' : 'cloud'
}
const STORM_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_C.x, y: FIELD_PORTAL_C.y, r: 2.2 },
]
const STORM_PROPS: PropDef[] = scatterProps(
  'stormhaven',
  ['banner', 'stormgrass', 'stormgrass', 'floatrock'],
  28,
  FIELD_W,
  FIELD_H,
  STORM_AVOID,
  5203,
  'stx',
  (x, y) => onFieldRoad(x, y, [FIELD_PORTAL_C], 1.6, 2.6),
)

// ── 버려진 폐허(야생) — 깨진 포석·잡초 침식·보랏빛 크리스탈, 포탈까지 넓은 포석 길 ──
const ruinsOnRoad = (x: number, y: number) => onFieldRoad(x, y, [FIELD_PORTAL_L, FIELD_PORTAL_R], 1.6, 2.0)
function ruinsFieldTileAt(x: number, y: number): TileKind {
  if (ruinsOnRoad(x, y)) return 'plaza'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 13
  if (h < 3) return 'plaza'
  if (h < 5) return 'dirt'
  return 'ash'
}
const RUINSF_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_L.x, y: FIELD_PORTAL_L.y, r: 2.0 },
  { x: FIELD_PORTAL_R.x, y: FIELD_PORTAL_R.y, r: 2.0 },
]
const RUINSF_PROPS: PropDef[] = scatterProps(
  'ruinsField',
  ['pillar', 'rubble', 'crystal', 'vine', 'vine'],
  30,
  FIELD_W,
  FIELD_H,
  RUINSF_AVOID,
  6304,
  'rfx',
  ruinsOnRoad,
)

// ── 루미나 설원 — 얼어붙은 연못 두 곳 + 다져진 눈길이 포탈까지 이어진다 ────────
const SNOWF_POND1 = { x: FIELD_W * 0.28, y: FIELD_H * 0.58, r: 2.8 }
const SNOWF_POND2 = { x: FIELD_W * 0.7, y: FIELD_H * 0.32, r: 2.2 }
const snowfOnRoad = (x: number, y: number) => onFieldRoad(x, y, [FIELD_PORTAL_C], 1.6, 2.6)
function snowfieldTileAt(x: number, y: number): TileKind {
  if (snowfOnRoad(x, y)) return 'path'
  if (Math.hypot(x - SNOWF_POND1.x, y - SNOWF_POND1.y) < SNOWF_POND1.r) return 'ice'
  if (Math.hypot(x - SNOWF_POND2.x, y - SNOWF_POND2.y) < SNOWF_POND2.r) return 'ice'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 2 ? 'path' : 'snow'
}
const SNOWF_AVOID = [
  { x: FIELD_SPAWN.x, y: FIELD_SPAWN.y, r: 2.2 },
  { x: FIELD_EXIT.x, y: FIELD_EXIT.y, r: 1.8 },
  { x: FIELD_PORTAL_C.x, y: FIELD_PORTAL_C.y, r: 2.2 },
  { x: SNOWF_POND1.x, y: SNOWF_POND1.y, r: SNOWF_POND1.r + 0.4 },
  { x: SNOWF_POND2.x, y: SNOWF_POND2.y, r: SNOWF_POND2.r + 0.4 },
]
const SNOWF_PROPS: PropDef[] = scatterProps(
  'snowfield',
  ['pine', 'frostrock', 'icicle', 'snowmound'],
  30,
  FIELD_W,
  FIELD_H,
  SNOWF_AVOID,
  7405,
  'sfx',
  snowfOnRoad,
)

// ── 2차 던전(서브 스테이지) 공통 템플릿 — 여태 구 렌더러(반복 텍스처)로 남아있던
// 이끼 동굴·폐광산·안개 늪지·심해·버려진 묘지·모르스의 성을 같은 iso 방식으로 구현.
// 원본 10×8(늪지만 10×10) 골격을 1.8배 넓히고, 스폰 근처는 넉넉히 비워 답답하지 않게 한다.
const SUB_W = 18
const SUB_H = 14
const SUB_SPAWN = { x: 9, y: 11.6 }
const SUB_EXIT = { x: 9, y: 12.9 }
const CAVE_FORWARD = { x: 3.6, y: 2.5 } // 폐광산 갱도 입구

// 이끼 동굴 — 스폰에서 폐광산 입구까지 다져진 길이 이어진다.
function caveTileAt(x: number, y: number): TileKind {
  if (nearRoad(x, y, SUB_SPAWN, CAVE_FORWARD, 1.4, 1.6)) return 'dirt'
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 3 ? 'dirt' : 'cave'
}
const CAVE_AVOID = [
  { x: SUB_SPAWN.x, y: SUB_SPAWN.y, r: 2.0 },
  { x: SUB_EXIT.x, y: SUB_EXIT.y, r: 1.6 },
  { x: CAVE_FORWARD.x, y: CAVE_FORWARD.y, r: 1.8 },
]
const CAVE_PROPS: PropDef[] = scatterProps(
  'cave',
  ['stalagmite', 'crystal', 'mushroom', 'rock'],
  18,
  SUB_W,
  SUB_H,
  CAVE_AVOID,
  9101,
  'cvx',
  (x, y) => nearRoad(x, y, SUB_SPAWN, CAVE_FORWARD, 1.4, 1.6),
)

// 폐광산 — 막다른 갱도. 광맥·갱목·수레를 산개.
function mineTileAt(x: number, y: number): TileKind {
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 3 ? 'dirt' : 'mine'
}
const MINE_AVOID = [
  { x: SUB_SPAWN.x, y: SUB_SPAWN.y, r: 2.2 },
  { x: SUB_EXIT.x, y: SUB_EXIT.y, r: 1.8 },
]
const MINE_PROPS: PropDef[] = scatterProps('mine', ['orevein', 'beam', 'cart', 'rock'], 18, SUB_W, SUB_H, MINE_AVOID, 9202, 'mnx')

// 안개 늪지 — 막다른 늪. 웅덩이 사이 갈대·맹그로브·수련.
const SWAMP_W = 18
const SWAMP_H = 18
const SWAMP_SPAWN = { x: 9, y: 15.5 }
const SWAMP_EXIT = { x: 9, y: 16.9 }
function swampTileAt(x: number, y: number): TileKind {
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 9
  if (h === 0) return 'water'
  return h < 4 ? 'dirt' : 'swamp'
}
const SWAMP_AVOID = [
  { x: SWAMP_SPAWN.x, y: SWAMP_SPAWN.y, r: 2.2 },
  { x: SWAMP_EXIT.x, y: SWAMP_EXIT.y, r: 1.8 },
]
const SWAMP_PROPS: PropDef[] = scatterProps('swamp', ['reed', 'reed', 'mangrove', 'lilypad'], 22, SWAMP_W, SWAMP_H, SWAMP_AVOID, 9303, 'swx')

// 심해 — 막다른 해저. 수초·난파선 잔해, 바다 프롭 재사용.
function deepseaTileAt(x: number, y: number): TileKind {
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 13
  return h < 3 ? 'sand' : 'water'
}
const DEEPSEA_AVOID = [
  { x: SUB_SPAWN.x, y: SUB_SPAWN.y, r: 2.2 },
  { x: SUB_EXIT.x, y: SUB_EXIT.y, r: 1.8 },
]
const DEEPSEA_PROPS: PropDef[] = scatterProps('deepsea', ['kelp', 'kelp', 'wreck', 'coral', 'rock'], 18, SUB_W, SUB_H, DEEPSEA_AVOID, 9404, 'dsx')

// 버려진 묘지 — 막다른 묘역. 비석·고사목·도깨비불.
function graveyardTileAt(x: number, y: number): TileKind {
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 3 ? 'dirt' : 'ash'
}
const GRAVEYARD_AVOID = [
  { x: SUB_SPAWN.x, y: SUB_SPAWN.y, r: 2.2 },
  { x: SUB_EXIT.x, y: SUB_EXIT.y, r: 1.8 },
]
const GRAVEYARD_PROPS: PropDef[] = scatterProps(
  'graveyard',
  ['tombstone', 'tombstone', 'deadtree', 'lantern'],
  20,
  SUB_W,
  SUB_H,
  GRAVEYARD_AVOID,
  9505,
  'grx',
)

// 모르스의 성 — 최종 던전 입구. 흑요석 바닥에 뼈무더기·마물 깃발, 화산 프롭 재사용.
function demonCastleTileAt(x: number, y: number): TileKind {
  const h = (Math.floor(x) * 7 + Math.floor(y) * 13) % 11
  return h < 4 ? 'ash' : 'obsidian'
}
const DEMONCASTLE_AVOID = [
  { x: SUB_SPAWN.x, y: SUB_SPAWN.y, r: 2.2 },
  { x: SUB_EXIT.x, y: SUB_EXIT.y, r: 1.8 },
]
const DEMONCASTLE_PROPS: PropDef[] = scatterProps(
  'demonCastle',
  ['bones', 'banner', 'spire', 'vent'],
  18,
  SUB_W,
  SUB_H,
  DEMONCASTLE_AVOID,
  9606,
  'dcx',
)

// ── 아틀란티스 마을 (64×56 — ATLANTIS REBUILD PLAN 기준, 기존 32×28 대비 가로×2/세로×2=면적×4) ──
// 북(위)=대성당(랜드마크) · 중앙=분수광장 · 서(왼)=상점가 · 동(오)=마을회관/길드
// · 중앙~남 사이(신설)=주거구역(집 7채) · 남=해양공원 · 최남단=마을 입구(정원문+부두).
// 셀당 화면픽셀(ISO_TILE_W/H)과 건물 스프라이트 픽셀 크기는 고정이므로, 맵을 키운 만큼
// "건물이 커지는" 게 아니라 "건물 사이 여백·도로·신설 주거구역이 늘어난다".
const AW = 64
const AH = 56
const ACX = 32 // 환영길·길드·공원 광장 중심 x — 모든 구역 X 50%
// ATLANTIS REBUILD PLAN(2차) 퍼센트 좌표 반영: 성당 Y16% · 광장 Y38.5% · 주거 Y58% · 해양공원 Y75% · 입구 Y92.5%
const CATHEDRAL_Y0 = 7 // 대성당 footprint 상단(중심 ≈ 56×16% = 9)
const GUILD_CY = 23 // 분수광장/상점가/회관 열 중심 y (56×38.5% ≈ 21.6, 반올림)
const RESIDENTIAL_CY = 32 // 주거구역 중심 y (56×58% ≈ 32.5)
const PARK_CY = 42 // 해양공원 중심 y (56×75% = 42)
const ENTRANCE_CY = 52 // 마을 입구 중심 y (56×92.5% ≈ 51.8) — 정원문·부두 전용, PARK_CY와 독립
const SHOP_CX = ACX - 14.4 // 상점가 중심 x (64×27.5% ≈ 17.6 목표, 20~35% 범위 충족)
const HALL_CX = ACX + 13.8 // 길드 중심 x (64×71.5% ≈ 45.8 목표, 65~78% 범위 충족)

const ATLANTIS_ISLAND_CY = 30 // 대성당(y≈7)~마을입구(y≈53) 전체를 아우르는 섬 세로 중심

/**
 * 참고자료(아틀란티스 마을 참고 자료.png)처럼 각진 사각 경계 대신, 각도별 물결 노이즈로 굴곡진 섬 해안선을 만든다.
 * 안전 반경(rx/ry 최소치)은 실제 배치물 범위(성당 y≈7, 상점가 x≈SHOP_CX-8, 길드 x≈HALL_CX+8, 마을입구/부두 y≈53)를
 * 전부 감싸고도 남도록 잡는다 — 웨이브가 안쪽으로 파고들어 섬 밖(물)으로 밀려나는 회귀버그 방지.
 */
function atlantisIslandNorm(x: number, y: number): number {
  const dx = x - ACX
  const dy = y - ATLANTIS_ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

function atlantisTileAt(x: number, y: number): TileKind {
  const norm = atlantisIslandNorm(x, y)
  // 해안선 바깥 = 깊은 물, 해안선 바로 안쪽 = 산호 흩어진 얕은 여울(=물 타일 재사용, 소품으로 산호 배치)
  if (norm > 1) return 'water'
  // 참고자료는 맨땅(sand)이 거의 안 보이고 포석 광장 + 손질된 회양목 정원이 지면 전체를 채운다 —
  // 대성당 앞 정원 광장(북) · 해양공원 광장(남) · 분수 광장(중앙) — 원형 포석
  if (Math.hypot(x - ACX, y - (CATHEDRAL_Y0 + 3.4)) < 5.4) return 'plaza'
  if (Math.hypot(x - ACX, y - PARK_CY) < 5.8) return 'plaza'
  if (Math.hypot(x - ACX, y - GUILD_CY) < 4.4) return 'plaza'
  // 회관·상점가 앞 마당도 포석으로
  if (Math.hypot(x - HALL_CX, y - (GUILD_CY - 1.4)) < 3.4) return 'plaza'
  if (Math.hypot(x - SHOP_CX, y - (GUILD_CY - 0.6)) < 3.6) return 'plaza'
  // 환영길(남북 대로, 마을입구 ↔ 공원 ↔ 주거구역 ↔ 광장 ↔ 대성당) — 폭 4.4로 넉넉하게, 맵 전체를 관통
  if (Math.abs(x - ACX) < 2.2) return 'path'
  // 동서 교차로(상점가 ↔ 광장 ↔ 회관) — 폭 3.2
  if (Math.abs(y - GUILD_CY) < 1.6) return 'path'
  // 신설 주거구역 진입 교차로(서/동 주택 클러스터 ↔ 환영길) — 폭 2.8
  if (Math.abs(y - RESIDENTIAL_CY) < 1.4) return 'path'
  // 참고자료의 대각선 X자 산책로 — 중앙 분수에서 네 방향 대각선으로 뻗어 4개의 정원 쐐기를 나눈다
  const rdx = x - ACX
  const rdy = y - GUILD_CY
  if (Math.hypot(rdx, rdy) < 12.5 && (Math.abs(rdx - rdy) < 1.2 || Math.abs(rdx + rdy) < 1.2)) return 'path'
  // 그 외 지면은 전부 손질된 회양목 정원 잔디(참고자료의 정원 쐐기·앞마당 느낌) — sand는 더 이상 기본값이 아님
  return 'grass'
}

// PixelLab 생성 → sharp 트림 완료 (public/images/map/props/atlantis/). 건물 비중을 키우고
// 집·상점 각 3종 variant로 단조로움을 없앴다.
const ATLANTIS_SPRITE = {
  // 참고자료(각 마을 배치도 참고 자료.png) 재현 — 북:궁전(신규) / 동:마을회관(신규) / 서:상점가(신규) / 중앙:분수(신규)
  palace: { sprite: '/images/map/props/atlantis/atl_palace_new.png', px: { w: 320, h: 307 } },
  hall: { sprite: '/images/map/props/atlantis/atl_hall_new.png', px: { w: 184, h: 175 } },
  // 상점가는 참고자료(2차) 요구대로 연립 1장 대신 개별 건물 4종으로 분리 제작(붙이지 않고 각자 여백 확보)
  shopA: { sprite: '/images/map/props/atlantis/atl_shopA_new.png', px: { w: 100, h: 118 } },
  shopB: { sprite: '/images/map/props/atlantis/atl_shopB_new.png', px: { w: 99, h: 116 } },
  shopC: { sprite: '/images/map/props/atlantis/atl_shopC_new.png', px: { w: 99, h: 119 } },
  shopD: { sprite: '/images/map/props/atlantis/atl_shopD_new.png', px: { w: 107, h: 121 } },
  fountain: { sprite: '/images/map/props/atlantis/atl_fountain_new.png', px: { w: 113, h: 143 } },
  reef: { sprite: '/images/map/props/atlantis/atl_reef_new.png', px: { w: 65, h: 48 } },
  dock: { sprite: '/images/map/props/atlantis/atl_dock_new.png', px: { w: 128, h: 80 } },
  gate: { sprite: '/images/map/props/atlantis/atl_gate_new.png', px: { w: 122, h: 105 } },
  // house/houseC = 둥근 지붕, 쿼터뷰 정합 확인 후 재활용(houseB는 정면뷰 첨탑이라 폐기)
  house: { sprite: '/images/map/props/atlantis/atl_house.png', px: { w: 104, h: 111 } },
  houseC: { sprite: '/images/map/props/atlantis/atl_houseC.png', px: { w: 102, h: 125 } },
  houseD: { sprite: '/images/map/props/atlantis/atl_houseD_new.png', px: { w: 121, h: 111 } },
  // stall류·무역상관 = 쿼터뷰 정합 확인 후 재활용
  stall: { sprite: '/images/map/props/atlantis/atl_stall.png', px: { w: 84, h: 84 } },
  stallB: { sprite: '/images/map/props/atlantis/atl_stallB.png', px: { w: 81, h: 91 } },
  stallC: { sprite: '/images/map/props/atlantis/atl_stallC.png', px: { w: 76, h: 87 } },
  tradinghouse: { sprite: '/images/map/props/atlantis/atl_tradinghouse.png', px: { w: 166, h: 177 } },
  gazebo: { sprite: '/images/map/props/atlantis/atl_gazebo.png', px: { w: 67, h: 77 } },
  tidepool: { sprite: '/images/map/props/atlantis/atl_tidepool.png', px: { w: 46, h: 33 } },
  // 기존 bench(정면뷰 소파)는 폐기, 쿼터뷰로 신규 제작
  bench: { sprite: '/images/map/props/atlantis/atl_bench_new.png', px: { w: 38, h: 40 } },
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

  // ════════ 북: 아틀란티스 대성당 (참고자료 랜드마크, X 50%/Y 16%, 중앙 정렬) ════════
  P.push({
    id: 'atl-palace', kind: 'dome', cell: { x: ACX - 2.7, y: CATHEDRAL_Y0 }, size: { w: 5.4, d: 3.8 },
    solid: true, label: '아틀란티스 대성당', ...ATLANTIS_SPRITE.palace,
  })
  ;[[ACX - 5.0, CATHEDRAL_Y0 + 4.6], [ACX + 5.0, CATHEDRAL_Y0 + 4.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-guard${i}`, kind: 'statue', cell: { x, y }, size: { w: 0.6, d: 0.5 }, solid: true, ...ATLANTIS_SPRITE.guard }),
  )
  ;[[ACX - 4.2, CATHEDRAL_Y0 + 4.8], [ACX + 4.2, CATHEDRAL_Y0 + 4.8]].forEach(([x, y], i) =>
    P.push({ id: `atl-pkelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[ACX - 3.2, CATHEDRAL_Y0 + 5.4], [ACX + 3.2, CATHEDRAL_Y0 + 5.4], [ACX - 1.6, CATHEDRAL_Y0 + 5.6], [ACX + 1.6, CATHEDRAL_Y0 + 5.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-ptopiary${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary }),
  )
  ;[[ACX - 5.6, CATHEDRAL_Y0 + 3.0], [ACX + 5.6, CATHEDRAL_Y0 + 3.0], [ACX - 4.6, CATHEDRAL_Y0 + 6.4], [ACX + 4.6, CATHEDRAL_Y0 + 6.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-pflower${i}`, kind: 'bush', cell: { x, y }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed }),
  )

  // ════════ 중앙: 광장 분수(랜드마크) ════════
  P.push({
    id: 'atl-fountain', kind: 'fountain', cell: { x: ACX - 0.95, y: GUILD_CY - 1.4 }, size: { w: 1.9, d: 2.0 },
    collide: { w: 2.2, d: 2.2 }, radial: true, solid: true, label: '중앙 분수', ...ATLANTIS_SPRITE.fountain,
  })
  ;[[ACX - 4.4, GUILD_CY - 1.4], [ACX + 4.4, GUILD_CY - 1.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-cbanner${i}`, kind: 'banner', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.banner }),
  )
  ;[[ACX - 2.6, GUILD_CY - 3.0], [ACX + 2.6, GUILD_CY - 3.0], [ACX - 2.6, GUILD_CY + 0.2], [ACX + 2.6, GUILD_CY + 0.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-cflower${i}`, kind: 'bush', cell: { x, y }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed }),
  )
  // 대각선 산책로 사이 4개 정원 쐐기 — 참고자료의 손질된 회양목 화단을 격자로 빼곡하게(NE/NW/SE/SW), 빈 땅이 안 보이게
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], qi) => {
    const bx = ACX + sx * 3.6
    const by = GUILD_CY + sy * 3.2
    // 3×2 격자 회양목 — 촘촘한 정형 정원
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        P.push({
          id: `atl-wedge${qi}-topiary${gx}-${gy}`, kind: 'bush',
          cell: { x: bx + sx * gx * 1.3, y: by + sy * gy * 1.3 }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary,
        })
      }
    }
    P.push({ id: `atl-wedge${qi}-flower0`, kind: 'bush', cell: { x: bx + sx * 0.6, y: by + sy * 2.6 }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed })
    P.push({ id: `atl-wedge${qi}-flower1`, kind: 'bush', cell: { x: bx + sx * 3.0, y: by + sy * 0.6 }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed })
    P.push({ id: `atl-wedge${qi}-kelp0`, kind: 'tree', cell: { x: bx - sx * 0.8, y: by + sy * 0.4 }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp })
    P.push({ id: `atl-wedge${qi}-kelp1`, kind: 'tree', cell: { x: bx + sx * 3.4, y: by + sy * 2.4 }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp })
    P.push({ id: `atl-wedge${qi}-lamp`, kind: 'lamp', cell: { x: bx + sx * 1.6, y: by - sy * 0.8 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
  })

  // ════════ 동: 마을회관/길드 (X 65~78% → HALL_CX) ════════
  P.push({
    id: 'atl-hall', kind: 'shop', cell: { x: HALL_CX, y: GUILD_CY - 2.6 }, size: { w: 3.1, d: 2.3 },
    solid: true, label: '마을 회관', ...ATLANTIS_SPRITE.hall,
  })
  P.push({ id: 'atl-notice', kind: 'postbox', cell: { x: HALL_CX + 4.0, y: GUILD_CY - 1.0 }, size: { w: 0.5, d: 0.4 }, ...ATLANTIS_SPRITE.noticeboard })
  ;[[HALL_CX + 0.2, GUILD_CY - 5.2], [HALL_CX + 5.0, GUILD_CY - 5.2], [HALL_CX + 0.2, GUILD_CY + 1.4], [HALL_CX + 5.0, GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-hkelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  P.push({ id: 'atl-hlamp0', kind: 'lamp', cell: { x: HALL_CX + 4.0, y: GUILD_CY - 3.6 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })

  // ════════ 서: 상점가 (X 20~35% → SHOP_CX) — 개별 건물 4채, 사이 간격 확보(붙이지 않음) ════════
  const shopSprites = [ATLANTIS_SPRITE.shopA, ATLANTIS_SPRITE.shopB, ATLANTIS_SPRITE.shopC, ATLANTIS_SPRITE.shopD]
  const shopOffsets: [number, number][] = [[-3.4, -1.0], [-1.0, -1.4], [1.4, -1.0], [3.8, -1.4]]
  shopOffsets.forEach(([ox, oy], i) =>
    P.push({
      id: `atl-shop${i}`, kind: 'shop', cell: { x: SHOP_CX + ox, y: GUILD_CY + oy }, size: { w: 1.7, d: 1.9 },
      solid: true, label: `상점 ${i + 1}`, ...shopSprites[i],
    }),
  )
  ;[[SHOP_CX - 5.2, GUILD_CY - 4.6], [SHOP_CX + 5.8, GUILD_CY - 4.6], [SHOP_CX - 5.2, GUILD_CY + 1.4], [SHOP_CX + 5.8, GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-skelp${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[SHOP_CX - 2.2, GUILD_CY - 4.8], [SHOP_CX - 2.2, GUILD_CY + 1.6]].forEach(([x, y], i) =>
    P.push({ id: `atl-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp }),
  )
  ;[[SHOP_CX - 6.6, GUILD_CY - 1.2], [SHOP_CX + 3.6, GUILD_CY - 1.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-sbarrel${i}`, kind: 'trashbin', cell: { x, y }, size: { w: 0.5, d: 0.5 }, ...ATLANTIS_SPRITE.barrel }),
  )

  // ════════ 신설: 주거구역 (광장↔해양공원 사이, 참고자료 5번 구역) — 서3채+동3채, 3종 variant 로테이션 ════════
  const houseSprites = [ATLANTIS_SPRITE.house, ATLANTIS_SPRITE.houseC, ATLANTIS_SPRITE.houseD]
  const houseFoot: [number, number][] = [[1.7, 1.5], [1.7, 1.5], [1.9, 1.5]]
  const westHouseX = ACX - 9
  const eastHouseX = ACX + 7
  const houseRows = [RESIDENTIAL_CY - 6, RESIDENTIAL_CY, RESIDENTIAL_CY + 6]
  houseRows.forEach((hy, ri) => {
    const wv = ri % 3
    P.push({ id: `atl-house-w${ri}`, kind: 'cottage', cell: { x: westHouseX, y: hy }, size: { w: houseFoot[wv][0], d: houseFoot[wv][1] }, solid: true, ...houseSprites[wv] })
    P.push({ id: `atl-hflower-w${ri}`, kind: 'bush', cell: { x: westHouseX + 2.4, y: hy + 0.4 }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed })
    const ev = (ri + 1) % 3
    P.push({ id: `atl-house-e${ri}`, kind: 'cottage', cell: { x: eastHouseX, y: hy }, size: { w: houseFoot[ev][0], d: houseFoot[ev][1] }, solid: true, ...houseSprites[ev] })
    P.push({ id: `atl-hflower-e${ri}`, kind: 'bush', cell: { x: eastHouseX - 1.6, y: hy + 0.4 }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed })
  })
  ;[[westHouseX + 3.6, RESIDENTIAL_CY - 3], [westHouseX + 3.6, RESIDENTIAL_CY + 3], [eastHouseX - 2.6, RESIDENTIAL_CY - 3], [eastHouseX - 2.6, RESIDENTIAL_CY + 3]].forEach(([x, y], i) =>
    P.push({ id: `atl-hkelp-r${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  P.push({ id: 'atl-rlamp0', kind: 'lamp', cell: { x: ACX - 2.6, y: RESIDENTIAL_CY }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
  P.push({ id: 'atl-rlamp1', kind: 'lamp', cell: { x: ACX + 2.4, y: RESIDENTIAL_CY }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })

  // ════════ 남: 해양정원 / 분수공원 (중앙 분수와 동일 에셋 재사용, 쿼터뷰 정합) ════════
  P.push({
    id: 'atl-parkfountain', kind: 'fountain', cell: { x: ACX - 0.95, y: PARK_CY - 0.6 }, size: { w: 1.9, d: 2.0 },
    collide: { w: 2.2, d: 2.2 }, radial: true, solid: true, label: '해양정원', ...ATLANTIS_SPRITE.fountain,
  })
  P.push({ id: 'atl-gazebo', kind: 'gazebo', cell: { x: ACX + 5.8, y: PARK_CY - 0.6 }, size: { w: 1.3, d: 1.3 }, solid: true, ...ATLANTIS_SPRITE.gazebo })
  P.push({ id: 'atl-tidepool', kind: 'fountain', cell: { x: ACX - 5.8, y: PARK_CY - 0.4 }, size: { w: 1.0, d: 0.7 }, radial: true, ...ATLANTIS_SPRITE.tidepool })
  // 참고자료의 좌우 대칭 쌍둥이 분수(중앙 분수 ↔ 남쪽 가장 아래 분수 사이 열)
  ;[[ACX - 4.4, PARK_CY - 4.2], [ACX + 4.4, PARK_CY - 4.2]].forEach(([x, y], i) =>
    P.push({
      id: `atl-twinfountain${i}`, kind: 'fountain', cell: { x, y }, size: { w: 1.5, d: 1.6 },
      collide: { w: 1.8, d: 1.8 }, radial: true, solid: true, label: '정원 분수', ...ATLANTIS_SPRITE.fountain,
    }),
  )
  // 벤치는 길 안쪽(분수 쪽)을 바라보도록 중심선(ACX) 기준 좌/우 반전 — 서쪽 벤치만 좌우 미러
  ;[[ACX - 3.0, PARK_CY - 2.0], [ACX + 3.0, PARK_CY - 2.0], [ACX - 3.0, PARK_CY + 2.4], [ACX + 3.0, PARK_CY + 2.4], [ACX - 5.6, PARK_CY + 0.6], [ACX + 5.8, PARK_CY + 0.6]].forEach(([x, y], i) =>
    P.push({
      id: `atl-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 },
      facing: x < ACX ? 'left' : undefined, ...ATLANTIS_SPRITE.bench,
    }),
  )
  ;[[ACX - 8.2, PARK_CY - 2.4], [ACX + 8.2, PARK_CY - 2.4], [ACX - 8.2, PARK_CY + 3.0], [ACX + 8.2, PARK_CY + 3.0], [ACX - 4.2, PARK_CY + 3.4], [ACX + 4.2, PARK_CY + 3.4]].forEach(([x, y], i) =>
    P.push({ id: `atl-flower${i}`, kind: 'bush', cell: { x, y }, size: { w: 1.0, d: 0.5 }, ...ATLANTIS_SPRITE.flowerbed }),
  )
  ;[[ACX - 9.8, PARK_CY - 1.8], [ACX + 9.8, PARK_CY - 1.8], [ACX - 9.8, PARK_CY + 3.2], [ACX + 9.8, PARK_CY + 3.2]].forEach(([x, y], i) =>
    P.push({ id: `atl-pkelp2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...ATLANTIS_SPRITE.kelp }),
  )
  ;[[ACX - 6.6, PARK_CY - 3.9], [ACX + 6.6, PARK_CY - 3.9]].forEach(([x, y], i) =>
    P.push({ id: `atl-gtopiary${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.7, d: 0.5 }, ...ATLANTIS_SPRITE.topiary }),
  )
  P.push({ id: 'atl-citizen0', kind: 'statue', cell: { x: ACX - 1.8, y: PARK_CY + 1.6 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.citizen })
  P.push({ id: 'atl-citizen1', kind: 'statue', cell: { x: ACX + 2.0, y: PARK_CY - 1.0 }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.citizen })

  // ════════ 해안선 산호 군집 + 부두 — 참고자료의 물가 디테일 ════════
  ;[
    [ACX - 20.5, GUILD_CY + 0.5], [ACX + 20.7, GUILD_CY + 0.5], [ACX - 12.0, CATHEDRAL_Y0 - 2.6], [ACX + 12.2, CATHEDRAL_Y0 - 2.6],
    [ACX - 18.0, RESIDENTIAL_CY], [ACX + 18.2, RESIDENTIAL_CY],
    [ACX - 13.0, PARK_CY + 1.7], [ACX + 13.2, PARK_CY + 1.7], [ACX - 6.4, ENTRANCE_CY + 0.5], [ACX + 6.6, ENTRANCE_CY + 0.5],
  ].forEach(([x, y], i) =>
    P.push({ id: `atl-reef${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.9, d: 0.7 }, ...ATLANTIS_SPRITE.reef }),
  )
  ;[[ACX - 4.0, ENTRANCE_CY + 1.3], [ACX + 4.2, ENTRANCE_CY + 1.3]].forEach(([x, y], i) =>
    P.push({ id: `atl-dock${i}`, kind: 'wall', cell: { x, y }, size: { w: 2.1, d: 1.3 }, ...ATLANTIS_SPRITE.dock }),
  )
  // 참고자료 남쪽 끝(Y 92.5%) 쌍둥이 첨탑 정원문 — 출구 포탈 통로 위에 장식으로만(비충돌), 플레이어가 그대로 통과
  P.push({ id: 'atl-gate', kind: 'gate', cell: { x: ACX - 1.15, y: ENTRANCE_CY - 1.0 }, size: { w: 2.3, d: 2.0 }, label: '아틀란티스 정원문', ...ATLANTIS_SPRITE.gate })

  // ════════ 환영길(대로) 가로등 — 대성당 → 분수광장 → 주거구역 → 해양공원 → 마을입구 ════════
  ;[CATHEDRAL_Y0 + 3.4, GUILD_CY + 4.6, RESIDENTIAL_CY - 4.5, RESIDENTIAL_CY + 4.5, PARK_CY - 3.5].forEach((y, i) => {
    P.push({ id: `atl-blamp${i}a`, kind: 'lamp', cell: { x: ACX - 2.1, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
    P.push({ id: `atl-blamp${i}b`, kind: 'lamp', cell: { x: ACX + 1.9, y }, size: { w: 0.4, d: 0.4 }, ...ATLANTIS_SPRITE.lamp })
  })

  return P
}

const ATLANTIS_PROPS = atlantisProps()
const ATLANTIS_BLOCKERS = buildBlockers(ATLANTIS_PROPS)

// ── 천공 신전 (64×56 — 아틀란티스와 동일한 좌표 공식: 가로×2/세로×2=면적×4, 퍼센트 존) ──
// 북(Y16%)=대신전(랜드마크) · 중앙(Y38.5%)=수정분수광장 · 서(X27.5%)=상점가 · 동(X71.5%)=마을회관
// · 남(Y75%)=하늘정원 · 최남단(Y92.5%)=진입로. 구름바다에 뜬 섬 — 물 대신 구름/얼음 경계.
const SKY_AW = 64
const SKY_AH = 56
const SKY_CX = 32
const SKY_TEMPLE_Y0 = 7
const SKY_GUILD_CY = 23
const SKY_PARK_CY = 42
const SKY_ENTRANCE_CY = 52
const SKY_SHOP_CX = SKY_CX - 14.4
const SKY_HALL_CX = SKY_CX + 13.8
const SKY_ISLAND_CY = 30

function skyIslandNorm(x: number, y: number): number {
  const dx = x - SKY_CX
  const dy = y - SKY_ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

function skyTempleTileAt(x: number, y: number): TileKind {
  if (skyIslandNorm(x, y) > 1) return 'water'
  if (Math.hypot(x - SKY_CX, y - (SKY_TEMPLE_Y0 + 3.4)) < 5.4) return 'plaza'
  if (Math.hypot(x - SKY_CX, y - SKY_PARK_CY) < 5.8) return 'plaza'
  if (Math.hypot(x - SKY_CX, y - SKY_GUILD_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - SKY_HALL_CX, y - (SKY_GUILD_CY - 1.4)) < 3.4) return 'plaza'
  if (Math.hypot(x - SKY_SHOP_CX, y - (SKY_GUILD_CY - 0.6)) < 3.6) return 'plaza'
  if (Math.abs(x - SKY_CX) < 2.2) return 'path'
  if (Math.abs(y - SKY_GUILD_CY) < 1.6) return 'path'
  const rdx = x - SKY_CX
  const rdy = y - SKY_GUILD_CY
  if (Math.hypot(rdx, rdy) < 12.5 && (Math.abs(rdx - rdy) < 1.2 || Math.abs(rdx + rdy) < 1.2)) return 'path'
  return 'cloud'
}

const SKY_SPRITE = {
  temple: { sprite: '/images/map/props/skytemple/sky_temple_new.png', px: { w: 229, h: 297 } },
  hall: { sprite: '/images/map/props/skytemple/sky_hall_new.png', px: { w: 147, h: 159 } },
  shopA: { sprite: '/images/map/props/skytemple/sky_shopA_new.png', px: { w: 91, h: 109 } },
  shopB: { sprite: '/images/map/props/skytemple/sky_shopB_new.png', px: { w: 99, h: 126 } },
  shopC: { sprite: '/images/map/props/skytemple/sky_shopC_new.png', px: { w: 82, h: 116 } },
  shopD: { sprite: '/images/map/props/skytemple/sky_shopD_new.png', px: { w: 97, h: 113 } },
  fountain: { sprite: '/images/map/props/skytemple/sky_fountain_new.png', px: { w: 102, h: 154 } },
  gate: { sprite: '/images/map/props/atlantis/atl_gate_new.png', px: { w: 122, h: 105 } },
  reef: { sprite: '/images/map/props/atlantis/atl_reef_new.png', px: { w: 65, h: 48 } },
  bench: { sprite: '/images/map/props/atlantis/atl_bench_new.png', px: { w: 38, h: 40 } },
  lamp: { sprite: '/images/map/props/skytemple/sky_lamp.png', px: { w: 18, h: 81 } },
  tree: { sprite: '/images/map/props/skytemple/sky_tree.png', px: { w: 69, h: 92 } },
}

function skyTempleProps(): PropDef[] {
  const P: PropDef[] = []

  // ════════ 북: 천공 대신전 (X50%/Y16%) ════════
  P.push({
    id: 'sky-temple-b', kind: 'dome', cell: { x: SKY_CX - 2.7, y: SKY_TEMPLE_Y0 }, size: { w: 5.4, d: 3.8 },
    solid: true, label: '천공 대신전', ...SKY_SPRITE.temple,
  })
  ;[[SKY_CX - 4.2, SKY_TEMPLE_Y0 + 4.8], [SKY_CX + 4.2, SKY_TEMPLE_Y0 + 4.8]].forEach(([x, y], i) =>
    P.push({ id: `sky-ptree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree }),
  )
  ;[[SKY_CX - 2.2, SKY_TEMPLE_Y0 + 5.6], [SKY_CX + 2.2, SKY_TEMPLE_Y0 + 5.6]].forEach(([x, y], i) =>
    P.push({ id: `sky-plamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp }),
  )

  // ════════ 중앙: 수정 분수 광장(X50%/Y38.5%) — 대각선 정원 쐐기 포함 ════════
  P.push({
    id: 'sky-fountain', kind: 'fountain', cell: { x: SKY_CX - 0.85, y: SKY_GUILD_CY - 1.4 }, size: { w: 1.7, d: 1.9 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '수정 분수', ...SKY_SPRITE.fountain,
  })
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], qi) => {
    const bx = SKY_CX + sx * 3.6
    const by = SKY_GUILD_CY + sy * 3.2
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        P.push({
          id: `sky-wedge${qi}-tree${gx}-${gy}`, kind: 'tree',
          cell: { x: bx + sx * gx * 1.4, y: by + sy * gy * 1.4 }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree,
        })
      }
    }
    P.push({ id: `sky-wedge${qi}-lamp`, kind: 'lamp', cell: { x: bx + sx * 1.6, y: by - sy * 0.8 }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })
  })

  // ════════ 동: 마을회관(X71.5%) ════════
  P.push({
    id: 'sky-hall', kind: 'shop', cell: { x: SKY_HALL_CX, y: SKY_GUILD_CY - 2.4 }, size: { w: 2.9, d: 2.5 },
    solid: true, label: '바람의 교단 회관', ...SKY_SPRITE.hall,
  })
  ;[[SKY_HALL_CX + 0.2, SKY_GUILD_CY - 5.2], [SKY_HALL_CX + 4.8, SKY_GUILD_CY - 5.2], [SKY_HALL_CX + 0.2, SKY_GUILD_CY + 1.4], [SKY_HALL_CX + 4.8, SKY_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `sky-htree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree }),
  )
  P.push({ id: 'sky-hlamp0', kind: 'lamp', cell: { x: SKY_HALL_CX + 4.0, y: SKY_GUILD_CY - 3.6 }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })

  // ════════ 서: 상점가(X27.5%) — 개별 건물 4채, 간격 확보 ════════
  const shopSprites = [SKY_SPRITE.shopA, SKY_SPRITE.shopB, SKY_SPRITE.shopC, SKY_SPRITE.shopD]
  const shopOffsets: [number, number][] = [[-3.4, -1.0], [-1.0, -1.4], [1.4, -1.0], [3.8, -1.4]]
  shopOffsets.forEach(([ox, oy], i) =>
    P.push({
      id: `sky-shop${i}`, kind: 'shop', cell: { x: SKY_SHOP_CX + ox, y: SKY_GUILD_CY + oy }, size: { w: 1.6, d: 1.8 },
      solid: true, label: `상점 ${i + 1}`, ...shopSprites[i],
    }),
  )
  ;[[SKY_SHOP_CX - 5.2, SKY_GUILD_CY - 4.6], [SKY_SHOP_CX + 5.8, SKY_GUILD_CY - 4.6], [SKY_SHOP_CX - 5.2, SKY_GUILD_CY + 1.4], [SKY_SHOP_CX + 5.8, SKY_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `sky-stree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree }),
  )
  ;[[SKY_SHOP_CX - 2.2, SKY_GUILD_CY - 4.8], [SKY_SHOP_CX - 2.2, SKY_GUILD_CY + 1.6]].forEach(([x, y], i) =>
    P.push({ id: `sky-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp }),
  )

  // ════════ 남: 하늘정원(X50%/Y75%) ════════
  P.push({
    id: 'sky-parkfountain', kind: 'fountain', cell: { x: SKY_CX - 0.85, y: SKY_PARK_CY - 0.6 }, size: { w: 1.7, d: 1.9 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '하늘정원 분수', ...SKY_SPRITE.fountain,
  })
  ;[[SKY_CX - 3.0, SKY_PARK_CY - 2.0], [SKY_CX + 3.0, SKY_PARK_CY - 2.0], [SKY_CX - 3.0, SKY_PARK_CY + 2.4], [SKY_CX + 3.0, SKY_PARK_CY + 2.4]].forEach(([x, y], i) =>
    P.push({ id: `sky-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, facing: x < SKY_CX ? 'left' : undefined, ...SKY_SPRITE.bench }),
  )
  ;[[SKY_CX - 8.2, SKY_PARK_CY - 2.4], [SKY_CX + 8.2, SKY_PARK_CY - 2.4], [SKY_CX - 8.2, SKY_PARK_CY + 3.0], [SKY_CX + 8.2, SKY_PARK_CY + 3.0]].forEach(([x, y], i) =>
    P.push({ id: `sky-ptree2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...SKY_SPRITE.tree }),
  )

  // ════════ 해안선(구름바다) 장식 + 마을입구 ════════
  ;[
    [SKY_CX - 20.5, SKY_GUILD_CY + 0.5], [SKY_CX + 20.7, SKY_GUILD_CY + 0.5],
    [SKY_CX - 18.0, 32], [SKY_CX + 18.2, 32],
    [SKY_CX - 13.0, SKY_PARK_CY + 1.7], [SKY_CX + 13.2, SKY_PARK_CY + 1.7],
  ].forEach(([x, y], i) =>
    P.push({ id: `sky-reef${i}`, kind: 'bush', cell: { x, y }, size: { w: 0.9, d: 0.7 }, ...SKY_SPRITE.reef }),
  )
  P.push({ id: 'sky-gate', kind: 'gate', cell: { x: SKY_CX - 1.15, y: SKY_ENTRANCE_CY - 1.0 }, size: { w: 2.3, d: 2.0 }, label: '천공 신전 정원문', ...SKY_SPRITE.gate })

  // ════════ 대로 가로등 — 신전 → 광장 → 정원 → 입구 ════════
  ;[SKY_TEMPLE_Y0 + 3.4, SKY_GUILD_CY + 4.6, SKY_PARK_CY - 3.5].forEach((y, i) => {
    P.push({ id: `sky-blamp${i}a`, kind: 'lamp', cell: { x: SKY_CX - 2.1, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })
    P.push({ id: `sky-blamp${i}b`, kind: 'lamp', cell: { x: SKY_CX + 1.9, y }, size: { w: 0.4, d: 0.4 }, ...SKY_SPRITE.lamp })
  })

  return P
}

const SKY_PROPS = skyTempleProps()
const SKY_BLOCKERS = buildBlockers(SKY_PROPS)

// ── 버려진 신전 (32×28, 어두운 폐허 느낌) ────────────────────────────────────
const RUIN_AW = 64
const RUIN_AH = 56
const RUIN_CX = 32
const RUIN_TEMPLE_Y0 = 7
const RUIN_GUILD_CY = 23
const RUIN_PARK_CY = 42
const RUIN_ENTRANCE_CY = 52
const RUIN_SHOP_CX = RUIN_CX - 14.4
const RUIN_HALL_CX = RUIN_CX + 13.8
const RUIN_ISLAND_CY = 30

function ruinIslandNorm(x: number, y: number): number {
  const dx = x - RUIN_CX
  const dy = y - RUIN_ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

function templeRuinTileAt(x: number, y: number): TileKind {
  if (ruinIslandNorm(x, y) > 1) return 'dirt'
  if (Math.hypot(x - RUIN_CX, y - (RUIN_TEMPLE_Y0 + 3.4)) < 5.4) return 'plaza'
  if (Math.hypot(x - RUIN_CX, y - RUIN_PARK_CY) < 5.8) return 'plaza'
  if (Math.hypot(x - RUIN_CX, y - RUIN_GUILD_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - RUIN_HALL_CX, y - (RUIN_GUILD_CY - 1.4)) < 3.4) return 'plaza'
  if (Math.hypot(x - RUIN_SHOP_CX, y - (RUIN_GUILD_CY - 0.6)) < 3.6) return 'plaza'
  if (Math.abs(x - RUIN_CX) < 2.2) return 'path'
  if (Math.abs(y - RUIN_GUILD_CY) < 1.6) return 'path'
  const rdx = x - RUIN_CX
  const rdy = y - RUIN_GUILD_CY
  if (Math.hypot(rdx, rdy) < 12.5 && (Math.abs(rdx - rdy) < 1.2 || Math.abs(rdx + rdy) < 1.2)) return 'path'
  return 'ash'
}

const RUIN_SPRITE = {
  temple: { sprite: '/images/map/props/templeruin/ruin_temple.png', px: { w: 307, h: 294 } },
  guild: { sprite: '/images/map/props/templeruin/ruin_guild.png', px: { w: 197, h: 224 } },
  shopA: { sprite: '/images/map/props/templeruin/ruin_shopA_new.png', px: { w: 65, h: 82 } },
  shopB: { sprite: '/images/map/props/templeruin/ruin_shopB_new.png', px: { w: 103, h: 121 } },
  shopC: { sprite: '/images/map/props/templeruin/ruin_shopC_new.png', px: { w: 96, h: 120 } },
  shopD: { sprite: '/images/map/props/templeruin/ruin_shopD_new.png', px: { w: 103, h: 120 } },
  landmark: { sprite: '/images/map/props/templeruin/ruin_landmark.png', px: { w: 81, h: 144 } },
  lamp: { sprite: '/images/map/props/templeruin/ruin_lamp.png', px: { w: 23, h: 83 } },
  tree: { sprite: '/images/map/props/templeruin/ruin_tree.png', px: { w: 62, h: 97 } },
  bench: { sprite: '/images/map/props/atlantis/atl_bench_new.png', px: { w: 38, h: 40 } },
  gate: { sprite: '/images/map/props/atlantis/atl_gate_new.png', px: { w: 122, h: 105 } },
}

function templeRuinProps(): PropDef[] {
  const P: PropDef[] = []

  // ════════ 북: 버려진 신전(X50%/Y16%) ════════
  P.push({
    id: 'ruin-temple-b', kind: 'dome', cell: { x: RUIN_CX - 2.6, y: RUIN_TEMPLE_Y0 }, size: { w: 5.2, d: 4.3 },
    solid: true, label: '버려진 신전', ...RUIN_SPRITE.temple,
  })
  ;[[RUIN_CX - 4.2, RUIN_TEMPLE_Y0 + 5.2], [RUIN_CX + 4.2, RUIN_TEMPLE_Y0 + 5.2]].forEach(([x, y], i) =>
    P.push({ id: `ruin-ptree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree }),
  )
  ;[[RUIN_CX - 2.2, RUIN_TEMPLE_Y0 + 6.0], [RUIN_CX + 2.2, RUIN_TEMPLE_Y0 + 6.0]].forEach(([x, y], i) =>
    P.push({ id: `ruin-plamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp }),
  )

  // ════════ 중앙: 저주받은 제단(X50%/Y38.5%) — 대각선 정원 쐐기 ════════
  P.push({
    id: 'ruin-landmark', kind: 'fountain', cell: { x: RUIN_CX, y: RUIN_GUILD_CY - 1.4 }, size: { w: 1.4, d: 1.4 },
    collide: { w: 1.8, d: 1.8 }, radial: true, solid: true, label: '저주받은 제단', ...RUIN_SPRITE.landmark,
  })
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], qi) => {
    const bx = RUIN_CX + sx * 3.6
    const by = RUIN_GUILD_CY + sy * 3.2
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        P.push({
          id: `ruin-wedge${qi}-tree${gx}-${gy}`, kind: 'tree',
          cell: { x: bx + sx * gx * 1.4, y: by + sy * gy * 1.4 }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree,
        })
      }
    }
    P.push({ id: `ruin-wedge${qi}-lamp`, kind: 'lamp', cell: { x: bx + sx * 1.6, y: by - sy * 0.8 }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })
  })

  // ════════ 동: 길드/관리 건물(X71.5%) ════════
  P.push({
    id: 'ruin-guild', kind: 'shop', cell: { x: RUIN_HALL_CX, y: RUIN_GUILD_CY - 2.4 }, size: { w: 2.6, d: 2.6 },
    solid: true, label: '유물 수호단', ...RUIN_SPRITE.guild,
  })
  ;[[RUIN_HALL_CX + 0.2, RUIN_GUILD_CY - 5.2], [RUIN_HALL_CX + 4.8, RUIN_GUILD_CY - 5.2], [RUIN_HALL_CX + 0.2, RUIN_GUILD_CY + 1.4], [RUIN_HALL_CX + 4.8, RUIN_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `ruin-htree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree }),
  )
  P.push({ id: 'ruin-hlamp0', kind: 'lamp', cell: { x: RUIN_HALL_CX + 4.0, y: RUIN_GUILD_CY - 3.6 }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })

  // ════════ 서: 어두운 상점가(X27.5%) — 개별 건물 4채 ════════
  const shopSprites = [RUIN_SPRITE.shopA, RUIN_SPRITE.shopB, RUIN_SPRITE.shopC, RUIN_SPRITE.shopD]
  const shopOffsets: [number, number][] = [[-3.4, -1.0], [-1.0, -1.4], [1.4, -1.0], [3.8, -1.4]]
  shopOffsets.forEach(([ox, oy], i) =>
    P.push({
      id: `ruin-shop${i}`, kind: 'shop', cell: { x: RUIN_SHOP_CX + ox, y: RUIN_GUILD_CY + oy }, size: { w: 1.7, d: 1.9 },
      solid: true, label: `상점 ${i + 1}`, ...shopSprites[i],
    }),
  )
  ;[[RUIN_SHOP_CX - 5.2, RUIN_GUILD_CY - 4.6], [RUIN_SHOP_CX + 5.8, RUIN_GUILD_CY - 4.6], [RUIN_SHOP_CX - 5.2, RUIN_GUILD_CY + 1.4], [RUIN_SHOP_CX + 5.8, RUIN_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `ruin-stree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree }),
  )
  ;[[RUIN_SHOP_CX - 2.2, RUIN_GUILD_CY - 4.8], [RUIN_SHOP_CX - 2.2, RUIN_GUILD_CY + 1.6]].forEach(([x, y], i) =>
    P.push({ id: `ruin-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp }),
  )

  // ════════ 남: 폐허 정원/조각상(X50%/Y75%) ════════
  ;[[RUIN_CX - 3.0, RUIN_PARK_CY - 2.0], [RUIN_CX + 3.0, RUIN_PARK_CY - 2.0], [RUIN_CX - 3.0, RUIN_PARK_CY + 2.4], [RUIN_CX + 3.0, RUIN_PARK_CY + 2.4]].forEach(([x, y], i) =>
    P.push({ id: `ruin-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, facing: x < RUIN_CX ? 'left' : undefined, ...RUIN_SPRITE.bench }),
  )
  ;[[RUIN_CX - 8.2, RUIN_PARK_CY - 2.4], [RUIN_CX + 8.2, RUIN_PARK_CY - 2.4], [RUIN_CX - 8.2, RUIN_PARK_CY + 3.0], [RUIN_CX + 8.2, RUIN_PARK_CY + 3.0]].forEach(([x, y], i) =>
    P.push({ id: `ruin-ptree2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.6, d: 0.6 }, ...RUIN_SPRITE.tree }),
  )

  // ════════ 마을입구(Y92.5%) ════════
  P.push({ id: 'ruin-gate', kind: 'gate', cell: { x: RUIN_CX - 1.15, y: RUIN_ENTRANCE_CY - 1.0 }, size: { w: 2.3, d: 2.0 }, label: '폐허 정원문', ...RUIN_SPRITE.gate })

  // ════════ 대로 가로등 ════════
  ;[RUIN_TEMPLE_Y0 + 3.4, RUIN_GUILD_CY + 4.6, RUIN_PARK_CY - 3.5].forEach((y, i) => {
    P.push({ id: `ruin-blamp${i}a`, kind: 'lamp', cell: { x: RUIN_CX - 2.1, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })
    P.push({ id: `ruin-blamp${i}b`, kind: 'lamp', cell: { x: RUIN_CX + 1.9, y }, size: { w: 0.4, d: 0.4 }, ...RUIN_SPRITE.lamp })
  })

  return P
}

const RUIN_PROPS = templeRuinProps()
const RUIN_BLOCKERS = buildBlockers(RUIN_PROPS)

// ── 오로라 마을 (32×28, 밝은 남색 설원 느낌) ─────────────────────────────────
const AUR_AW = 64
const AUR_AH = 56
const AUR_CX = 32
const AUR_TEMPLE_Y0 = 7
const AUR_GUILD_CY = 23
const AUR_PARK_CY = 42
const AUR_ENTRANCE_CY = 52
const AUR_SHOP_CX = AUR_CX - 14.4
const AUR_HALL_CX = AUR_CX + 13.8
const AUR_ISLAND_CY = 30

function auroraIslandNorm(x: number, y: number): number {
  const dx = x - AUR_CX
  const dy = y - AUR_ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

function auroraTileAt(x: number, y: number): TileKind {
  if (auroraIslandNorm(x, y) > 1) return 'water'
  if (Math.hypot(x - AUR_CX, y - (AUR_TEMPLE_Y0 + 3.4)) < 5.4) return 'plaza'
  if (Math.hypot(x - AUR_CX, y - AUR_PARK_CY) < 5.8) return 'plaza'
  if (Math.hypot(x - AUR_CX, y - AUR_GUILD_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - AUR_HALL_CX, y - (AUR_GUILD_CY - 1.4)) < 3.4) return 'plaza'
  if (Math.hypot(x - AUR_SHOP_CX, y - (AUR_GUILD_CY - 0.6)) < 3.6) return 'plaza'
  if (Math.abs(x - AUR_CX) < 2.2) return 'path'
  if (Math.abs(y - AUR_GUILD_CY) < 1.6) return 'path'
  const rdx = x - AUR_CX
  const rdy = y - AUR_GUILD_CY
  if (Math.hypot(rdx, rdy) < 12.5 && (Math.abs(rdx - rdy) < 1.2 || Math.abs(rdx + rdy) < 1.2)) return 'path'
  return 'ice'
}

const AUR_SPRITE = {
  temple: { sprite: '/images/map/props/aurora/aurora_temple_new.png', px: { w: 297, h: 305 } },
  hall: { sprite: '/images/map/props/aurora/aurora_hall_new.png', px: { w: 188, h: 194 } },
  shopA: { sprite: '/images/map/props/aurora/aurora_shopA_new.png', px: { w: 107, h: 123 } },
  shopB: { sprite: '/images/map/props/aurora/aurora_shopB_new.png', px: { w: 106, h: 116 } },
  shopC: { sprite: '/images/map/props/aurora/aurora_shopC_new.png', px: { w: 97, h: 118 } },
  shopD: { sprite: '/images/map/props/aurora/aurora_shopD_new.png', px: { w: 102, h: 108 } },
  landmark: { sprite: '/images/map/props/aurora/aurora_landmark.png', px: { w: 126, h: 143 } },
  lamp: { sprite: '/images/map/props/aurora/aurora_lamp.png', px: { w: 25, h: 78 } },
  tree: { sprite: '/images/map/props/aurora/aurora_tree.png', px: { w: 64, h: 92 } },
  bench: { sprite: '/images/map/props/atlantis/atl_bench_new.png', px: { w: 38, h: 40 } },
  gate: { sprite: '/images/map/props/atlantis/atl_gate_new.png', px: { w: 122, h: 105 } },
}

function auroraProps(): PropDef[] {
  const P: PropDef[] = []

  // ════════ 북: 설원 성소(X50%/Y16%) ════════
  P.push({
    id: 'aurora-temple', kind: 'dome', cell: { x: AUR_CX - 2.7, y: AUR_TEMPLE_Y0 }, size: { w: 5.4, d: 3.8 },
    solid: true, label: '설원 성소', ...AUR_SPRITE.temple,
  })
  ;[[AUR_CX - 4.2, AUR_TEMPLE_Y0 + 4.8], [AUR_CX + 4.2, AUR_TEMPLE_Y0 + 4.8]].forEach(([x, y], i) =>
    P.push({ id: `aurora-ptree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree }),
  )
  ;[[AUR_CX - 2.2, AUR_TEMPLE_Y0 + 5.6], [AUR_CX + 2.2, AUR_TEMPLE_Y0 + 5.6]].forEach(([x, y], i) =>
    P.push({ id: `aurora-plamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp }),
  )

  // ════════ 중앙: 오로라 수정탑 분수(X50%/Y38.5%) — 대각선 정원 쐐기 ════════
  P.push({
    id: 'aurora-landmark', kind: 'fountain', cell: { x: AUR_CX, y: AUR_GUILD_CY - 1.4 }, size: { w: 1.6, d: 1.6 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '오로라 수정탑', ...AUR_SPRITE.landmark,
  })
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], qi) => {
    const bx = AUR_CX + sx * 3.6
    const by = AUR_GUILD_CY + sy * 3.2
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        P.push({
          id: `aurora-wedge${qi}-tree${gx}-${gy}`, kind: 'tree',
          cell: { x: bx + sx * gx * 1.4, y: by + sy * gy * 1.4 }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree,
        })
      }
    }
    P.push({ id: `aurora-wedge${qi}-lamp`, kind: 'lamp', cell: { x: bx + sx * 1.6, y: by - sy * 0.8 }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })
  })

  // ════════ 동: 마을회관(X71.5%) ════════
  P.push({
    id: 'aurora-hall', kind: 'shop', cell: { x: AUR_HALL_CX, y: AUR_GUILD_CY - 2.4 }, size: { w: 2.9, d: 2.4 },
    solid: true, label: '오로라 마을회관', ...AUR_SPRITE.hall,
  })
  ;[[AUR_HALL_CX + 0.2, AUR_GUILD_CY - 5.2], [AUR_HALL_CX + 4.8, AUR_GUILD_CY - 5.2], [AUR_HALL_CX + 0.2, AUR_GUILD_CY + 1.4], [AUR_HALL_CX + 4.8, AUR_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `aurora-htree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree }),
  )
  P.push({ id: 'aurora-hlamp0', kind: 'lamp', cell: { x: AUR_HALL_CX + 4.0, y: AUR_GUILD_CY - 3.6 }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })

  // ════════ 서: 상점가(X27.5%) — 개별 건물 4채 ════════
  const shopSprites = [AUR_SPRITE.shopA, AUR_SPRITE.shopB, AUR_SPRITE.shopC, AUR_SPRITE.shopD]
  const shopOffsets: [number, number][] = [[-3.4, -1.0], [-1.0, -1.4], [1.4, -1.0], [3.8, -1.4]]
  shopOffsets.forEach(([ox, oy], i) =>
    P.push({
      id: `aurora-shop${i}`, kind: 'shop', cell: { x: AUR_SHOP_CX + ox, y: AUR_GUILD_CY + oy }, size: { w: 1.7, d: 1.9 },
      solid: true, label: `상점 ${i + 1}`, ...shopSprites[i],
    }),
  )
  ;[[AUR_SHOP_CX - 5.2, AUR_GUILD_CY - 4.6], [AUR_SHOP_CX + 5.8, AUR_GUILD_CY - 4.6], [AUR_SHOP_CX - 5.2, AUR_GUILD_CY + 1.4], [AUR_SHOP_CX + 5.8, AUR_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `aurora-stree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree }),
  )
  ;[[AUR_SHOP_CX - 2.2, AUR_GUILD_CY - 4.8], [AUR_SHOP_CX - 2.2, AUR_GUILD_CY + 1.6]].forEach(([x, y], i) =>
    P.push({ id: `aurora-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp }),
  )

  // ════════ 남: 눈 정원/호수 정원(X50%/Y75%) ════════
  ;[[AUR_CX - 3.0, AUR_PARK_CY - 2.0], [AUR_CX + 3.0, AUR_PARK_CY - 2.0], [AUR_CX - 3.0, AUR_PARK_CY + 2.4], [AUR_CX + 3.0, AUR_PARK_CY + 2.4]].forEach(([x, y], i) =>
    P.push({ id: `aurora-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, facing: x < AUR_CX ? 'left' : undefined, ...AUR_SPRITE.bench }),
  )
  ;[[AUR_CX - 8.2, AUR_PARK_CY - 2.4], [AUR_CX + 8.2, AUR_PARK_CY - 2.4], [AUR_CX - 8.2, AUR_PARK_CY + 3.0], [AUR_CX + 8.2, AUR_PARK_CY + 3.0]].forEach(([x, y], i) =>
    P.push({ id: `aurora-ptree2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...AUR_SPRITE.tree }),
  )

  // ════════ 마을입구(Y92.5%) ════════
  P.push({ id: 'aurora-gate', kind: 'gate', cell: { x: AUR_CX - 1.15, y: AUR_ENTRANCE_CY - 1.0 }, size: { w: 2.3, d: 2.0 }, label: '설원 정원문', ...AUR_SPRITE.gate })

  // ════════ 대로 가로등 ════════
  ;[AUR_TEMPLE_Y0 + 3.4, AUR_GUILD_CY + 4.6, AUR_PARK_CY - 3.5].forEach((y, i) => {
    P.push({ id: `aurora-blamp${i}a`, kind: 'lamp', cell: { x: AUR_CX - 2.1, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })
    P.push({ id: `aurora-blamp${i}b`, kind: 'lamp', cell: { x: AUR_CX + 1.9, y }, size: { w: 0.4, d: 0.4 }, ...AUR_SPRITE.lamp })
  })

  return P
}

const AURORA_PROPS = auroraProps()
const AURORA_BLOCKERS = buildBlockers(AURORA_PROPS)

// ── 마물 마을 (32×28, 화산지대 붉은 느낌) ────────────────────────────────────
const DEMON_AW = 64
const DEMON_AH = 56
const DEMON_CX = 32
const DEMON_TEMPLE_Y0 = 7
const DEMON_GUILD_CY = 23
const DEMON_PARK_CY = 42
const DEMON_ENTRANCE_CY = 52
const DEMON_SHOP_CX = DEMON_CX - 14.4
const DEMON_HALL_CX = DEMON_CX + 13.8
const DEMON_ISLAND_CY = 30

function demonIslandNorm(x: number, y: number): number {
  const dx = x - DEMON_CX
  const dy = y - DEMON_ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

function demonVillageTileAt(x: number, y: number): TileKind {
  if (demonIslandNorm(x, y) > 1) return 'field'
  if (Math.hypot(x - DEMON_CX, y - (DEMON_TEMPLE_Y0 + 3.4)) < 5.4) return 'plaza'
  if (Math.hypot(x - DEMON_CX, y - DEMON_PARK_CY) < 5.8) return 'plaza'
  if (Math.hypot(x - DEMON_CX, y - DEMON_GUILD_CY) < 4.4) return 'plaza'
  if (Math.hypot(x - DEMON_HALL_CX, y - (DEMON_GUILD_CY - 1.4)) < 3.4) return 'plaza'
  if (Math.hypot(x - DEMON_SHOP_CX, y - (DEMON_GUILD_CY - 0.6)) < 3.6) return 'plaza'
  if (Math.abs(x - DEMON_CX) < 2.2) return 'path'
  if (Math.abs(y - DEMON_GUILD_CY) < 1.6) return 'path'
  const rdx = x - DEMON_CX
  const rdy = y - DEMON_GUILD_CY
  if (Math.hypot(rdx, rdy) < 12.5 && (Math.abs(rdx - rdy) < 1.2 || Math.abs(rdx + rdy) < 1.2)) return 'path'
  return 'obsidian'
}

const DEMON_SPRITE = {
  fortress: { sprite: '/images/map/props/demon/demon_temple.png', px: { w: 298, h: 301 } },
  hall: { sprite: '/images/map/props/demon/demon_hall_new.png', px: { w: 183, h: 196 } },
  shopA: { sprite: '/images/map/props/demon/demon_shopA_new.png', px: { w: 102, h: 114 } },
  shopB: { sprite: '/images/map/props/demon/demon_shopB_new.png', px: { w: 79, h: 93 } },
  shopC: { sprite: '/images/map/props/demon/demon_shopC_new.png', px: { w: 107, h: 125 } },
  shopD: { sprite: '/images/map/props/demon/demon_shopD_new.png', px: { w: 76, h: 85 } },
  landmark: { sprite: '/images/map/props/demon/demon_landmark.png', px: { w: 126, h: 152 } },
  lamp: { sprite: '/images/map/props/demon/demon_lamp.png', px: { w: 36, h: 83 } },
  tree: { sprite: '/images/map/props/demon/demon_tree.png', px: { w: 83, h: 106 } },
  bench: { sprite: '/images/map/props/atlantis/atl_bench_new.png', px: { w: 38, h: 40 } },
  gate: { sprite: '/images/map/props/atlantis/atl_gate_new.png', px: { w: 122, h: 105 } },
}

function demonVillageProps(): PropDef[] {
  const P: PropDef[] = []

  // ════════ 북: 화산 성채(X50%/Y16%) ════════
  P.push({
    id: 'demon-fortress', kind: 'dome', cell: { x: DEMON_CX - 2.5, y: DEMON_TEMPLE_Y0 }, size: { w: 5.0, d: 4.1 },
    solid: true, label: '화산 성채', ...DEMON_SPRITE.fortress,
  })
  ;[[DEMON_CX - 4.2, DEMON_TEMPLE_Y0 + 5.0], [DEMON_CX + 4.2, DEMON_TEMPLE_Y0 + 5.0]].forEach(([x, y], i) =>
    P.push({ id: `demon-ptree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree }),
  )
  ;[[DEMON_CX - 2.2, DEMON_TEMPLE_Y0 + 5.8], [DEMON_CX + 2.2, DEMON_TEMPLE_Y0 + 5.8]].forEach(([x, y], i) =>
    P.push({ id: `demon-plamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp }),
  )

  // ════════ 중앙: 용암 분수(X50%/Y38.5%) — 대각선 정원 쐐기 ════════
  P.push({
    id: 'demon-landmark', kind: 'fountain', cell: { x: DEMON_CX, y: DEMON_GUILD_CY - 1.4 }, size: { w: 1.6, d: 1.6 },
    collide: { w: 2.0, d: 2.0 }, radial: true, solid: true, label: '용암 분수', ...DEMON_SPRITE.landmark,
  })
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], qi) => {
    const bx = DEMON_CX + sx * 3.6
    const by = DEMON_GUILD_CY + sy * 3.2
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        P.push({
          id: `demon-wedge${qi}-tree${gx}-${gy}`, kind: 'tree',
          cell: { x: bx + sx * gx * 1.4, y: by + sy * gy * 1.4 }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree,
        })
      }
    }
    P.push({ id: `demon-wedge${qi}-lamp`, kind: 'lamp', cell: { x: bx + sx * 1.6, y: by - sy * 0.8 }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })
  })

  // ════════ 동: 아인·수인 주민회관(X71.5%) ════════
  P.push({
    id: 'demon-hall', kind: 'shop', cell: { x: DEMON_HALL_CX, y: DEMON_GUILD_CY - 2.4 }, size: { w: 2.9, d: 2.5 },
    solid: true, label: '아인·수인 주민회관', ...DEMON_SPRITE.hall,
  })
  ;[[DEMON_HALL_CX + 0.2, DEMON_GUILD_CY - 5.2], [DEMON_HALL_CX + 4.8, DEMON_GUILD_CY - 5.2], [DEMON_HALL_CX + 0.2, DEMON_GUILD_CY + 1.4], [DEMON_HALL_CX + 4.8, DEMON_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-htree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree }),
  )
  P.push({ id: 'demon-hlamp0', kind: 'lamp', cell: { x: DEMON_HALL_CX + 4.0, y: DEMON_GUILD_CY - 3.6 }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })

  // ════════ 서: 대장간/상점가(X27.5%) — 개별 건물 4채 ════════
  const shopSprites = [DEMON_SPRITE.shopA, DEMON_SPRITE.shopB, DEMON_SPRITE.shopC, DEMON_SPRITE.shopD]
  const shopOffsets: [number, number][] = [[-3.4, -1.0], [-1.0, -1.4], [1.4, -1.0], [3.8, -1.4]]
  shopOffsets.forEach(([ox, oy], i) =>
    P.push({
      id: `demon-shop${i}`, kind: 'shop', cell: { x: DEMON_SHOP_CX + ox, y: DEMON_GUILD_CY + oy }, size: { w: 1.7, d: 1.9 },
      solid: true, label: `상점 ${i + 1}`, ...shopSprites[i],
    }),
  )
  ;[[DEMON_SHOP_CX - 5.2, DEMON_GUILD_CY - 4.6], [DEMON_SHOP_CX + 5.8, DEMON_GUILD_CY - 4.6], [DEMON_SHOP_CX - 5.2, DEMON_GUILD_CY + 1.4], [DEMON_SHOP_CX + 5.8, DEMON_GUILD_CY + 1.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-stree${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree }),
  )
  ;[[DEMON_SHOP_CX - 2.2, DEMON_GUILD_CY - 4.8], [DEMON_SHOP_CX - 2.2, DEMON_GUILD_CY + 1.6]].forEach(([x, y], i) =>
    P.push({ id: `demon-slamp${i}`, kind: 'lamp', cell: { x, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp }),
  )

  // ════════ 남: 온천/용암 정원(X50%/Y75%) ════════
  ;[[DEMON_CX - 3.0, DEMON_PARK_CY - 2.0], [DEMON_CX + 3.0, DEMON_PARK_CY - 2.0], [DEMON_CX - 3.0, DEMON_PARK_CY + 2.4], [DEMON_CX + 3.0, DEMON_PARK_CY + 2.4]].forEach(([x, y], i) =>
    P.push({ id: `demon-bench${i}`, kind: 'bench', cell: { x, y }, size: { w: 0.9, d: 0.5 }, facing: x < DEMON_CX ? 'left' : undefined, ...DEMON_SPRITE.bench }),
  )
  ;[[DEMON_CX - 8.2, DEMON_PARK_CY - 2.4], [DEMON_CX + 8.2, DEMON_PARK_CY - 2.4], [DEMON_CX - 8.2, DEMON_PARK_CY + 3.0], [DEMON_CX + 8.2, DEMON_PARK_CY + 3.0]].forEach(([x, y], i) =>
    P.push({ id: `demon-ptree2-${i}`, kind: 'tree', cell: { x, y }, size: { w: 0.7, d: 0.6 }, ...DEMON_SPRITE.tree }),
  )

  // ════════ 마을입구(Y92.5%) ════════
  P.push({ id: 'demon-gate', kind: 'gate', cell: { x: DEMON_CX - 1.15, y: DEMON_ENTRANCE_CY - 1.0 }, size: { w: 2.3, d: 2.0 }, label: '화산지대 정문', ...DEMON_SPRITE.gate })

  // ════════ 대로 가로등 ════════
  ;[DEMON_TEMPLE_Y0 + 3.4, DEMON_GUILD_CY + 4.6, DEMON_PARK_CY - 3.5].forEach((y, i) => {
    P.push({ id: `demon-blamp${i}a`, kind: 'lamp', cell: { x: DEMON_CX - 2.1, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })
    P.push({ id: `demon-blamp${i}b`, kind: 'lamp', cell: { x: DEMON_CX + 1.9, y }, size: { w: 0.4, d: 0.4 }, ...DEMON_SPRITE.lamp })
  })

  return P
}

const DEMON_PROPS = demonVillageProps()
const DEMON_BLOCKERS = buildBlockers(DEMON_PROPS)

// ── 관리자 테스트룸 (/admin 전용) — NPC 25종·몬스터 23종을 한 방에 모아 배치 ────
// field.ts 의 generateFieldMonsters() 가 map.id==='testroom' 을 특수 처리해 그리드로 배치하고,
// mock-data.ts 의 testRoomNpcs() 가 기존 NPC 전원을 zoneId:'z-testroom' 로 복제해 넣는다.
const TESTROOM_W = 22
const TESTROOM_H = 32
function testroomTileAt(x: number, y: number): TileKind {
  // NPC 구역(위)은 plaza, 몬스터 구역(아래)은 grass 로 구분
  if (y < 17) return (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0 ? 'plaza' : 'path'
  return (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0 ? 'grass' : 'grass-dark'
}

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
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'forest',
    render: 'iso',
    assets: 'raster',
    tileAt: forestTileAt,
    props: FOREST_PROPS,
    blockers: buildBlockers(FOREST_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    // 권장레벨(2) ±5 범위로 제한 + 1레벨 잡몹 비중 확대(나무골렘 lv8은 범위 밖이라 제외, cave/swamp에서 담당)
    monsterPool: ['mon-field-mouse', 'mon-glow-moth', 'mon-field-mouse', 'mon-glow-moth', 'mon-forest-raccoon', 'mon-thorn-vine', 'mon-sprite-green', 'mon-grey-wolf', 'mon-mush-cap'],
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    bossSpawns: [{ monsterId: 'mon-thorn-matriarch', cell: { x: 12, y: 13 } }],
    recommendedLevel: 2,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'forest-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'forest-cave', cell: { ...FIELD_PORTAL_L }, to: 'cave', label: '동굴 입구', kind: 'portal' },
      { id: 'forest-swamp', cell: { ...FIELD_PORTAL_R }, to: 'swamp', label: '안개 늪지', kind: 'portal', requiredLevel: 5 },
    ],
  },
  cave: {
    id: 'cave',
    name: '이끼 동굴',
    kind: 'field',
    grid: { w: SUB_W, h: SUB_H },
    bg: 'cave',
    render: 'iso',
    assets: 'raster',
    tileAt: caveTileAt,
    props: CAVE_PROPS,
    blockers: buildBlockers(CAVE_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    monsterDensity: 0.12,
    monsterSpacing: 1.5,
    recommendedLevel: 6,
    spawn: { ...SUB_SPAWN },
    portals: [
      { id: 'cave-exit', cell: { ...SUB_EXIT }, to: 'forest', toSpawn: { x: 4, y: 5.2 }, label: '숲으로', kind: 'exit' },
      { id: 'cave-mine', cell: { ...CAVE_FORWARD }, to: 'mine', label: '폐광산 갱도', kind: 'portal', requiredLevel: 10 },
    ],
  },
  mine: {
    id: 'mine',
    name: '폐광산',
    kind: 'field',
    grid: { w: SUB_W, h: SUB_H },
    bg: 'mine',
    render: 'iso',
    assets: 'raster',
    tileAt: mineTileAt,
    props: MINE_PROPS,
    blockers: buildBlockers(MINE_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(10) ±5 범위로 제한
    monsterPool: ['mon-ember-imp', 'mon-ash-hound', 'mon-bone-archer', 'mon-cursed-armor'],
    monsterDensity: 0.12,
    monsterSpacing: 1.5,
    recommendedLevel: 10,
    spawn: { ...SUB_SPAWN },
    portals: [
      { id: 'mine-exit', cell: { ...SUB_EXIT }, to: 'cave', toSpawn: { x: 3.6, y: 4.3 }, label: '동굴로', kind: 'exit' },
    ],
  },
  swamp: {
    id: 'swamp',
    name: '안개 늪지',
    kind: 'field',
    grid: { w: SWAMP_W, h: SWAMP_H },
    bg: 'swamp',
    render: 'iso',
    assets: 'raster',
    tileAt: swampTileAt,
    props: SWAMP_PROPS,
    blockers: buildBlockers(SWAMP_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'forest',
    monsterDensity: 0.11,
    monsterSpacing: 1.5,
    bossSpawns: [{ monsterId: 'mon-ancient-bark-golem', cell: { x: 9, y: 5 } }],
    recommendedLevel: 5,
    spawn: { ...SWAMP_SPAWN },
    portals: [
      { id: 'swamp-exit', cell: { ...SWAMP_EXIT }, to: 'forest', toSpawn: { x: 20, y: 5.2 }, label: '숲으로', kind: 'exit' },
    ],
  },

  // ── 바다 계열 (바다 해안 ─▶ 심해 / 아틀란티스 마을[안전]) ──────────────────
  sea: {
    id: 'sea',
    name: '바다 해안',
    kind: 'field',
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'sea',
    render: 'iso',
    assets: 'raster',
    tileAt: seaTileAt,
    props: SEA_PROPS,
    blockers: buildBlockers(SEA_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    // 권장레벨(3) ±5 범위로 제한 — 암초거북(lv9)·밀물정령(lv11)은 범위 밖이라 심해에서 담당
    monsterPool: ['mon-bubble-spirit', 'mon-crab-soldier', 'mon-shallows-eel', 'mon-siren-larva'],
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    bossSpawns: [{ monsterId: 'mon-jelly-queen', cell: { x: 12, y: 13 } }],
    recommendedLevel: 3,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'sea-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'sea-deepsea', cell: { ...FIELD_PORTAL_L }, to: 'deepsea', label: '심해로', kind: 'portal', requiredLevel: 9 },
      { id: 'sea-atlantis', cell: { ...FIELD_PORTAL_R }, to: 'atlantis', label: '아틀란티스 마을', kind: 'portal' },
    ],
  },
  deepsea: {
    id: 'deepsea',
    name: '심해',
    kind: 'field',
    grid: { w: SUB_W, h: SUB_H },
    bg: 'deepsea',
    render: 'iso',
    assets: 'raster',
    tileAt: deepseaTileAt,
    props: DEEPSEA_PROPS,
    blockers: buildBlockers(DEEPSEA_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    monsterDensity: 0.12,
    monsterSpacing: 1.5,
    bossSpawns: [{ monsterId: 'mon-reef-king', cell: { x: 9, y: 4 } }],
    recommendedLevel: 9,
    spawn: { ...SUB_SPAWN },
    portals: [
      { id: 'deepsea-exit', cell: { ...SUB_EXIT }, to: 'sea', toSpawn: { x: 4, y: 5.2 }, label: '해안으로', kind: 'exit' },
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
    spawn: { x: ACX, y: ENTRANCE_CY - 0.2 },
    portals: [
      { id: 'atlantis-exit', cell: { x: ACX, y: ENTRANCE_CY + 0.5 }, to: 'sea', toSpawn: { x: 20, y: 5.2 }, label: '해안으로', kind: 'exit' },
    ],
  },

  // ── 스톰헤이븐 계열 (스톰헤이븐 ─▶ 천공 신전[안전]) ────────────────────────
  stormhaven: {
    id: 'stormhaven',
    name: '스톰헤이븐',
    kind: 'field',
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'sky',
    render: 'iso',
    assets: 'raster',
    tileAt: stormhavenTileAt,
    props: STORM_PROPS,
    blockers: buildBlockers(STORM_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'sea',
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    recommendedLevel: 7,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'stormhaven-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'stormhaven-sky-temple', cell: { ...FIELD_PORTAL_C }, to: 'sky-temple', label: '천공 신전', kind: 'portal', requiredLevel: 9 },
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
    spawn: { x: SKY_CX, y: SKY_ENTRANCE_CY - 0.2 },
    portals: [
      { id: 'sky-temple-exit', cell: { x: SKY_CX, y: SKY_ENTRANCE_CY + 0.5 }, to: 'stormhaven', toSpawn: { x: 12, y: 5.2 }, label: '스톰헤이븐으로', kind: 'exit' },
    ],
  },

  // ── 버려진 폐허 계열 (버려진 폐허 ─▶ 버려진 묘지 / 버려진 신전[안전]) ─────
  ruins: {
    id: 'ruins',
    name: '버려진 폐허',
    kind: 'field',
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'ruins',
    render: 'iso',
    assets: 'raster',
    tileAt: ruinsFieldTileAt,
    props: RUINSF_PROPS,
    blockers: buildBlockers(RUINSF_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(10) ±5 범위로 제한
    monsterPool: ['mon-ember-imp', 'mon-ash-hound', 'mon-bone-archer', 'mon-cursed-armor'],
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    bossSpawns: [{ monsterId: 'mon-stone-titan', cell: { x: 12, y: 13 } }],
    recommendedLevel: 10,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'ruins-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'ruins-graveyard', cell: { ...FIELD_PORTAL_L }, to: 'graveyard', label: '버려진 묘지', kind: 'portal', requiredLevel: 13 },
      { id: 'ruins-temple', cell: { ...FIELD_PORTAL_R }, to: 'temple-ruin', label: '버려진 신전', kind: 'portal', requiredLevel: 18 },
    ],
  },
  graveyard: {
    id: 'graveyard',
    name: '버려진 묘지',
    kind: 'field',
    grid: { w: SUB_W, h: SUB_H },
    bg: 'graveyard',
    render: 'iso',
    assets: 'raster',
    tileAt: graveyardTileAt,
    props: GRAVEYARD_PROPS,
    blockers: buildBlockers(GRAVEYARD_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(13) ±5 범위로 제한
    monsterPool: ['mon-ember-imp', 'mon-ash-hound', 'mon-bone-archer', 'mon-cursed-armor', 'mon-wraith', 'mon-dark-acolyte'],
    monsterDensity: 0.12,
    monsterSpacing: 1.5,
    bossSpawns: [{ monsterId: 'mon-stone-titan-king', cell: { x: 9, y: 4 } }],
    recommendedLevel: 13,
    spawn: { ...SUB_SPAWN },
    portals: [
      { id: 'graveyard-exit', cell: { ...SUB_EXIT }, to: 'ruins', toSpawn: { x: 4, y: 5.2 }, label: '폐허로', kind: 'exit' },
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
    spawn: { x: RUIN_CX, y: RUIN_ENTRANCE_CY - 0.2 },
    portals: [
      { id: 'temple-ruin-exit', cell: { x: RUIN_CX, y: RUIN_ENTRANCE_CY + 0.5 }, to: 'ruins', toSpawn: { x: 20, y: 5.2 }, label: '폐허로', kind: 'exit' },
    ],
  },

  // ── 루미나 설원 계열 (루미나 설원 ─▶ 오로라 마을[안전]) ────────────────────
  snowfield: {
    id: 'snowfield',
    name: '루미나 설원',
    kind: 'field',
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'snow',
    render: 'iso',
    assets: 'raster',
    tileAt: snowfieldTileAt,
    props: SNOWF_PROPS,
    blockers: buildBlockers(SNOWF_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(15) ±5 범위로 제한
    monsterPool: ['mon-ember-imp', 'mon-ash-hound', 'mon-bone-archer', 'mon-cursed-armor', 'mon-wraith', 'mon-dark-acolyte', 'mon-flame-warden'],
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    recommendedLevel: 15,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'snowfield-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'snowfield-aurora', cell: { ...FIELD_PORTAL_C }, to: 'aurora-village', label: '오로라 마을', kind: 'portal', requiredLevel: 16 },
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
    spawn: { x: AUR_CX, y: AUR_ENTRANCE_CY - 0.2 },
    portals: [
      { id: 'aurora-exit', cell: { x: AUR_CX, y: AUR_ENTRANCE_CY + 0.5 }, to: 'snowfield', toSpawn: { x: 12, y: 5.2 }, label: '설원으로', kind: 'exit' },
    ],
  },

  // ── 화산 계열 ─────────────────────────────────────────────────────────────
  volcano: {
    id: 'volcano',
    name: '화산지대',
    kind: 'field',
    grid: { w: FIELD_W, h: FIELD_H },
    bg: 'volcano',
    render: 'iso',
    assets: 'raster',
    tileAt: volcanoTileAt,
    props: VOLCANO_PROPS,
    blockers: buildBlockers(VOLCANO_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(20) ±5 범위로 제한
    monsterPool: ['mon-cursed-armor', 'mon-wraith', 'mon-dark-acolyte', 'mon-flame-warden', 'mon-frost-revenant', 'mon-dark-mage'],
    monsterDensity: 0.1,
    monsterSpacing: 1.7,
    recommendedLevel: 20,
    spawn: { ...FIELD_SPAWN },
    portals: [
      { id: 'volcano-exit', cell: { ...FIELD_EXIT }, to: 'village', toSpawn: { x: 43.5, y: 35.4 }, label: '마을로 돌아가기', kind: 'exit' },
      { id: 'volcano-demon-village', cell: { ...FIELD_PORTAL_L }, to: 'demon-village', label: '마물 마을', kind: 'portal', requiredLevel: 25 },
      { id: 'volcano-demon-castle', cell: { ...FIELD_PORTAL_R }, to: 'demon-castle', label: '모르스의 성', kind: 'portal', requiredLevel: 32 },
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
    spawn: { x: DEMON_CX, y: DEMON_ENTRANCE_CY - 0.2 },
    portals: [
      { id: 'demon-village-exit', cell: { x: DEMON_CX, y: DEMON_ENTRANCE_CY + 0.5 }, to: 'volcano', toSpawn: { x: 4, y: 5.2 }, label: '화산지대로', kind: 'exit' },
    ],
  },
  'demon-castle': {
    id: 'demon-castle',
    name: '모르스의 성',
    kind: 'field',
    grid: { w: SUB_W, h: SUB_H },
    bg: 'demon',
    render: 'iso',
    assets: 'raster',
    tileAt: demonCastleTileAt,
    props: DEMONCASTLE_PROPS,
    blockers: buildBlockers(DEMONCASTLE_PROPS),
    zones: NO_ZONES,
    monsterZoneKind: 'ruins',
    // 권장레벨(32) ±5 범위로 제한 — 이 레벨대는 모르스의 전령(lv32) 하나뿐
    monsterPool: ['mon-azka-herald'],
    monsterDensity: 0.12,
    monsterSpacing: 1.5,
    recommendedLevel: 32,
    spawn: { ...SUB_SPAWN },
    portals: [
      { id: 'demon-castle-exit', cell: { ...SUB_EXIT }, to: 'volcano', toSpawn: { x: 20, y: 5.2 }, label: '화산지대로', kind: 'exit' },
    ],
  },

  testroom: {
    id: 'testroom',
    name: '관리자 테스트룸',
    kind: 'field',
    grid: { w: TESTROOM_W, h: TESTROOM_H },
    bg: 'plaza',
    render: 'iso',
    assets: 'raster',
    tileAt: testroomTileAt,
    zones: [
      z('z-testroom', 'plaza', '관리자 테스트룸', 0, 0, TESTROOM_W, TESTROOM_H, '#d9a441', 'NPC·몬스터 전종이 모인 관리자 전용 테스트 공간.'),
    ],
    monsterDensity: 0, // generateFieldMonsters 가 testroom 을 특수 처리하므로 밀도는 미사용
    recommendedLevel: 1,
    spawn: { x: 11, y: 30 },
    portals: [
      { id: 'testroom-exit', cell: { x: 11, y: 31 }, to: 'village', label: '마을로 돌아가기', kind: 'exit' },
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
