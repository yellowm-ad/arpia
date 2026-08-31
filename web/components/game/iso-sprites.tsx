'use client'

// ============================================================================
// 손으로 그린 아이소메트릭 도트 스프라이트 모음
//  - 모든 스프라이트의 좌표 원점(0,0)은 "발밑(그라운드) 뒤쪽 꼭짓점".
//  - 2:1 다이메트릭. +x 셀 = 화면 (+32,+16), +y 셀 = 화면 (-32,+16).
//  - 색은 평면 + 1px 라인 위주(픽셀 느낌). 그라디언트 최소.
// ============================================================================

import { ISO_TILE_W, ISO_TILE_H } from '@/lib/iso'
import type { PropDef } from '@/lib/iso'

const HW = ISO_TILE_W / 2 // 32
const HH = ISO_TILE_H / 2 // 16

// ── 팔레트 (위치브룩풍: 따뜻한 사암 + 슬레이트-라벤더 지붕 + 앰버 유리) ────────
const C = {
  stoneTop: '#efe2c4', // 햇빛 받은 사암 윗면
  stoneL: '#dcc6a0', // 밝은 벽면
  stoneR: '#bda580', // 그늘 벽면
  line: '#8a7150',
  quoin: '#ede0bf', // 모서리 석재
  plinth: '#a68c62', // 하부 기단
  trim: '#c98f3f',
  brass: '#e6b657',
  roofTop: '#948ab0', // 슬레이트-라벤더 (빛)
  roofL: '#71668f',
  roofR: '#544a70',
  roofRidge: '#b0a6c8',
  roofRedTop: '#c07152',
  roofRedL: '#9c5942',
  roofRedR: '#7c4331',
  roofTealTop: '#5a9e94',
  roofTealL: '#437a72',
  roofTealR: '#315c55',
  glass: '#ffe4a0', // 따뜻한 앰버 유리
  glassLit: '#fff2ce',
  glassDark: '#d6b976',
  mullion: '#5b4a34', // 어두운 창틀
  woodTop: '#b3803f',
  woodL: '#8a5f2f',
  woodR: '#6a4824',
  foliage: '#7cb257',
  foliageHi: '#a0cf7c',
  foliageDark: '#57883f',
  foliageGold: '#d8a04a',
  foliageGoldHi: '#eebe6b',
  foliageOrange: '#c67c3e',
  trunk: '#6f4c2e',
  ivy: '#4f7d3a',
  water: '#7ecbe1',
  waterDark: '#4fa7c4',
  waterHi: '#cdeef7',
  shadow: 'rgba(42,30,16,0.30)',
  castShadow: 'rgba(58,42,22,0.20)',
}

/** 아이소 박스 3면의 폴리곤 점 + 두 벽면의 매핑용 matrix (unit u,v→화면px) */
function boxGeom(w: number, d: number, H: number) {
  const A = [0, 0]
  const B = [w * HW, w * HH]
  const Dp = [-d * HW, d * HH]
  const Cp = [w * HW - d * HW, w * HH + d * HH]
  const up = (p: number[]) => [p[0], p[1] - H]
  const A2 = up(A)
  const B2 = up(B)
  const C2 = up(Cp)
  const D2 = up(Dp)
  const pts = (arr: number[][]) => arr.map((p) => p.join(',')).join(' ')
  return {
    // 지붕(윗면)
    top: pts([A2, B2, C2, D2]),
    // 오른쪽-앞 벽 (B→C 가로, B→B2 세로)
    right: pts([B, Cp, C2, B2]),
    rightMat: `matrix(${-d * HW},${d * HH},0,${-H},${B[0]},${B[1]})`,
    // 왼쪽-앞 벽 (D→C 가로, D→D2 세로)
    left: pts([Dp, Cp, C2, D2]),
    leftMat: `matrix(${w * HW},${w * HH},0,${-H},${Dp[0]},${Dp[1]})`,
    frontY: Cp[1], // 깊이정렬용 최전방 y
  }
}

