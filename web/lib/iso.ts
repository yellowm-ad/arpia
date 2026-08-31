// ============================================================================
// 아이소메트릭 투영 + 맵 데이터 타입
//  - 게임플레이 좌표는 기존과 동일한 셀(x,y). 렌더만 2:1 다이메트릭으로 투영.
//  - 오브젝트(건물/나무/캐릭터)는 화면 y 기준 깊이정렬 → 뒤 물체는 앞 물체에 가려짐.
// ============================================================================

export const ISO_TILE_W = 64
export const ISO_TILE_H = 32 // 2:1

/** 셀 좌표 → 아이소 화면 좌표(px). 원점은 격자 (0,0) 타일의 위쪽 꼭짓점. */
export function isoToScreen(cx: number, cy: number): { sx: number; sy: number } {
  return {
    sx: (cx - cy) * (ISO_TILE_W / 2),
    sy: (cx + cy) * (ISO_TILE_H / 2),
  }
}

/** 격자 크기 → 아이소 평면의 화면 바운딩 박스 */
export function isoBounds(w: number, h: number) {
  const minSx = (0 - (h - 1)) * (ISO_TILE_W / 2)
  const maxSx = (w - 1 - 0) * (ISO_TILE_W / 2) + ISO_TILE_W
  const minSy = 0
  const maxSy = (w - 1 + (h - 1)) * (ISO_TILE_H / 2) + ISO_TILE_H
  return { minSx, maxSx, minSy, maxSy, width: maxSx - minSx, height: maxSy - minSy }
}

// ─────────────────────────────────────────────────────────────────────────────
// 지면 타일
// ─────────────────────────────────────────────────────────────────────────────
export type TileKind =
  | 'grass'
  | 'grass-dark'
  | 'path'
  | 'plaza'
  | 'sand'
  | 'field'
  | 'water'
  | 'dirt'

/**
 * 라스터 모드에서 지면 타일 PNG 경로 (다이메트릭 2:1, 폭 = ISO_TILE_W 배수).
 * 비어있으면 iso-world 가 TILE_COLORS 폴리곤으로 폴백.
 */
export const TILE_SPRITES: Partial<Record<TileKind, string>> = {}

/** 타일별 상/좌/우 면 색 (좌·우는 살짝 어둡게 해 미세 입체) */
export const TILE_COLORS: Record<TileKind, { top: string; edge: string }> = {
  grass: { top: '#7cb45b', edge: '#6aa24c' },
  'grass-dark': { top: '#6fa851', edge: '#5f9445' },
  path: { top: '#cdb58c', edge: '#b89f76' }, // 따뜻한 조약돌
  plaza: { top: '#dccbaa', edge: '#c3b088' },
  sand: { top: '#e0c68e', edge: '#c6a869' },
  field: { top: '#b0864a', edge: '#8c6633' },
  water: { top: '#6fc3dc', edge: '#4aa3c0' },
  dirt: { top: '#a48963', edge: '#836a47' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 오브젝트(프롭) — 건물·구조물·자연물
// ─────────────────────────────────────────────────────────────────────────────
export type PropKind =
  | 'hall' // 학교 건물동 (첨탑 + 아치 스테인드글라스)
  | 'cottage' // 소형 주택
  | 'shop' // 상점 건물
  | 'stall' // 시장 천막 노점
  | 'dome' // 신전 (돔)
  | 'barn' // 헛간
  | 'windmill' // 풍차
  | 'colosseum' // 원형 투기장
  | 'fountain' // 분수
  | 'gate' // 대형 아치 성문
  | 'wall' // 목책/성벽 구간
  | 'tower' // 성벽 망루
  | 'tree' // 나무
  | 'hedge' // 낮은 관목 울타리
  | 'lamp' // 가로등
  | 'bench' // 벤치
  | 'banner' // 현수막 기둥

export interface PropDef {
  id: string
  kind: PropKind
  /** 발밑(그라운드) 앵커 셀 좌표 — 깊이정렬·배치 기준 */
  cell: { x: number; y: number }
  /** 격자 상 footprint (셀). 깊이정렬 tie-break, 그림자 크기용 */
  size?: { w: number; d: number }
  /** 픽셀 높이 힌트 (없으면 kind 기본값) */
  height?: number
  /** 색 변주(주택 지붕색 등) / 방향 */
  variant?: string
  facing?: 'left' | 'right'
  /** 라벨(대형 구조물 위 표시, 선택) */
  label?: string
  /**
   * 앵커가 footprint 중심인가(원형 구조물: 분수·콜로세움·나무).
   * true 면 깊이정렬·충돌 모두 cell 을 중심으로 계산.
   * false/미지정이면 cell 은 footprint 의 뒤쪽(격자 원점측) 꼭짓점.
   */
  radial?: boolean
  /** 이동 불가 구조물인가. 충돌 사각형은 propAABB() 로 자동 산출 */
  solid?: boolean
  /** 충돌 footprint(셀) 오버라이드. 없으면 size 사용 (그림보다 살짝 작게 주고 싶을 때) */
  collide?: { w: number; d: number }
  // ── 라스터(PNG) 에셋 모드 (GameMap.assets === 'raster') ──
  /** 투명배경 PNG 경로 (public/ 기준). 있으면 SVG 스프라이트 대신 사용 */
  sprite?: string
  /** sprite 의 발밑 앵커 = 이미지 좌상단 기준 픽셀 오프셋 */
  anchor?: { x: number; y: number }
  /** sprite 원본 픽셀 크기 (없으면 자연 크기) */
  px?: { w: number; h: number }
}

/**
 * 프롭의 충돌 사각형(셀 좌표)을 footprint 로부터 산출.
 * radial → cell 중심 ±half, 아니면 cell 에서 +x/+y 방향으로 확장.
 * wall(facing:'left') 은 footprint 축이 뒤바뀌므로 보정.
 */
export function propAABB(
  p: PropDef,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const fp = p.collide ?? p.size
  if (!fp) return null
  let w = fp.w
  let d = fp.d
  if (p.kind === 'wall' && p.facing === 'left') {
    w = fp.d
    d = fp.w
  }
  if (p.radial) {
    return {
      x0: p.cell.x - w / 2,
      y0: p.cell.y - d / 2,
      x1: p.cell.x + w / 2,
      y1: p.cell.y + d / 2,
    }
  }
  return { x0: p.cell.x, y0: p.cell.y, x1: p.cell.x + w, y1: p.cell.y + d }
}
