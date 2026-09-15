'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'

// 배경 위에 흩뿌릴 낙엽 — 위치·크기·속도·표류폭·색을 미리 고정해 자연스럽게 어긋나게 배치
const TITLE_LEAVES: { left: string; size: number; dur: string; delay: string; drift: string; color: string }[] = [
  { left: '5%', size: 8, dur: '11s', delay: '-2s', drift: '24px', color: '#d9a441' },
  { left: '15%', size: 6, dur: '9s', delay: '-6.4s', drift: '-18px', color: '#e2542a' },
  { left: '26%', size: 7, dur: '13s', delay: '-1.1s', drift: '30px', color: '#c9a15a' },
  { left: '38%', size: 6, dur: '10s', delay: '-8.2s', drift: '-22px', color: '#d9a441' },
  { left: '50%', size: 5, dur: '12.5s', delay: '-4.6s', drift: '20px', color: '#e2542a' },
  { left: '61%', size: 7, dur: '9.5s', delay: '-7.3s', drift: '-26px', color: '#c9a15a' },
  { left: '73%', size: 6, dur: '14s', delay: '-3.2s', drift: '18px', color: '#d9a441' },
  { left: '84%', size: 8, dur: '10.5s', delay: '-9.1s', drift: '-20px', color: '#e2542a' },
  { left: '93%', size: 5, dur: '11.5s', delay: '-5.5s', drift: '24px', color: '#c9a15a' },
]

// 검게 페이드아웃 후 화면 전환 — 다음 화면이 뜰 때 이 시간만큼 지나 있어야 함(screen-fade-in과 자연스레 이어짐)
const LEAVE_MS = 420

export function TitleScreen() {
  const { dispatch } = useGame()
  const [leaving, setLeaving] = useState(false)

  const handleStart = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => dispatch({ type: 'SET_SCREEN', screen: 'create' }), LEAVE_MS)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0a0d20] text-center">
      {/* 배경 삽화 — PixelLab Pro로 생성한 울토르 마법학교 정문 계단 */}
      <div className="title-bg-frame">
        <div className="title-bg" />
      </div>
      <div className="title-sunrays" />
      <div className="title-vignette" />

      {/* 흩날리는 낙엽 */}
      <div className="title-leaves" aria-hidden="true">
        {TITLE_LEAVES.map((leaf, i) => (
          <span
            key={i}
            className="title-leaf"
            style={
              {
                left: leaf.left,
                '--leaf-size': `${leaf.size}px`,
                '--leaf-dur': leaf.dur,
                '--leaf-delay': leaf.delay,
                '--leaf-drift': leaf.drift,
                '--leaf-color': leaf.color,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 로고 + 시작 CTA */}
      <div className="title-content-scrim relative z-[3] flex flex-col items-center gap-6 px-4 pb-16">
        <div className="title-enter-1">
          <Image
            src="/images/ui/logo.svg"
            alt="마법학교 울토르"
            width={420}
            height={200}
            className="title-logo-glow"
            priority
          />
        </div>
        <button type="button" onClick={handleStart} className="title-start-text title-enter-4">
          <span className="title-start-dash" aria-hidden="true">—</span>
          GAME START
          <span className="title-start-dash" aria-hidden="true">—</span>
        </button>
      </div>

      {/* 전환용 검은 오버레이 */}
      <div className={`title-leave-overlay${leaving ? ' title-leave-active' : ''}`} aria-hidden="true" />
    </div>
  )
}