// ── 기본 아이소 건물 ────────────────────────────────────────────────────────
export function IsoBox({
  w,
  d,
  h,
  roof = 'slate',
  windows,
  door,
  storeys = 1,
}: {
  w: number
  d: number
  h: number
  roof?: 'slate' | 'red' | 'teal' | 'flat'
  windows?: { cols: number; rows: number; arched?: boolean }
  door?: boolean
  storeys?: number
}) {
  const g = boxGeom(w, d, h)
  const roofCol =
    roof === 'red'
      ? [C.roofRedTop, C.roofRedL, C.roofRedR]
      : roof === 'teal'
        ? [C.roofTealTop, C.roofTealL, C.roofTealR]
        : roof === 'flat'
          ? [C.stoneTop, C.stoneL, C.stoneR]
          : [C.roofTop, C.roofL, C.roofR]

  const winEls: React.ReactNode[] = []
  if (windows) {
    const { cols, rows, arched } = windows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols
        const v = 1 - (r + 0.85) / (rows + 0.25)
        const ww = 0.44 / cols
        const wh = 0.66 / (rows + 0.25)
        winEls.push(
          <g key={`w${r}-${c}`}>
            {/* 창틀(돌) */}
            <rect x={u - ww / 2 - 0.014} y={v - 0.02} width={ww + 0.028} height={wh + 0.03} fill={C.quoin} />
            <rect x={u - ww / 2} y={v} width={ww} height={wh} fill={C.mullion} />
            {/* 앰버 유리 + 글로우 */}
            <rect x={u - ww / 2 + 0.01} y={v + 0.015} width={ww - 0.02} height={wh - 0.03} fill={C.glass} />
            <rect x={u - ww / 2 + 0.01} y={v + 0.015} width={(ww - 0.02) * 0.4} height={wh - 0.03} fill={C.glassLit} opacity={0.8} />
            {arched && <path d={`M${u - ww / 2 - 0.014} ${v} Q${u} ${v - ww * 0.9} ${u + ww / 2 + 0.014} ${v} Z`} fill={C.quoin} />}
            {arched && <path d={`M${u - ww / 2} ${v} Q${u} ${v - ww * 0.7} ${u + ww / 2} ${v} Z`} fill={C.glass} />}
            {/* 창살 */}
            <line x1={u} y1={v} x2={u} y2={v + wh} stroke={C.mullion} strokeWidth={0.008} />
            <line x1={u - ww / 2} y1={v + wh * 0.5} x2={u + ww / 2} y2={v + wh * 0.5} stroke={C.mullion} strokeWidth={0.008} />
          </g>,
        )
      }
    }
  }

  const plinthV = Math.min(0.16, 9 / h) // 기단 높이 비율

  return (
    <g shapeRendering="crispEdges">
      {/* 왼쪽(빛) 벽 */}
      <polygon points={g.left} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      <g transform={g.leftMat}>
        {/* 기단 */}
        <rect x={0} y={1 - plinthV} width={1} height={plinthV} fill={C.plinth} />
        {/* 상단 하이라이트 */}
        <rect x={0} y={0} width={1} height={0.035} fill={C.stoneTop} opacity={0.9} />
        {/* 층 구분선 */}
        {storeys > 1 &&
          Array.from({ length: storeys - 1 }).map((_, i) => (
            <line key={i} x1={0} y1={(i + 1) / storeys} x2={1} y2={(i + 1) / storeys} stroke={C.line} strokeWidth={0.012} opacity={0.45} />
          ))}
        {/* 모서리 석재(quoin) — 앞쪽 세로 모서리 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={`q${i}`} x={0} y={i / 7 + 0.01} width={0.05} height={0.07} fill={i % 2 ? C.quoin : C.stoneR} />
        ))}
        {winEls}
        {door && (
          <g>
            <rect x={0.42} y={1 - plinthV - 0.3} width={0.16} height={0.3} fill={C.woodR} />
            <rect x={0.435} y={1 - plinthV - 0.28} width={0.13} height={0.26} fill={C.woodTop} />
            <path d={`M0.42 ${1 - plinthV - 0.28} Q0.5 ${1 - plinthV - 0.37} 0.58 ${1 - plinthV - 0.28}`} fill={C.trim} />
            {/* 문 옆 랜턴 */}
            <circle cx={0.63} cy={1 - plinthV - 0.22} r={0.02} fill="#ffe6a0" />
            <circle cx={0.63} cy={1 - plinthV - 0.22} r={0.04} fill="#ffe6a0" opacity={0.3} />
          </g>
        )}
      </g>
      {/* 오른쪽(그늘) 벽 */}
      <polygon points={g.right} fill={C.stoneR} stroke={C.line} strokeWidth={1} />
      <g transform={g.rightMat}>
        <rect x={0} y={1 - plinthV} width={1} height={plinthV} fill={C.plinth} opacity={0.9} />
        {storeys > 1 &&
          Array.from({ length: storeys - 1 }).map((_, i) => (
            <line key={i} x1={0} y1={(i + 1) / storeys} x2={1} y2={(i + 1) / storeys} stroke={C.line} strokeWidth={0.012} opacity={0.45} />
          ))}
        {windows &&
          Array.from({ length: windows.rows }).map((_, r) =>
            Array.from({ length: Math.max(1, windows.cols - 1) }).map((__, c) => {
              const u = (c + 0.5) / Math.max(1, windows.cols - 1)
              const v = 1 - (r + 0.8) / (windows.rows + 0.3)
              const ww = 0.46 / Math.max(1, windows.cols - 1)
              const wh = 0.56 / (windows.rows + 0.3)
              return (
                <g key={`rr${r}-${c}`}>
                  <rect x={u - ww / 2} y={v} width={ww} height={wh} fill={C.mullion} />
                  <rect x={u - ww / 2 + 0.012} y={v + 0.02} width={ww - 0.024} height={wh - 0.04} fill={C.glassDark} />
                </g>
              )
            }),
          )}
      </g>
      {/* 지붕 윗면 (flat 이 아닐 때만; hall/cottage 는 별도 경사지붕을 덮음) */}
      <polygon points={g.top} fill={roofCol[0]} stroke={C.line} strokeWidth={1} />
      {roof !== 'flat' && (
        <line
          x1={0}
          y1={-h}
          x2={w * HW - d * HW}
          y2={w * HH + d * HH - h}
          stroke={C.roofRidge}
          strokeWidth={1.5}
          opacity={0.7}
        />
      )}
    </g>
  )
}

