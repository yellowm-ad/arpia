// ============================================================================
// 천공 신전(스톰헤이븐 하늘 도시) 마을 (64×56) — 리빌드 (lib/atlantis-map.ts 와 같은 방식)
//  · 작업 순서: 섬 윤곽(불변) → 도로 → 광장 → 건물(도로 기준 열 배치) → 조경 → 섬 바깥 장식
//  · 스프라이트 앵커: PNG 하단 중앙 = cell, 건물 바닥은 cell 에서 뒤(-x,-y)로 뻗음 → put() 이
//    "바닥 중심 좌표"를 받아 앞 꼭짓점 앵커 + 충돌 박스(= 보이는 바닥)를 함께 계산한다.
//  · 기존 'cloud' 타일은 두꺼운 3D 블록이라 평면 타일과 높이가 안 맞아 검은 틈이 생김 →
//    평면 타일 sky-marble / sky-road / sky-cloud 사용 (scripts/gen-sky-tiles.mjs)
// ============================================================================
import type { PropDef, PropKind, TileKind } from '@/lib/iso'
import { mulberry32 } from '@/lib/rng'

type Blocker = { x0: number; y0: number; x1: number; y1: number }

export const SKY_AW = 64
export const SKY_AH = 56
export const SKY_CX = 32
export const SKY_ENTRANCE_CY = 52

const CROSS_Y = 23
const RES_Y = 32
const PARK_CY = 42
const WLANE_X = 17
const ELANE_X = 47
const ISLAND_CY = 30

/** 섬 윤곽(불변) — 1 초과 = 바깥(구름바다) */
function islandNorm(x: number, y: number): number {
  const dx = x - SKY_CX
  const dy = y - ISLAND_CY
  const angle = Math.atan2(dy, dx)
  const wobble = Math.sin(angle * 3) * 1.6 + Math.sin(angle * 7 + 1.3) * 0.9 + Math.sin(angle * 13 + 0.4) * 0.4
  const rx = Math.max(22, 23 + wobble)
  const ry = Math.max(26, 27 + wobble * 0.85)
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
}

// ─────────────────────────────────────────────────────────────────────────────
// 지형
// ─────────────────────────────────────────────────────────────────────────────
type Zone = 'sky' | 'road' | 'square' | 'block' | 'garden'
const inR = (x: number, y: number, r: Blocker) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1

const octa = (x: number, y: number, cx: number, cy: number, m: number, s: number) => {
  const dx = Math.abs(x - cx)
  const dy = Math.abs(y - cy)
  return Math.max(dx, dy) < m && dx + dy < s
}

/** 신전 앞마당 */
const FORECOURT: Blocker = { x0: 24, y0: 9, x1: 40, y1: 16.8 }

function isSquare(x: number, y: number): boolean {
  return octa(x, y, SKY_CX, CROSS_Y, 6.8, 9.6) || octa(x, y, SKY_CX, PARK_CY, 5.6, 8.2) || inR(x, y, FORECOURT)
}

function isRoad(x: number, y: number): boolean {
  if (Math.abs(x - SKY_CX) < 2 && y > 14 && y < 54) return true // 환영길
  if (Math.abs(y - CROSS_Y) < 1.5 && x > 8 && x < 57) return true // 동서 대로
  if (Math.abs(y - RES_Y) < 1.2 && x > 9 && x < 56) return true // 주거 골목
  if (Math.abs(x - WLANE_X) < 1 && y > 24.5 && y < 47) return true
  if (Math.abs(x - ELANE_X) < 1 && y > 24.5 && y < 47) return true
  return false
}

/** 초록 정원 구역 — 참고 이미지의 정원 쿼드런트 */
const GARDENS: Blocker[] = [
  { x0: 10, y0: 27.5, x1: 25.4, y1: 28.7 },
  { x0: 38.6, y0: 27.5, x1: 54, y1: 28.7 },
  { x0: 10, y0: 41.2, x1: 27, y1: 50.6 }, // 남서 정원
  { x0: 37, y0: 41.2, x1: 54, y1: 50.6 }, // 남동 정원
]

function zoneAt(x: number, y: number): Zone {
  const norm = islandNorm(x, y)
  if (norm > 1) return 'sky'
  if (isSquare(x, y)) return 'square'
  if (isRoad(x, y)) return 'road'
  for (const g of GARDENS) if (inR(x, y, g)) return 'garden'
  if (norm > 0.88) return 'garden'
  return 'block'
}

