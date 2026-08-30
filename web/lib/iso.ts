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
}