// ── 학교 건물동 (첨탑 + 아치 스테인드글라스) ─────────────────────────────────
export function IsoHall({ w = 5, d = 3, label }: { w?: number; d?: number; label?: string }) {
  const h = 72
  const g = boxGeom(w, d, h)
  const A2 = [0, -h]
  const B2 = [w * HW, w * HH - h]
  const Dp = [-d * HW, d * HH - h]
  const Cp = [w * HW - d * HW, w * HH + d * HH - h]
  const rh = 46 // 가파른 모임지붕
  const apex = [(A2[0] + Cp[0]) / 2, (A2[1] + Cp[1]) / 2 - rh]
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const poly = (...ps: number[][]) => ps.map((p) => p.join(',')).join(' ')
  return (
    <g>
      <IsoBox w={w} d={d} h={h} roof="flat" storeys={3} windows={{ cols: Math.max(2, Math.round(w) - 1), rows: 3, arched: true }} door />
      {/* 모임지붕 4면 (앞 2면 밝게, 뒤 2면 어둡게) */}
      <polygon points={poly(A2, B2, apex)} fill={C.roofR} stroke={C.line} strokeWidth={1} />
      <polygon points={poly(A2, Dp, apex)} fill={C.roofR} stroke={C.line} strokeWidth={1} />
      <polygon points={poly(Dp, Cp, apex)} fill={C.roofTop} stroke={C.line} strokeWidth={1} />
      <polygon points={poly(B2, Cp, apex)} fill={C.roofL} stroke={C.line} strokeWidth={1} />
      {/* 용마루 능선 하이라이트 */}
      <line x1={apex[0]} y1={apex[1]} x2={mid(Dp, Cp)[0]} y2={mid(Dp, Cp)[1]} stroke={C.roofRidge} strokeWidth={1.6} />
      <line x1={apex[0]} y1={apex[1]} x2={mid(B2, Cp)[0]} y2={mid(B2, Cp)[1]} stroke={C.roofRidge} strokeWidth={1.4} opacity={0.7} />
      {/* 지붕 기와 줄 */}
      {[0.3, 0.5, 0.7].map((t, i) => (
        <line key={i} x1={apex[0] + (Dp[0] - apex[0]) * t} y1={apex[1] + (Dp[1] - apex[1]) * t} x2={apex[0] + (Cp[0] - apex[0]) * t} y2={apex[1] + (Cp[1] - apex[1]) * t} stroke={C.roofR} strokeWidth={0.8} opacity={0.5} />
      ))}
      <circle cx={apex[0]} cy={apex[1] - 2} r={2.6} fill={C.brass} />
      {/* 도머창 (앞 왼쪽 지붕면) */}
      {(() => {
        const t = 0.42
        const dm = [apex[0] + (mid(Dp, Cp)[0] - apex[0]) * t, apex[1] + (mid(Dp, Cp)[1] - apex[1]) * t]
        return (
          <g>
            <polygon points={poly([dm[0] - 6, dm[1] + 2], [dm[0] + 4, dm[1] + 7], [dm[0] + 4, dm[1] - 3], [dm[0] - 6, dm[1] - 8])} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
            <rect x={dm[0] - 4} y={dm[1] - 6} width={5} height={7} fill={C.glass} />
          </g>
        )
      })()}
      {/* 첨탑 */}
      <g transform={`translate(${-d * HW * 0.5},${d * HH * 0.5})`}>
        <rect x={-5} y={-h - 30} width={10} height={32} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
        <rect x={-3} y={-h - 22} width={6} height={9} fill={C.glass} />
        <polygon points={`0,${-h - 70} 10,${-h - 28} 0,${-h - 20} -10,${-h - 28}`} fill={C.roofL} stroke={C.line} strokeWidth={1} />
        <polygon points={`0,${-h - 70} 10,${-h - 28} 0,${-h - 24}`} fill={C.roofR} />
        <circle cx={0} cy={-h - 72} r={3} fill={C.brass} />
      </g>
      {/* 정면 큰 장미창 */}
      <g transform={g.leftMat}>
        <circle cx={0.5} cy={0.5} r={0.1} fill={C.quoin} />
        <circle cx={0.5} cy={0.5} r={0.08} fill={C.mullion} />
        <circle cx={0.5} cy={0.5} r={0.065} fill={C.glassLit} />
        {[0, 60, 120].map((a) => (
          <line key={a} x1={0.5} y1={0.5} x2={0.5 + Math.cos((a * Math.PI) / 180) * 0.065} y2={0.5 + Math.sin((a * Math.PI) / 180) * 0.065} stroke={C.mullion} strokeWidth={0.006} />
        ))}
        {/* 담쟁이 */}
        <path d="M0.06 1 q0.02 -0.3 0.06 -0.5 q0.05 0.1 0.02 0.5 Z" fill={C.ivy} opacity={0.85} />
        <path d="M0.9 1 q-0.03 -0.36 0.02 -0.58 q0.06 0.14 0.04 0.58 Z" fill={C.ivy} opacity={0.85} />
      </g>
      {label && <IsoLabel y={-h - 84} text={label} />}
    </g>
  )
}