export function skyTownTileAt(x: number, y: number): TileKind {
  const z = zoneAt(x, y)
  if (z === 'sky') return 'sky-cloud'
  if (z === 'road') return 'sky-road'
  if (z === 'garden') return 'grass'
  return 'sky-marble' // square / block
}

// ─────────────────────────────────────────────────────────────────────────────
// 스프라이트 카탈로그 — w,h = 트림된 실제 px, fw/fd = 보이는 바닥(셀)
// ─────────────────────────────────────────────────────────────────────────────
const S_ = '/images/map/props/skytemple/'
const A_ = '/images/map/props/atlantis/'
interface Spr { s: string; w: number; h: number; fw: number; fd: number }
const sk = (f: string, w: number, h: number, fw: number, fd = fw): Spr => ({ s: S_ + f, w, h, fw, fd })
const at = (f: string, w: number, h: number, fw: number, fd = fw): Spr => ({ s: A_ + f, w, h, fw, fd })

const SPR = {
  temple: sk('sky_temple_new.png', 229, 297, 3.2),
  hall: sk('sk2_hall.png', 162, 173, 2.4),
  townA: sk('sk2_townA.png', 64, 91, 1.0),
  townB: sk('sk2_townB.png', 73, 99, 1.1),
  townC: sk('sk2_townC.png', 86, 97, 1.3),
  townD: sk('sk2_townD.png', 92, 118, 1.4),
  townE: sk('sk2_townE.png', 74, 98, 1.1),
  tavern: sk('sk2_tavern.png', 92, 106, 1.35),
  stallBlue: sk('sk2_stallBlue.png', 87, 72, 1.2),
  stallRed: sk('sk2_stallRed.png', 90, 72, 1.2),
  fountainBig: sk('sk2_fountainBig.png', 116, 158, 1.8),
  fountain: sk('sky_fountain_new.png', 102, 154, 1.5),
  statue: sk('sk2_statue.png', 58, 99, 0.7),
  stairs: sk('sk2_stairs.png', 87, 76, 1.5),
  crystals: sk('sk2_crystals.png', 46, 66, 0.6),
  spire: sk('sk2_spire.png', 45, 168, 0.5),
  gtower: sk('sk2_gtower.png', 88, 165, 1.3),
  airship: sk('sk2_airship.png', 79, 118, 1.4),
  islandA: sk('sk2_islandA.png', 71, 105, 1.2),
  islandB: sk('sk2_islandB.png', 76, 99, 1.2),
  islandC: sk('sk2_islandC.png', 98, 105, 1.4),
  islandD: sk('sk2_islandD.png', 64, 93, 1.0),
  cloudBig: sk('sk2_cloudBig.png', 116, 57, 1.4),
  cloudSm: sk('sk2_cloudSm.png', 50, 33, 0.8),
  lamp: sk('sky_lamp.png', 14, 62, 0.2),
  tree: sk('sky_tree.png', 49, 66, 0.6),
  // 아틀란티스와 공용(방향성 벤치·화단·화분·정원 화단)
  benchSE: at('atl3_benchSE.png', 53, 57, 0.55, 1.25),
  benchNW: at('atl3_benchNW.png', 55, 50, 0.55, 1.25),
  benchSW: at('atl3_benchSW.png', 53, 57, 1.25, 0.55),
  benchNE: at('atl3_benchNE.png', 55, 50, 1.25, 0.55),
  flowerbed: at('atl_flowerbed.png', 46, 27, 0.6),
  planter: at('atl2_planter.png', 45, 64, 0.8),
  gardenbed: at('atl2_gardenbed.png', 106, 64, 1.5),
  gazebo: at('atl_gazebo.png', 67, 77, 0.9),
  banner: at('atl_banner.png', 21, 47, 0.2),
  citizen: at('atl_citizen.png', 18, 46, 0.3),
} satisfies Record<string, Spr>
type SprKey = keyof typeof SPR

