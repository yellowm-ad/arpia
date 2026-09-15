'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { HeroPortrait } from '@/components/game/portrait'
import { HeroSprite } from '@/components/game/pixel-hero'
import { ELEMENTS, ELEMENT_META } from '@/lib/constants'
import type { Element, Gender } from '@/lib/types'

// ELEMENT_META.color는 `var(--elem-*)` 참조라 문자열에 알파(hex) 접미사를 붙일 수 없다(무효 CSS).
// 반투명 글로우/그라디언트에서만 실제 16진값이 필요해 여기서 따로 미러링해 둔다.
const ELEMENT_HEX: Record<Element, string> = { fire: '#e2542a', ice: '#4fb8e6', earth: '#a97c3f' }

// 인게임 캐릭터 발밑 마법진 — iso-world.tsx 게이트 포탈과 같은 시각 언어(룬 링+회전 다이아) 재사용
function CreateMagicCircle({ color }: { color: string }) {
  const R = 92
  const runes = Array.from({ length: 10 }).map((_, i) => {
    const a = (i / 10) * Math.PI * 2
    return <rect key={i} x={Math.cos(a) * R - 2.5} y={Math.sin(a) * R * 0.5 - 2.5} width={5} height={5} style={{ fill: color }} />
  })
  return (
    <svg viewBox="-100 -55 200 110" className="pointer-events-none w-[220px] sm:w-[260px]" aria-hidden="true">
      <ellipse cx={0} cy={0} rx={R} ry={R * 0.5} fill="none" strokeWidth={4} style={{ stroke: color, opacity: 0.5, animation: 'portal-pulse 2.4s ease-in-out infinite' }} />
      <ellipse cx={0} cy={0} rx={R - 10} ry={(R - 10) * 0.5} strokeWidth={1.6} style={{ fill: `${color}22`, stroke: color }} />
      {runes}
      <g style={{ animation: 'mill-spin 7s linear infinite' }}>
        <rect x={-3} y={-R * 0.5} width={6} height={6} style={{ fill: color }} />
        <rect x={-3} y={R * 0.5 - 6} width={6} height={6} style={{ fill: color }} />
        <rect x={-R + 6} y={-3} width={6} height={6} style={{ fill: color }} />
        <rect x={R - 12} y={-3} width={6} height={6} style={{ fill: color }} />
      </g>
      <ellipse cx={0} cy={2} rx={R * 0.3} ry={R * 0.16} opacity={0.5} style={{ fill: color }} />
    </svg>
  )
}

export function CreateScreen() {
  const { dispatch } = useGame()
  const [name, setName] = useState('')
  const [element, setElement] = useState<Element>('fire')
  const [gender, setGender] = useState<Gender>('male')
  const meta = ELEMENT_META[element]

  return (
    <div className="screen-fade-in flex h-full w-full flex-col overflow-hidden bg-[#0a0d20]">
      {/* 상단: 마법학교 뒷배경 위에 인게임 캐릭터(도트 스프라이트)가 마법진을 밟고 서있는 모습.
          우측 상단엔 참고용 일러스트를 작게 곁들인다. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="title-bg-frame">
          <div className="title-bg" />
        </div>
        <div className="title-sunrays" />
        <div className="title-vignette" />

        <h1 className="relative z-[2] pt-4 text-center font-display text-lg text-gold-soft text-shadow-ink">캐릭터 생성</h1>

        {/* 일러스트 미리보기(보너스) */}
        <div className="absolute top-4 right-4 z-[2] w-16 sm:w-20">
          <div className="create-portrait-frame create-portrait-frame-sm">
            <HeroPortrait element={element} gender={gender} className="h-full w-full" />
          </div>
          <p className="text-shadow-ink mt-1 text-center text-[9px] text-muted-foreground">일러스트</p>
        </div>

        {/* 인게임 캐릭터 + 마법진 */}
        <div className="absolute inset-x-0 bottom-4 z-[1] flex justify-center">
          <CreateMagicCircle color={ELEMENT_HEX[element]} />
        </div>
        <div className="absolute inset-x-0 bottom-10 z-[2] flex justify-center">
          <div className="create-hero-idle drop-shadow-[0_10px_14px_rgba(0,0,0,0.55)]">
            <HeroSprite element={element} gender={gender} px={128} />
          </div>
        </div>
      </div>

      {/* 하단: 선택 바 */}
      <div className="relative z-[3] shrink-0 border-t border-gold/30 bg-[#10132a] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">이름</label>
              <input
                value={name}
                maxLength={10}
                onChange={(e) => setName(e.target.value)}
                placeholder="견습생의 이름"
                className="w-40 rounded-lg border border-border bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">성별</label>
              <div className="inline-flex rounded-full border border-gold/25 bg-black/25 p-1">
                {(['male', 'female'] as Gender[]).map((gd) => (
                  <button
                    key={gd}
                    onClick={() => setGender(gd)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      gender === gd ? 'bg-gold text-ink' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {gd === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">계통</label>
              <div className="flex gap-3">
                {ELEMENTS.map((el) => {
                  const m = ELEMENT_META[el]
                  const hex = ELEMENT_HEX[el]
                  const active = element === el
                  return (
                    <button key={el} onClick={() => setElement(el)} className="flex flex-col items-center gap-1">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full transition-all"
                        style={{
                          background: active ? `radial-gradient(circle at 35% 30%, ${hex}66, ${hex}1a 72%)` : 'rgba(255,255,255,0.04)',
                          boxShadow: active ? `0 0 0 2px ${hex}, 0 0 14px ${hex}99` : '0 0 0 1px rgba(255,255,255,0.1)',
                        }}
                      >
                        <Image src={m.icon} alt={m.name} width={24} height={24} />
                      </span>
                      <span className="text-[11px] font-semibold" style={active ? { color: m.color } : undefined}>
                        {m.line}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'title' })}>
              뒤로
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => dispatch({ type: 'START_GAME', name: name.trim() || '이름없는 견습생', element, gender })}
            >
              모험 시작
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">{meta.blurb}</p>
        <p className="mx-auto mt-1 max-w-3xl text-[10px] text-muted-foreground/60">삼원 상성: 화염계 → 빙결계 → 대지계 → 화염계</p>
      </div>
    </div>
  )
}