// ── 소형 주택 ──────────────────────────────────────────────────────────────
export function IsoCottage({ variant = 'slate' }: { variant?: string }) {
  const roof = (variant === 'red' ? 'red' : variant === 'teal' ? 'teal' : 'slate') as 'slate' | 'red' | 'teal'
  const w = 1.6
  const d = 1.4
  const h = 30
  const g = boxGeom(w, d, h)
  // 박공 지붕
  const ridge = h + 20
  const A = [0, -h]
  const B = [w * HW, w * HH - h]
  const Dp = [-d * HW, d * HH - h]
  const Cp = [w * HW - d * HW, w * HH + d * HH - h]
  const midBD = [(A[0] + Cp[0]) / 2, (A[1] + Cp[1]) / 2 - (ridge - h)]
  return (
    <g shapeRendering="crispEdges">
      <IsoBox w={w} d={d} h={h} roof="flat" windows={{ cols: 1, rows: 1 }} door />
      <polygon points={`${A} ${B} ${midBD}`} fill={roof === 'red' ? C.roofRedL : roof === 'teal' ? C.roofTealL : C.roofL} stroke={C.line} strokeWidth={1} />
      <polygon points={`${A} ${Dp} ${midBD}`} fill={roof === 'red' ? C.roofRedTop : roof === 'teal' ? C.roofTealTop : C.roofTop} stroke={C.line} strokeWidth={1} />
      <polygon points={`${B} ${Cp} ${midBD}`} fill={roof === 'red' ? C.roofRedR : roof === 'teal' ? C.roofTealR : C.roofR} stroke={C.line} strokeWidth={1} />
      <polygon points={`${Dp} ${Cp} ${midBD}`} fill={roof === 'red' ? C.roofRedL : roof === 'teal' ? C.roofTealL : C.roofL} stroke={C.line} strokeWidth={1} />
      {/* 굴뚝 */}
      <rect x={w * HW - d * HW - 4} y={-ridge + 2} width={7} height={16} fill={C.stoneR} stroke={C.line} strokeWidth={1} />
    </g>
  )
}

// ── 상점 건물 ──────────────────────────────────────────────────────────────
export function IsoShop() {
  return (
    <g>
      <IsoBox w={3.2} d={2.4} h={44} roof="red" storeys={2} windows={{ cols: 3, rows: 2 }} door />
    </g>
  )
}

// ── 시장 천막 노점 ─────────────────────────────────────────────────────────
export function IsoStall({ variant = '#c76153' }: { variant?: string }) {
  const w = 1.2
  const d = 1.0
  return (
    <g shapeRendering="crispEdges">
      {/* 매대 */}
      <IsoBox w={w} d={d} h={12} roof="flat" />
      {/* 차양 */}
      <g transform={`translate(0,-26)`}>
        <polygon points={`0,0 ${w * HW},${w * HH} ${w * HW - d * HW},${w * HH + d * HH} ${-d * HW},${d * HH}`} fill={variant} stroke={C.line} strokeWidth={1} />
        <polygon
          points={`0,0 ${w * HW},${w * HH} ${w * HW - d * HW},${w * HH + d * HH} ${-d * HW},${d * HH}`}
          fill="#ffffff"
          opacity={0.18}
        />
        {/* 줄무늬 */}
        <line x1={-d * HW / 2} y1={d * HH / 2} x2={w * HW - d * HW / 2} y2={w * HH + d * HH / 2} stroke="#fff" strokeWidth={2} opacity={0.5} />
      </g>
      {/* 기둥 */}
      <line x1={-d * HW} y1={d * HH} x2={-d * HW} y2={d * HH - 26} stroke={C.woodR} strokeWidth={2} />
      <line x1={w * HW} y1={w * HH} x2={w * HW} y2={w * HH - 26} stroke={C.woodR} strokeWidth={2} />
    </g>
  )
}

// ── 신전 돔 ────────────────────────────────────────────────────────────────
export function IsoDome({ label }: { label?: string }) {
  const w = 4.4
  const d = 3.6
  const h = 60
  return (
    <g shapeRendering="crispEdges">
      <IsoBox w={w} d={d} h={h} roof="flat" storeys={2} windows={{ cols: 4, rows: 2, arched: true }} door />
      {/* 돔 */}
      <g transform={`translate(${(w * HW - d * HW) / 2},${(w * HH + d * HH) / 2 - h})`}>
        <ellipse cx={0} cy={0} rx={w * HW * 0.42} ry={w * HH * 0.42} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
        <path d={`M${-w * HW * 0.42} 0 A${w * HW * 0.42} ${w * HW * 0.42} 0 0 1 ${w * HW * 0.42} 0 Z`} fill={C.roofTealTop} stroke={C.line} strokeWidth={1} />
        <path d={`M${-w * HW * 0.42} 0 A${w * HW * 0.42} ${w * HW * 0.34} 0 0 1 ${w * HW * 0.42} 0`} fill="#fff" opacity={0.12} />
        <line x1={0} y1={-w * HW * 0.42} x2={0} y2={-w * HW * 0.42 - 14} stroke={C.brass} strokeWidth={2} />
        <circle cx={0} cy={-w * HW * 0.42 - 16} r={3} fill={C.brass} />
      </g>
      {label && <IsoLabel y={-h - 60} text={label} />}
    </g>
  )
}