// ─────────────────────────────────────────────────────────────────────────────
// 조립
// ─────────────────────────────────────────────────────────────────────────────
function build() {
  const P: PropDef[] = []
  const B: Blocker[] = []

  const baseBox = (cx: number, cy: number, fw: number, fd: number, k = 0.9): Blocker => ({
    x0: cx - (fw * k) / 2, y0: cy - (fd * k) / 2, x1: cx + (fw * k) / 2, y1: cy + (fd * k) / 2,
  })
  const overlaps = (a: Blocker, b: Blocker) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

  const buildable = (cx: number, cy: number, fw: number, fd: number) => {
    const hx = fw / 2
    const hy = fd / 2
    const pts: [number, number][] = [
      [cx, cy], [cx - hx, cy - hy], [cx + hx, cy - hy], [cx - hx, cy + hy], [cx + hx, cy + hy],
      [cx - hx, cy], [cx + hx, cy], [cx, cy - hy], [cx, cy + hy],
    ]
    return pts.every(([x, y]) => zoneAt(x, y) === 'block')
  }
  const decorFree = (cx: number, cy: number, r: number) => {
    if (zoneAt(cx, cy) === 'sky') return false
    const bb: Blocker = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }
    return !B.some((b) => overlaps(bb, b))
  }

  interface PutOpt {
    kind?: PropKind
    solid?: boolean
    label?: string
    decor?: boolean // 건축 가능 지면 검사 대신 장식 검사(길·광장·정원 위 가능)
    free?: boolean // 검사 없이 배치(섬 바깥 장식)
    k?: number
    bw?: number
    bd?: number
  }

  function put(id: string, key: SprKey, cx: number, cy: number, o: PutOpt = {}): boolean {
    const S = SPR[key]
    const solid = o.solid ?? true
    if (o.free) {
      // no check
    } else if (o.decor) {
      if (!decorFree(cx, cy, Math.max(S.fw, S.fd) * 0.4)) return false
    } else if (!buildable(cx, cy, S.fw, S.fd) || B.some((b) => overlaps(baseBox(cx, cy, S.fw, S.fd, 0.86), b))) {
      return false
    }
    P.push({
      id: `sky-${id}`, kind: o.kind ?? 'cottage', cell: { x: cx + S.fw / 2, y: cy + S.fd / 2 },
      size: { w: 0.1, d: 0.1 }, radial: true, label: o.label, sprite: S.s, px: { w: S.w, h: S.h },
    })
    if (solid) B.push(baseBox(cx, cy, o.bw ?? S.fw, o.bd ?? S.fd, o.k ?? 0.9))
    return true
  }

  function rowX(pre: string, list: SprKey[], x0: number, fy: number, gap = 0.2, xMax = 99) {
    let cur = x0
    list.forEach((k, i) => {
      const S = SPR[k]
      const fx = cur + S.fw
      if (fx > xMax) return
      put(`${pre}${i}`, k, fx - S.fw / 2, fy - S.fd / 2, { kind: 'shop' })
      cur = fx + gap
    })
  }
  const deco = (id: string, key: SprKey, x: number, y: number, o: PutOpt = {}) =>
    put(id, key, x, y, { decor: true, solid: false, kind: 'bush', ...o })
  const hard = (id: string, key: SprKey, x: number, y: number, o: PutOpt = {}) =>
    put(id, key, x, y, { decor: true, solid: true, ...o })
  const benchRing = (pre: string, cx: number, cy: number, r: number) => {
    hard(`${pre}w`, 'benchSE', cx - r, cy, { kind: 'bench', k: 0.9 })
    hard(`${pre}e`, 'benchNW', cx + r, cy, { kind: 'bench', k: 0.9 })
    hard(`${pre}n`, 'benchSW', cx, cy - r, { kind: 'bench', k: 0.9 })
    hard(`${pre}s`, 'benchNE', cx, cy + r, { kind: 'bench', k: 0.9 })
  }

  // ═══════════════ AREA 01 · 랜드마크(천공 대신전) ═══════════════
  put('temple', 'temple', SKY_CX, 6.6, { free: true, kind: 'dome', label: '천공 대신전', k: 0.8 })
  ;[[26.6, 11.6], [37.4, 11.6], [26.6, 14.6], [37.4, 14.6]].forEach(([x, y], i) => hard(`fgarden${i}`, 'gardenbed', x, y, { kind: 'bush', k: 0.7 }))
  ;[[30.2, 11.0], [33.8, 11.0], [30.2, 14.4], [33.8, 14.4]].forEach(([x, y], i) => deco(`fplanter${i}`, 'planter', x, y))
  ;[[29.0, 9.8], [35.0, 9.8]].forEach(([x, y], i) => hard(`fstatue${i}`, 'statue', x, y, { kind: 'statue' }))
  ;[[25.0, 9.6], [39.0, 9.6], [25.0, 16.0], [39.0, 16.0]].forEach(([x, y], i) => deco(`fspire${i}`, 'crystals', x, y))
  ;[[28.6, 15.8], [35.4, 15.8]].forEach(([x, y], i) => deco(`flamp${i}`, 'lamp', x, y, { kind: 'lamp' }))

  // ═══════════════ AREA 04 · 광장 (중앙 수정 분수광장 + 남측 하늘정원) ═══════════════
  hard('cfountain', 'fountainBig', SKY_CX, CROSS_Y, { kind: 'fountain', label: '수정 분수', k: 0.85 })
  benchRing('cbench', SKY_CX, CROSS_Y, 3.3)
  ;[[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]].forEach(([dx, dy], i) => hard(`cplanter${i}`, 'planter', SKY_CX + dx, CROSS_Y + dy, { kind: 'bush' }))
  hard('cstall0', 'stallBlue', SKY_CX - 6.0, CROSS_Y - 2.4, { kind: 'stall' })
  hard('cstall1', 'stallRed', SKY_CX + 6.0, CROSS_Y - 2.4, { kind: 'stall' })
  hard('cstall2', 'stallRed', SKY_CX - 6.0, CROSS_Y + 2.6, { kind: 'stall' })
  hard('cstall3', 'stallBlue', SKY_CX + 6.0, CROSS_Y + 2.6, { kind: 'stall' })
  ;[[-3.8, -6.2], [3.8, -6.2], [-3.8, 6.2], [3.8, 6.2]].forEach(([dx, dy], i) => deco(`cflower${i}`, 'flowerbed', SKY_CX + dx, CROSS_Y + dy))
  ;[[-3.8, -3.8], [3.8, 3.8]].forEach(([dx, dy], i) => deco(`clamp${i}`, 'lamp', SKY_CX + dx, CROSS_Y + dy, { kind: 'lamp' }))

  hard('pfountain', 'fountain', SKY_CX, PARK_CY, { kind: 'fountain', label: '하늘정원 분수', k: 0.85 })
  benchRing('pbench', SKY_CX, PARK_CY, 3.2)
  ;[[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]].forEach(([dx, dy], i) => hard(`pplanter${i}`, 'planter', SKY_CX + dx, PARK_CY + dy, { kind: 'bush' }))
  ;[[-4.6, -2.0], [4.6, 2.0]].forEach(([dx, dy], i) => deco(`plamp${i}`, 'lamp', SKY_CX + dx, PARK_CY + dy, { kind: 'lamp' }))
  hard('pstatue0', 'statue', SKY_CX - 2.4, PARK_CY + 3.0, { kind: 'statue' })
  hard('pstatue1', 'statue', SKY_CX + 2.4, PARK_CY - 3.0, { kind: 'statue' })
  hard('pgazebo', 'gazebo', SKY_CX + 4.8, PARK_CY + 3.4, { kind: 'gazebo' })

  // ═══════════════ AREA 02 · 왼쪽(서쪽) 부지 — 상점가 + 주택 ═══════════════
  rowX('w1-', ['townB', 'townA', 'tavern', 'townE', 'townC', 'townB', 'townD', 'townA'], 11.2, 21.2, 0.15, 25.4)
  rowX('w0-', ['townD', 'townE', 'townA', 'townC', 'townB'], 15.2, 18.4, 0.2, 24.5)
  rowX('w2a-', ['townC', 'townA', 'townB'], 10.6, 27.2, 0.15, 15.6)
  rowX('w2b-', ['townE', 'townB', 'townD'], 18.7, 27.2, 0.15, 25.2)
  rowX('w3a-', ['townA', 'townE', 'townC'], 10.6, 30.55, 0.2, 15.6)
  rowX('w3b-', ['townD', 'townB', 'townA', 'townC'], 18.7, 30.55, 0.2, 29.4)
  rowX('w4a-', ['townB', 'townE', 'townA'], 10.6, 35.1, 0.15, 15.6)
  rowX('w4b-', ['townC', 'townA', 'townD', 'townB'], 18.7, 35.1, 0.15, 29.4)
  rowX('wh1a-', ['townE', 'townB', 'townC'], 10.6, 39.8, 0.15, 15.6)
  rowX('wh1b-', ['townA', 'tavern', 'townE'], 18.7, 39.8, 0.15, 26.2)

  // ═══════════════ AREA 03 · 오른쪽(동쪽) 부지 — 마을 회관 + 주택 ═══════════════
  put('hall', 'hall', 46.0, 19.9, { kind: 'shop', label: '바람의 교단 회관', k: 0.85 })
  rowX('e1a-', ['townC', 'townA', 'townB'], 39.6, 21.2, 0.15, 44.4)
  rowX('e1b-', ['townB', 'townE', 'townA', 'townD'], 48.5, 21.2, 0.15, 53.5)
  rowX('e0-', ['townE', 'townD', 'townA', 'townB'], 39.0, 18.2, 0.2, 44.4)
  rowX('e0b-', ['townA', 'townC', 'townB'], 48.6, 18.2, 0.2, 54)
  rowX('e2a-', ['townD', 'townB', 'townE'], 39.0, 27.2, 0.15, 45.6)
  rowX('e2b-', ['townC', 'townA', 'townB'], 48.4, 27.2, 0.15, 54)
  rowX('e3a-', ['townB', 'townD', 'townA'], 39.0, 30.55, 0.2, 45.6)
  rowX('e3b-', ['townE', 'townC'], 48.4, 30.55, 0.2, 54)
  rowX('e4a-', ['townA', 'townE', 'townB'], 39.0, 35.1, 0.15, 45.6)
  rowX('e4b-', ['townD', 'townB', 'townC'], 48.4, 35.1, 0.15, 54)
  rowX('eh1a-', ['townB', 'tavern', 'townA'], 37.8, 39.8, 0.15, 45.6)
  rowX('eh1b-', ['townC', 'townE', 'townB'], 48.4, 39.8, 0.15, 54)
  // 신전 뒤·양옆(북서/북동) 블록
  rowX('nw1-', ['townB', 'townA', 'townE'], 13.8, 14.6, 0.2, 21.4)
  rowX('ne1-', ['townE', 'townC', 'townA', 'townB', 'townD'], 40.6, 13.6, 0.2, 51)
  rowX('ne2-', ['townA', 'townD', 'townB', 'townC'], 40.6, 17.0, 0.2, 52)

  // ═══════════════ 마을 입구 — 대계단 + 좌우 성탑 + 정박한 비공선 ═══════════════
  put('stairs', 'stairs', SKY_CX, SKY_ENTRANCE_CY - 1.6, { decor: true, solid: false, kind: 'gate', label: '천공 신전 진입 계단' })
  ;[-1, 1].forEach((sx) => {
    put(`gtower${sx}`, 'gtower', SKY_CX + sx * 3.9, SKY_ENTRANCE_CY - 1.8, { decor: true, kind: 'tower', k: 0.8 })
    deco(`gcrystal${sx}`, 'crystals', SKY_CX + sx * 2.6, SKY_ENTRANCE_CY - 4.2)
    deco(`glamp${sx}`, 'lamp', SKY_CX + sx * 2.3, SKY_ENTRANCE_CY - 3.2, { kind: 'lamp' })
  })

  // ═══════════════ 도로변 가로등(드문드문) + 화단 ═══════════════
  ;[14, 22, 42, 50, 54].forEach((x) => deco(`lampx${x}`, 'lamp', x, 24.9, { kind: 'lamp' }))
  deco('lampa', 'lamp', 30.1, 34.0, { kind: 'lamp' })
  deco('lampb', 'lamp', 33.9, 34.0, { kind: 'lamp' })
  ;[[11.5, 28.2], [14.0, 28.2], [19.0, 28.2], [21.6, 28.2], [24.0, 28.2], [40.0, 28.2], [43.0, 28.2], [49.5, 28.2], [52.0, 28.2]].forEach(([x, y], i) =>
    deco(`gflower${i}`, 'flowerbed', x, y),
  )

  // ═══════════════ 조경 패스 — 남은 빈 지면을 결정론적으로 채운다 ═══════════════
  {
    const rand = mulberry32(20260920)
    const pickBlock: [SprKey, PropKind, number][] = [
      ['flowerbed', 'bush', 0.4], ['planter', 'bush', 0.2], ['crystals', 'bush', 0.25], ['tree', 'tree', 0.15],
    ]
    const pickGarden: [SprKey, PropKind, number][] = [
      ['tree', 'tree', 0.42], ['flowerbed', 'bush', 0.28], ['crystals', 'bush', 0.15], ['planter', 'bush', 0.15],
    ]
    const choose = (tbl: [SprKey, PropKind, number][]) => {
      let r = rand()
      for (const [k, kind, w] of tbl) if ((r -= w) <= 0) return { k, kind }
      return { k: tbl[0][0], kind: tbl[0][1] }
    }
    let n = 0
    for (let y = 4; y < 54; y += 1.6) {
      for (let x = 8; x < 56; x += 1.6) {
        const jx = x + (rand() - 0.5) * 0.9
        const jy = y + (rand() - 0.5) * 0.9
        const z = zoneAt(jx, jy)
        if (z !== 'block' && z !== 'garden') continue
        if (rand() > (z === 'garden' ? 0.62 : 0.18)) continue
        const { k, kind } = choose(z === 'garden' ? pickGarden : pickBlock)
        const solid = k === 'planter' || k === 'tree'
        if (put(`fill${n}`, k, jx, jy, { decor: true, solid, kind })) n++
      }
    }
  }

  // ═══════════════ 섬 바깥(구름바다) 장식 — 해안 구름 띠 + 떠 있는 섬·비공선·첨탑 ═══════════════
  {
    const rand = mulberry32(777)
    let n = 0
    for (let y = 0.5; y < SKY_AH; y += 2.0) {
      for (let x = 0.5; x < SKY_AW; x += 2.0) {
        const jx = x + (rand() - 0.5) * 1.2
        const jy = y + (rand() - 0.5) * 1.2
        const d = islandNorm(jx, jy) - 1
        if (d < 0.02 || d > 0.34 || rand() > 0.6) continue
        put(`cloud${n++}`, rand() < 0.55 ? 'cloudSm' : 'cloudBig', jx, jy, { free: true, solid: false, kind: 'bush' })
      }
    }
  }
  ;[
    ['islandA', 6, 11], ['islandB', 58, 19], ['islandC', 58, 43], ['islandB', 5, 40], ['islandD', 17, 3.6], ['islandC', 49, 3.2],
    ['islandD', 40, 55.0], ['islandA', 22, 55.2], ['islandD', 4, 24], ['islandC', 59.5, 31], ['islandA', 3, 51], ['islandB', 61, 53],
    ['islandC', 3, 4], ['islandD', 61, 4],
  ].forEach(([k, x, y], i) => put(`float${i}`, k as SprKey, x as number, y as number, { free: true, solid: false, kind: 'bush' }))
  ;[[20.6, 55.4], [43.6, 55.2]].forEach(([x, y], i) => put(`ship${i}`, 'airship', x, y, { free: true, solid: false, kind: 'bush' }))
  ;[[4.5, 30], [59.5, 27], [26.5, 2.4], [38.5, 2.2]].forEach(([x, y], i) => put(`spire${i}`, 'spire', x, y, { free: true, solid: false, kind: 'tree' }))

  return { P, B }
}

const built = build()
export const SKY_TOWN_PROPS: PropDef[] = built.P

/** 섬 바깥(구름바다) 이동 차단 — 바깥 셀을 가로 런으로 합쳐 blockers 로 등록 */
function outsideBlockers(): Blocker[] {
  const out: Blocker[] = []
  for (let j = 0; j < SKY_AH; j++) {
    let i0 = -1
    for (let i = 0; i <= SKY_AW; i++) {
      const outside = i < SKY_AW && zoneAt(i + 0.5, j + 0.5) === 'sky'
      if (outside && i0 < 0) i0 = i
      if (!outside && i0 >= 0) {
        out.push({ x0: i0, y0: j, x1: i, y1: j + 1 })
        i0 = -1
      }
    }
  }
  return out
}
export const SKY_TOWN_BLOCKERS: Blocker[] = [...built.B, ...outsideBlockers()]
