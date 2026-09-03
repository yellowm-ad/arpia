'use client'

// ============================================================================
// 펫 / 몹 도트 스프라이트 — `펫 몹 디자인.png` 기반, PixelLab v3 로 방향·걷기 생성.
//
//   public/images/creatures/<spriteId>.png  (scripts/_pixellab/build-creature-sheets.mjs)
//     8열 × 4행 시트:
//       row 0 = 4방향 정지 (south, east, north, west) = col 0,1,2,3
//       row 1 = south(정면) 걷기 8프레임
//       row 2 = east(우)   걷기 8프레임   ← west(좌) 는 이 행을 좌우 반전
//       row 3 = north(후면) 걷기 8프레임
//
// spriteId: 펫 = 'emberling' 등(접두어 pet- 제거), 몹 = 'mon-forest-raccoon' 등(그대로).
// 시트가 없으면 fallbackSrc(기존 SVG 아이콘)로 폴백한다.
// ============================================================================

import { useEffect, useRef, useState } from 'react'

export type Facing = 'down' | 'up' | 'left' | 'right'

const SHEET_COLS = 8
const SHEET_ROWS = 4
const DIR_COL: Record<Facing, number> = { down: 0, right: 1, up: 2, left: 3 }
const WALK_ROW: Record<Facing, number> = { down: 1, right: 2, left: 2, up: 3 }
const WALK_FRAMES = 8
const WALK_MS = 130

export function creatureSheetSrc(spriteId: string) {
  return `/images/creatures/${spriteId}.png`
}

/** Combatant.refId → 스프라이트 id */
export function spriteIdFromRefId(refId: string) {
  return refId.startsWith('pet-') ? refId.slice(4) : refId
}

export function CreatureSprite({
  spriteId,
  fallbackSrc,
  dir = 'down',
  walking = false,
  px = 64,
  flip = false,
  className,
}: {
  spriteId: string
  fallbackSrc?: string
  dir?: Facing
  walking?: boolean
  px?: number
  /** 추가 좌우 반전(적군이 왼쪽을 보게 할 때 등). 걷기 left 반전과 XOR 합성. */
  flip?: boolean
  className?: string
}) {
  const [sheetOk, setSheetOk] = useState(false)
  const [frame, setFrame] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    setSheetOk(false)
    const img = new Image()
    img.onload = () => setSheetOk(img.naturalWidth > 0)
    img.onerror = () => setSheetOk(false)
    img.src = creatureSheetSrc(spriteId)
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [spriteId])

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
    const row = walking ? WALK_ROW[dir] : 0
    const col = walking ? frame : DIR_COL[dir]
    const flipX = (walking && dir === 'left') !== flip // XOR
    return (
      <div
        className={className}
        style={{
          width: px,
          height: px,
          transform: flipX ? 'scaleX(-1)' : undefined,
          backgroundImage: `url(${creatureSheetSrc(spriteId)})`,
          backgroundSize: `${px * SHEET_COLS}px ${px * SHEET_ROWS}px`,
          backgroundPosition: `-${col * px}px -${row * px}px`,
          imageRendering: 'pixelated',
        }}
        role="img"
        aria-label="크리처 스프라이트"
      />
    )
  }

  if (fallbackSrc) {
    return (
      <div className={className} style={{ width: px, height: px, transform: flip ? 'scaleX(-1)' : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackSrc} alt="" className="h-full w-full object-contain" style={{ imageRendering: 'pixelated' }} />
      </div>
    )
  }

  return <div className={className} style={{ width: px, height: px }} />
}