// ── 헛간 ──────────────────────────────────────────────────────────────────
export function IsoBarn() {
  const w = 2
  const d = 1.6
  const h = 26
  const A = [0, -h]
  const B = [w * HW, w * HH - h]
  const Dp = [-d * HW, d * HH - h]
  const Cp = [w * HW - d * HW, w * HH + d * HH - h]
  const mid = [(A[0] + Cp[0]) / 2, (A[1] + Cp[1]) / 2 - 24]
  return (
    <g shapeRendering="crispEdges">
      <IsoBox w={w} d={d} h={h} roof="flat" door />
      <polygon points={`${A} ${Dp} ${mid}`} fill={C.roofRedTop} stroke={C.line} strokeWidth={1} />
      <polygon points={`${B} ${Cp} ${mid}`} fill={C.roofRedR} stroke={C.line} strokeWidth={1} />
      <polygon points={`${Dp} ${Cp} ${mid}`} fill={C.roofRedL} stroke={C.line} strokeWidth={1} />
      <polygon points={`${A} ${B} ${mid}`} fill={C.roofRedL} stroke={C.line} strokeWidth={1} />
    </g>
  )
}

// ── 풍차 ──────────────────────────────────────────────────────────────────
export function IsoWindmill() {
  const w = 1.3
  const d = 1.1
  const h = 46
  return (
    <g shapeRendering="crispEdges">
      <IsoBox w={w} d={d} h={h} roof="flat" windows={{ cols: 1, rows: 2 }} door />
      <g transform={`translate(${(w * HW - d * HW) / 2},${(w * HH + d * HH) / 2 - h - 6})`}>
        <polygon points={`0,-10 8,0 0,10 -8,0`} fill={C.roofL} stroke={C.line} strokeWidth={1} />
        <g style={{ animation: 'mill-spin 8s linear infinite', transformOrigin: '0 0' }}>
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <polygon points="0,0 4,-26 -4,-30" fill={C.woodTop} stroke={C.line} strokeWidth={1} />
            </g>
          ))}
        </g>
      </g>
    </g>
  )
}

