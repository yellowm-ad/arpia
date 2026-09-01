'use client'

// ============================================================================
// 4등신 주인공 도트 스프라이트 — 《마법학교 울토르》 삼면도 기반
//
// 우선순위:
//   1) public/images/sprites/hero-<element>-<gender>.png (PixelLab 에서 뽑은
//      8열 × 4행 시트: row0 = 8방향 회전(정지), row1/2/3 = south/east/north 걷기 8프레임.
//      이 파일이 있으면 자동으로 그것을 잘라 애니메이션한다. (west 걷기 = east 좌우 반전)
//   2) 없으면 아래 SvgHero — 삼면도 팔레트로 그린 절차적 픽셀 스프라이트(폴백).
//
// 두 경로 모두 dir(down/up/left/right) + walking(bool) 인터페이스가 같다.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import type { Element, Gender } from '@/lib/types'

export type Facing = 'down' | 'up' | 'left' | 'right'

// ─── 삼면도 팔레트 ───────────────────────────────────────────────────────────
interface Palette {
  skin: string
  skinSh: string
  hair: string
  hairTip: string
  coat: string
  coatSh: string
  trim: string
  inner: string // 셔츠/타이/이너
  boots: string
  accent: string // 엠블럼/젬/브라스
  line: string
}

const PALETTES: Record<Element, Palette> = {
  fire: {
    skin: '#f1dcc0', skinSh: '#e0bd98',
    hair: '#e98a6a', hairTip: '#b5271d',
    coat: '#1b1a1f', coatSh: '#111015', trim: '#d6402a',
    inner: '#efeadd', boots: '#17161a', accent: '#e2a23a',
    line: '#0b0a0d',
  },
  ice: {
    skin: '#f1dcc0', skinSh: '#e0bd98',
    hair: '#e9edf3', hairTip: '#79b6d8',
    coat: '#f0ede4', coatSh: '#d3cfc2', trim: '#26305f',
    inner: '#26305f', boots: '#e9e9ef', accent: '#57b3dc',
    line: '#1a1f33',
  },
  earth: {
    skin: '#d9b58d', skinSh: '#bd9268',
    hair: '#e9e3d2', hairTip: '#c9c2ab',
    coat: '#232a20', coatSh: '#161b13', trim: '#c6a04a',
    inner: '#2f3a2c', boots: '#191916', accent: '#4f8a4f',
    line: '#0d100b',
  },
}