// ── 원형 투기장 ────────────────────────────────────────────────────────────
export function IsoColosseum({ label }: { label?: string }) {
  // 앵커(0,0) = 링 중심(지면 높이). 모든 지오메트리는 y ∈ [-wallH-topRise, +arenaDrop] 안 → 잔디로 삐져나오지 않음.
  const rx = 3.0 * HW
  const ry = 3.0 * HH
  const wallH = 30 // 관중석 외벽 높이(px)
  const topRise = 10 // 외벽 상단 링이 앞으로 두꺼워 보이는 정도
  const innerRx = rx * 0.6
  const innerRy = ry * 0.6
  const arenaDrop = 4 // 경기장이 살짝 파여 보이게

  // 정면(아래쪽) 외벽 밴드: 지면 앞선(cy=0) → 상단 앞선(cy=-wallH)
  const frontWall =
    `M${-rx},0 A${rx},${ry} 0 0 0 ${rx},0 ` +
    `L${rx},${-wallH} A${rx},${ry} 0 0 1 ${-rx},${-wallH} Z`

  const arches: React.ReactNode[] = []
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.04 + (i / 13) * 0.92)
    if (a > Math.PI * 0.44 && a < Math.PI * 0.56) continue // 정문 자리 비움
    const cx = Math.cos(a) * rx * 0.92
    const yb = Math.sin(a) * ry * 0.92 // 0..ry (아래쪽일수록 큼)
    const aw = 5
    const top = yb - wallH + 6
    const bot = yb - 4
    arches.push(
      <path
        key={i}
        d={`M${cx - aw},${bot} L${cx - aw},${top + 4} Q${cx},${top - 4} ${cx + aw},${top + 4} L${cx + aw},${bot} Z`}
        fill="#2b231a"
      />,
    )
  }

  return (
    <g shapeRendering="crispEdges">
      {/* 지면 그림자 */}
      <ellipse cx={6} cy={4} rx={rx * 1.02} ry={ry * 1.02} fill={C.castShadow} />
      {/* 바깥 바닥 링(윗면) — 벽 두께 */}
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={C.stoneR} stroke={C.line} strokeWidth={1} />
      {/* 정면 외벽 */}
      <path d={frontWall} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      {/* 외벽 세로 기둥 줄눈 */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = Math.PI * (0.06 + (i / 10) * 0.88)
        const cx = Math.cos(a) * rx * 0.99
        const yb = Math.sin(a) * ry * 0.99
        return <line key={`p${i}`} x1={cx} y1={yb} x2={cx} y2={yb - wallH} stroke={C.stoneR} strokeWidth={1} opacity={0.5} />
      })}
      {/* 아치 개구부 */}
      {arches}
      {/* 상단 코니스 링(앞으로 살짝 튀어나온 테두리) */}
      <path
        d={`M${-rx},${-wallH} A${rx},${ry} 0 0 0 ${rx},${-wallH} L${rx},${-wallH - topRise} A${rx},${ry} 0 0 1 ${-rx},${-wallH - topRise} Z`}
        fill={C.stoneTop}
        stroke={C.line}
        strokeWidth={1}
      />
      {/* 상단 윗면 링 */}
      <ellipse cx={0} cy={-wallH - topRise} rx={rx} ry={ry} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      {/* 관중석 계단(윗면 링 안쪽 동심원) */}
      <ellipse cx={0} cy={-wallH - topRise + 1} rx={rx * 0.82} ry={ry * 0.82} fill={C.stoneR} opacity={0.55} />
      <ellipse cx={0} cy={-wallH - topRise + 2} rx={rx * 0.7} ry={ry * 0.7} fill={C.stoneL} opacity={0.7} />
      {/* 내부 모래 경기장(살짝 파임) */}
      <ellipse cx={0} cy={-wallH - topRise + arenaDrop} rx={innerRx} ry={innerRy} fill="#d8bf88" stroke={C.line} strokeWidth={1} />
      <ellipse cx={0} cy={-wallH - topRise + arenaDrop} rx={innerRx * 0.5} ry={innerRy * 0.5} fill="none" stroke="#c2a874" strokeWidth={1.4} />
      {/* 정문(정면 중앙 아치, 크게) */}
      <path d={`M-11,0 L-11,${-wallH + 4} Q0,${-wallH - 6} 11,${-wallH + 4} L11,0 Z`} fill="#241d14" stroke={C.line} strokeWidth={1} />
      <path d={`M-11,${-wallH + 4} Q0,${-wallH - 6} 11,${-wallH + 4}`} fill="none" stroke={C.brass} strokeWidth={1.5} opacity={0.8} />
      {label && <IsoLabel y={-wallH - topRise - ry - 20} text={label} />}
    </g>
  )
}

// ── 분수 ──────────────────────────────────────────────────────────────────
export function IsoFountain() {
  const rx = 1.7 * HW
  const ry = 1.7 * HH
  return (
    <g shapeRendering="crispEdges">
      {/* 하단 못 */}
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      <ellipse cx={0} cy={-2} rx={rx * 0.82} ry={ry * 0.82} fill={C.water} stroke={C.waterDark} strokeWidth={1} />
      <ellipse cx={-rx * 0.2} cy={-4} rx={rx * 0.3} ry={ry * 0.28} fill={C.waterHi} opacity={0.6} />
      {/* 기둥 + 상단 대야 */}
      <rect x={-4} y={-24} width={8} height={22} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      <ellipse cx={0} cy={-24} rx={rx * 0.42} ry={ry * 0.42} fill={C.stoneTop} stroke={C.line} strokeWidth={1} />
      <ellipse cx={0} cy={-26} rx={rx * 0.3} ry={ry * 0.3} fill={C.water} />
      <rect x={-2} y={-40} width={4} height={16} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      {/* 물줄기 */}
      <path d="M0,-40 q-6,10 -3,20 M0,-40 q6,10 3,20" stroke={C.waterHi} strokeWidth={2} fill="none" opacity={0.8} />
    </g>
  )
}

// ── 대형 아치 성문 (군 통문) ───────────────────────────────────────────────
export function IsoGate({ label }: { label?: string }) {
  const w = 2.2
  const d = 0.8
  const h = 56
  const g = boxGeom(w, d, h)
  return (
    <g shapeRendering="crispEdges">
      <polygon points={g.left} fill={C.stoneL} stroke={C.line} strokeWidth={1} />
      <polygon points={g.right} fill={C.stoneR} stroke={C.line} strokeWidth={1} />
      <polygon points={g.top} fill={C.stoneTop} stroke={C.line} strokeWidth={1} />
      {/* 아치 통로 */}
      <g transform={g.leftMat}>
        <path d="M0.3 1 L0.3 0.4 Q0.5 0.1 0.7 0.4 L0.7 1 Z" fill="#241d14" />
        <path d="M0.3 0.4 Q0.5 0.1 0.7 0.4" fill="none" stroke={C.brass} strokeWidth={0.03} />
      </g>
      {/* 브라스 문양 */}
      <g transform={g.leftMat}>
        <path d="M0.5 0.42 l0.08 0.12 l-0.08 0.12 l-0.08 -0.12 z" fill={C.brass} opacity={0.9} />
      </g>
      {label && <IsoLabel y={-h - 20} text={label} accent="#f0c040" />}
    </g>
  )
}

// ── 목책/성벽 구간 · 망루 ─────────────────────────────────────────────────
export function IsoWall({ w = 2, facing = 'right' }: { w?: number; facing?: 'left' | 'right' }) {
  const d = 0.5
  const h = 22
  const g = boxGeom(facing === 'right' ? w : d, facing === 'right' ? d : w, h)
  return (
    <g shapeRendering="crispEdges">
      <polygon points={g.left} fill={C.woodL} stroke={C.line} strokeWidth={1} />
      <polygon points={g.right} fill={C.woodR} stroke={C.line} strokeWidth={1} />
      <polygon points={g.top} fill={C.woodTop} stroke={C.line} strokeWidth={1} />
    </g>
  )
}
export function IsoTower() {
  const w = 0.9
  const d = 0.9
  const h = 40
  const g = boxGeom(w, d, h)
  return (
    <g shapeRendering="crispEdges">
      <IsoBox w={w} d={d} h={h} roof="flat" windows={{ cols: 1, rows: 2 }} />
      <polygon points={`${(w * HW - d * HW) / 2},${-h - 18} ${(w * HW - d * HW) / 2 + 12},${(w * HH + d * HH) / 2 - h} ${(w * HW - d * HW) / 2},${(w * HH + d * HH) / 2 - h + 6} ${(w * HW - d * HW) / 2 - 12},${(w * HH + d * HH) / 2 - h}`} fill={C.roofR} stroke={C.line} strokeWidth={1} />
      <line x1={g.frontY * 0} y1={0} x2={0} y2={0} stroke="none" />
    </g>
  )
}

// ── 나무 · 관목 · 가로등 · 벤치 · 현수막 ──────────────────────────────────
export function IsoTree({ variant = 'a' }: { variant?: string }) {
  // a=녹색 中, b=녹색 小, c=녹색 大, g=단풍 金, o=단풍 橙
  const scale = variant === 'b' ? 0.6 : variant === 'c' ? 0.95 : variant === 'g' ? 0.85 : variant === 'o' ? 0.8 : 0.75
  const base = variant === 'g' ? C.foliageGold : variant === 'o' ? C.foliageOrange : C.foliageDark
  const mid = variant === 'g' ? C.foliageGoldHi : variant === 'o' ? '#d8934a' : C.foliage
  const hi = variant === 'g' ? '#f4d38a' : variant === 'o' ? '#eab070' : C.foliageHi
  return (
    <g transform={`scale(${scale})`} shapeRendering="crispEdges">
      <ellipse cx={2} cy={-1} rx={13} ry={5} fill={C.shadow} />
      <rect x={-2.5} y={-17} width={5} height={17} fill={C.trunk} stroke={C.line} strokeWidth={1} />
      <circle cx={0} cy={-27} r={13} fill={base} stroke={C.line} strokeWidth={1} />
      <circle cx={5} cy={-24} r={9} fill={base} stroke={C.line} strokeWidth={1} />
      <circle cx={-6} cy={-30} r={8} fill={base} stroke={C.line} strokeWidth={1} />
      <circle cx={-1} cy={-30} r={10} fill={mid} />
      <circle cx={4} cy={-26} r={7} fill={mid} />
      <circle cx={-5} cy={-33} r={5.5} fill={hi} />
      <circle cx={2} cy={-31} r={4} fill={hi} opacity={0.8} />
    </g>
  )
}
export function IsoHedge({ w = 1 }: { w?: number }) {
  const g = boxGeom(w, 0.4, 12)
  return (
    <g shapeRendering="crispEdges">
      <polygon points={g.left} fill={C.foliageDark} stroke={C.line} strokeWidth={1} />
      <polygon points={g.right} fill="#3f7733" stroke={C.line} strokeWidth={1} />
      <polygon points={g.top} fill={C.foliage} stroke={C.line} strokeWidth={1} />
    </g>
  )
}
export function IsoLamp() {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={0} cy={-1} rx={6} ry={3} fill={C.shadow} />
      <rect x={-1.5} y={-30} width={3} height={30} fill="#3b3a44" />
      <circle cx={0} cy={-34} r={5} fill="#ffe6a0" stroke="#3b3a44" strokeWidth={1} />
      <circle cx={0} cy={-34} r={9} fill="#ffe6a0" opacity={0.25} />
    </g>
  )
}
export function IsoBench() {
  return (
    <g shapeRendering="crispEdges">
      <rect x={-12} y={-6} width={24} height={5} fill={C.woodTop} stroke={C.line} strokeWidth={1} />
      <rect x={-12} y={-12} width={24} height={4} fill={C.woodL} stroke={C.line} strokeWidth={1} />
      <rect x={-10} y={-6} width={3} height={6} fill={C.woodR} />
      <rect x={7} y={-6} width={3} height={6} fill={C.woodR} />
    </g>
  )
}
export function IsoBanner({ color = '#c58f42' }: { color?: string }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={-1.5} y={-40} width={3} height={40} fill="#3b3a44" />
      <path d="M2,-38 L18,-38 L14,-22 L2,-22 Z" fill={color} stroke={C.line} strokeWidth={1} />
    </g>
  )
}