// SVG 좌표계 32 × 44 (약 4등신: 머리 y5~16). 정수 좌표 + crispEdges = 픽셀 느낌.
function SvgHero({
  element,
  gender,
  dir,
  frame,
  className,
}: {
  element: Element
  gender: Gender
  dir: Facing
  frame: 0 | 1 | 2 // 0 = 대기, 1/2 = 걷기 좌우 스텝
  className?: string
}) {
  const p = PALETTES[element]
  const female = gender === 'female'
  const back = dir === 'up'
  const side = dir === 'left' || dir === 'right'
  const flip = dir === 'left'

  // 걷기 다리 오프셋
  const legL = frame === 1 ? -2 : frame === 2 ? 2 : 0
  const legR = -legL
  const bob = frame === 0 ? 0 : 1
  const armSwing = frame === 1 ? 2 : frame === 2 ? -2 : 0

  const R = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}) => (
    <rect x={x} y={y + bob} width={w} height={h} fill={fill} {...extra} />
  )

  return (
    <svg
      viewBox="0 0 32 44"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', overflow: 'visible' }}
      role="img"
      aria-label="주인공 스프라이트"
    >
      <g transform={flip ? 'translate(32,0) scale(-1,1)' : undefined}>
        {/* 바닥 그림자 */}
        <ellipse cx="16" cy="42.5" rx={side ? 5 : 7} ry="2" fill="rgba(0,0,0,0.33)" />

        {/* ── 다리 / 부츠 ── */}
        {side ? (
          <>
            {R(13 + armSwing, 32, 5, 8, p.coatSh)}
            {R(13 + armSwing, 39, 6, 3, p.boots)}
            {R(14 - armSwing, 32, 5, 8, p.coat)}
            {R(14 - armSwing, 39, 6, 3, p.boots)}
          </>
        ) : (
          <>
            {R(11, 32 + Math.max(0, legL), 4, 8 - Math.max(0, legL), female ? p.skinSh : p.coatSh)}
            {R(11, 39, 5, 3, p.boots)}
            {R(17, 32 + Math.max(0, legR), 4, 8 - Math.max(0, legR), female ? p.skin : p.coat)}
            {R(16, 39, 5, 3, p.boots)}
          </>
        )}

        {/* ── 코트 / 드레스 본체 ── */}
        {female ? (
          <>
            {/* 플레어 스커트 */}
            <path
              d={`M9 ${30 + bob} H23 L26 ${38 + bob} H6 Z`}
              fill={p.coat}
              stroke={p.line}
              strokeWidth="0.5"
            />
            <path d={`M6 ${37 + bob} H26 L26 ${38 + bob} H6 Z`} fill={p.trim} />
            {R(10, 16, 12, 15, p.coat)}
          </>
        ) : (
          <>
            {/* 롱코트: 몸통 + 코트자락 */}
            {R(10, 16, 12, 16, p.coat)}
            <path d={`M10 ${28 + bob} H22 L24 ${40 + bob} H8 Z`} fill={p.coat} stroke={p.line} strokeWidth="0.5" />
            {/* 중앙 트임 */}
            {R(15, 28, 2, 12, p.coatSh)}
          </>
        )}

        {/* 코트 라펠 / 트림 세로줄 */}
        {!back && (
          <>
            {R(12, 16, 1.4, 14, p.trim)}
            {R(18.6, 16, 1.4, 14, p.trim)}
            {/* 이너(셔츠/타이) */}
            {R(14, 16, 4, 10, p.inner)}
          </>
        )}
        {/* 벨트 + 버클 */}
        {R(10, 25, 12, 2, p.coatSh)}
        {R(15, 25, 2, 2, p.accent)}

        {/* 하이넥 카라 */}
        {R(12, 14, 8, 3, p.coat)}
        {R(12, 14, 8, 1, p.trim)}

        {/* 등 엠블럼 (뒤 모습) / 가슴 엠블럼 (옆) */}
        {back && (
          <>
            {R(14, 19, 4, 5, p.accent)}
            {R(15, 18, 2, 1, p.accent)}
          </>
        )}

        {/* ── 팔 ── */}
        {side ? (
          <>{R(15, 17 + armSwing, 3, 10, p.coat)}{R(15, 25 + armSwing, 3, 2, p.trim)}</>
        ) : (
          <>
            {R(8.5, 17 - armSwing, 3, 11, p.coat)}
            {R(20.5, 17 + armSwing, 3, 11, p.coat)}
            {R(8.5, 26 - armSwing, 3, 2, p.trim)}
            {R(20.5, 26 + armSwing, 3, 2, p.trim)}
            {/* 장갑 */}
            {R(8.5, 27 - armSwing, 3, 2, p.coatSh)}
            {R(20.5, 27 + armSwing, 3, 2, p.coatSh)}
          </>
        )}

        {/* ── 머리 ── */}
        {/* 목 */}
        {R(14.5, 12.5, 3, 3, p.skin)}
        {/* 두상 */}
        {R(10.5, 4.5, 11, 9.5, p.skin)}
        {/* 헤어 캡 */}
        {R(9.5, 3.5, 13, 5, p.hair)}
        {R(9.5, 3.5, 2, 8, p.hair)}
        {R(20.5, 3.5, 2, 8, p.hair)}
        {back && R(10.5, 4.5, 11, 8, p.hair)}
        {/* 헤어 끝단 색 */}
        {R(9.5, 10, 2, 3, p.hairTip)}
        {R(20.5, 10, 2, 3, p.hairTip)}
        {!female && !back && <>{R(19, 2, 3, 3, p.hair)}{R(20, 1, 2, 2, p.hairTip)}</>}
        {female && <>{R(9, 9, 2.5, 5, p.hair)}{R(21.5, 9, 2.5, 5, p.hair)}{R(9, 13, 2.5, 1.5, p.hairTip)}{R(21.5, 13, 2.5, 1.5, p.hairTip)}</>}

        {/* 얼굴 (정면/옆만) */}
        {!back && (
          <>
            {side ? (
              <>
                {R(19, 8, 1.5, 1.5, p.line)}
                <path d={`M20 ${11 + bob} q1.5 1 3 0`} stroke={p.line} strokeWidth="0.6" fill="none" />
              </>
            ) : (
              <>
                {R(12.5, 8, 1.8, 1.8, p.line)}
                {R(17.7, 8, 1.8, 1.8, p.line)}
                {element === 'fire' && R(12, 6.5, 3, 0.8, p.hairTip) /* 눈가리개 끈 느낌 */}
                {element === 'ice' && <>{/* 안경 */}<rect x="11.8" y="7.6" width="3" height="2.6" fill="none" stroke={p.line} strokeWidth="0.5" /><rect x="17.2" y="7.6" width="3" height="2.6" fill="none" stroke={p.line} strokeWidth="0.5" /></>}
                <path d={`M14 ${11.4 + bob} q2 1.2 4 0`} stroke={p.line} strokeWidth="0.6" fill="none" />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  )
}

// ─── PixelLab 스프라이트 시트 ───────────────────────────────────────────────
// scripts/build-hero-sheets 로 생성: 88px 셀, 8열 × 4행.
//   row 0 = 8방향 회전 (south, south-east, east, north-east, north, north-west, west, south-west)
//   row 1 = south(정면) 걷기 8프레임
//   row 2 = east(우) 걷기 8프레임   ← west(좌) 는 이 행을 좌우 반전해서 사용
//   row 3 = north(후면) 걷기 8프레임
function sheetSrc(element: Element, gender: Gender) {
  return `/images/sprites/hero-${element}-${gender}.png`
}

const SHEET_COLS = 8
const SHEET_ROWS = 4
/** 4방향 → row 0 회전 컬럼 (PixelLab 방향 순서 기준) */
const DIR_COL: Record<Facing, number> = { down: 0, right: 2, up: 4, left: 6 }
/** 4방향 → 걷기 행. left 는 right(row2) 를 좌우 반전. */
const WALK_ROW: Record<Facing, number> = { down: 1, right: 2, left: 2, up: 3 }
const WALK_FRAMES = 8
const WALK_MS = 115

/**
 * 주인공 스프라이트. PixelLab 시트가 있으면 그것을, 없으면 절차적 SVG를 쓴다.
 */
export function HeroSprite({
  element,
  gender,
  dir = 'down',
  walking = false,
  px = 64,
  className,
}: {
  element: Element
  gender: Gender
  dir?: Facing
  walking?: boolean
  px?: number
  className?: string
}) {
  const [sheetOk, setSheetOk] = useState(false)
  const [frame, setFrame] = useState(0) // 0..7
  const raf = useRef<number>(0)

  // 시트 존재 여부 확인
  useEffect(() => {
    setSheetOk(false)
    const img = new Image()
    img.onload = () => setSheetOk(img.naturalWidth > 0)
    img.onerror = () => setSheetOk(false)
    img.src = sheetSrc(element, gender)
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [element, gender])

  // 걷기 프레임 타이머
  useEffect(() => {
    if (!walking) {
      setFrame(0)
      return
    }
    let last = 0
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick)
      if (t - last < WALK_MS) return
      last = t
      setFrame((f) => (f + 1) % WALK_FRAMES)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [walking])

  if (sheetOk) {
    // 정지 = row0 회전 컬럼. 걷기 = 방향별 걷기 행(row1/2/3) 8프레임 순환.
    // west(좌) 걷기는 east 행(row2)을 좌우 반전.
    const row = walking ? WALK_ROW[dir] : 0
    const col = walking ? frame : DIR_COL[dir]
    const flipX = walking && dir === 'left'
    return (
      <div
        className={className}
        style={{
          width: px,
          height: px,
          transform: flipX ? 'scaleX(-1)' : undefined,
          backgroundImage: `url(${sheetSrc(element, gender)})`,
          backgroundSize: `${px * SHEET_COLS}px ${px * SHEET_ROWS}px`,
          backgroundPosition: `-${col * px}px -${row * px}px`,
          imageRendering: 'pixelated',
        }}
        role="img"
        aria-label="주인공 스프라이트"
      />
    )
  }

  const svgFrame: 0 | 1 | 2 = walking ? (frame % 2 === 1 ? 1 : 2) : 0
  return (
    <div className={className} style={{ width: px, height: px, display: 'inline-block' }}>
      <SvgHero element={element} gender={gender} dir={dir} frame={svgFrame} className="h-full w-full" />
    </div>
  )
}