// ── 라벨 (대형 구조물 위) ─────────────────────────────────────────────────
export function IsoLabel({ y, text, accent }: { y: number; text: string; accent?: string }) {
  return (
    <g transform={`translate(0,${y})`}>
      <rect x={-text.length * 5 - 6} y={-11} width={text.length * 10 + 12} height={16} rx={3} fill="rgba(10,8,16,0.7)" />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={accent ?? '#e8dcc0'}
        style={{ paintOrder: 'stroke' }}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={2}
      >
        {text}
      </text>
    </g>
  )
}

// ── 캐릭터(플레이어/NPC) ──────────────────────────────────────────────────
export function IsoChara({
  robe,
  shade,
  hair,
  accent,
  back,
  flip,
  moving,
  hat,
}: {
  robe: string
  shade: string
  hair: string
  accent?: string
  back?: boolean
  flip?: boolean
  moving?: boolean
  hat?: string // 뾰족 마법사 모자 색 (플레이어)
}) {
  return (
    <g
      shapeRendering="crispEdges"
      style={{
        transform: `scaleX(${flip ? -1 : 1})`,
        transformOrigin: 'bottom center',
        animation: moving ? 'sprite-walk 0.3s ease-in-out infinite' : 'sprite-idle 2.6s ease-in-out infinite',
      }}
    >
      <ellipse cx={0} cy={-1} rx={10} ry={4.2} fill={C.shadow} />
      <rect x={-3.4} y={-12} width={3} height={12} fill={shade} />
      <rect x={0.4} y={-12} width={3} height={12} fill={shade} />
      <path d="M-7 -32 Q0 -37 7 -32 L9 -13 Q0 -9 -9 -13 Z" fill={robe} stroke="#1c1712" strokeWidth={1} />
      <path d="M0 -36 L0 -12" stroke={shade} strokeWidth={1.4} opacity={0.7} />
      {accent && <rect x={-4.5} y={-21} width={9} height={2.6} fill={accent} />}
      <path d="M-7 -32 q-3.5 5 -2 13" fill="none" stroke={robe} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M7 -32 q3.5 5 2 13" fill="none" stroke={robe} strokeWidth={3.4} strokeLinecap="round" />
      <circle cx={0} cy={-40} r={6.6} fill="#f0d9bf" stroke="#1c1712" strokeWidth={1} />
      <path
        d={back ? 'M-7 -39 Q-6.5 -49 0 -49 Q6.5 -49 7 -39 Q4 -44 0 -44 Q-4 -44 -7 -39 Z' : 'M-6.5 -40 Q-6.5 -49 0 -49 Q6.5 -49 6.5 -40 Q6.5 -44 3 -45 Q1 -42 0 -43 Q-1 -42 -3 -45 Q-6.5 -44 -6.5 -40 Z'}
        fill={hair}
        stroke="#1c1712"
        strokeWidth={0.8}
      />
      {!back && (
        <>
          <circle cx={-2.2} cy={-39.5} r={1.1} fill="#241a12" />
          <circle cx={2.2} cy={-39.5} r={1.1} fill="#241a12" />
        </>
      )}
      {hat && (
        <g>
          <ellipse cx={0} cy={-46} rx={9} ry={3} fill={hat} stroke="#1c1712" strokeWidth={1} />
          <path d="M-7 -46 Q-1 -66 2 -46 Z" fill={hat} stroke="#1c1712" strokeWidth={1} />
          <circle cx={0.5} cy={-64} r={1.8} fill={accent ?? '#e0b050'} />
          <rect x={-7} y={-49} width={14} height={2.4} fill={accent ?? '#e0b050'} opacity={0.8} />
        </g>
      )}
    </g>
  )
}

// 프롭 렌더 디스패치 (map 데이터의 PropDef → 스프라이트)
export function renderProp(p: PropDef): React.ReactNode {
  switch (p.kind) {
    case 'hall':
      return <IsoHall w={p.size?.w} d={p.size?.d} label={p.label} />
    case 'cottage':
      return <IsoCottage variant={p.variant} />
    case 'shop':
      return <IsoShop />
    case 'stall':
      return <IsoStall variant={p.variant} />
    case 'dome':
      return <IsoDome label={p.label} />
    case 'barn':
      return <IsoBarn />
    case 'windmill':
      return <IsoWindmill />
    case 'colosseum':
      return <IsoColosseum label={p.label} />
    case 'fountain':
      return <IsoFountain />
    case 'gate':
      return <IsoGate label={p.label} />
    case 'wall':
      return <IsoWall w={p.size?.w} facing={p.facing} />
    case 'tower':
      return <IsoTower />
    case 'tree':
      return <IsoTree variant={p.variant} />
    case 'hedge':
      return <IsoHedge w={p.size?.w} />
    case 'lamp':
      return <IsoLamp />
    case 'bench':
      return <IsoBench />
    case 'banner':
      return <IsoBanner color={p.variant} />
    default:
      return null
  }
}
