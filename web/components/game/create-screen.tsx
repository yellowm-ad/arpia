'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { HeroPortrait } from '@/components/game/portrait'
import { ELEMENTS, ELEMENT_META } from '@/lib/constants'
import type { Element, Gender } from '@/lib/types'

export function CreateScreen() {
  const { dispatch } = useGame()
  const [name, setName] = useState('')
  const [element, setElement] = useState<Element>('fire')
  const [gender, setGender] = useState<Gender>('male')
  const meta = ELEMENT_META[element]

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0d20] px-4">
      <div className="panel-gilded screen-fade-in w-full max-w-3xl p-5">
        <h1 className="mb-4 text-center font-display text-xl text-gold-soft text-shadow-ink">캐릭터 생성</h1>

        <div className="mb-4 flex flex-col gap-5 sm:flex-row">
          {/* 왼쪽: 캐릭터 일러스트 — 선택한 계통/성별에 실시간 반응 */}
          <div className="mx-auto w-full max-w-[200px] shrink-0 sm:mx-0 sm:w-52">
            <div className="create-portrait-frame">
              <HeroPortrait element={element} gender={gender} className="h-full w-full" />
            </div>
            <div className="create-portrait-glow" style={{ '--glow-color': meta.color } as CSSProperties} />
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <Image src={meta.icon} alt={meta.name} width={20} height={20} />
              <span className="text-xs font-semibold" style={{ color: meta.color }}>
                {meta.line}
              </span>
            </div>
          </div>

          {/* 오른쪽: 입력 폼 */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">이름</label>
            <input
              value={name}
              maxLength={10}
              onChange={(e) => setName(e.target.value)}
              placeholder="견습생의 이름"
              className="mb-3 w-full rounded-lg border border-border bg-black/30 px-3 py-2 text-sm outline-none focus:border-gold"
            />

            <label className="mb-1.5 block text-xs text-muted-foreground">성별</label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(['male', 'female'] as Gender[]).map((gd) => (
                <button
                  key={gd}
                  onClick={() => setGender(gd)}
                  className="rounded-lg border-2 py-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: gender === gd ? 'var(--gold, #d9a441)' : 'var(--border)',
                    background: gender === gd ? 'rgba(217,164,65,0.14)' : 'transparent',
                  }}
                >
                  {gd === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>

            <label className="mb-2 block text-xs text-muted-foreground">계통 선택</label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {ELEMENTS.map((el) => {
                const m = ELEMENT_META[el]
                const active = element === el
                return (
                  <button
                    key={el}
                    onClick={() => setElement(el)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all"
                    style={{
                      borderColor: active ? (m.color as string) : 'var(--border)',
                      background: active ? `${m.color}22` : 'transparent',
                    }}
                  >
                    <Image src={m.icon} alt={m.name} width={30} height={30} />
                    <span className="text-xs font-semibold">{m.line}</span>
                  </button>
                )
              })}
            </div>

            <div className="rounded-lg border border-border/60 bg-black/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              {meta.blurb}
            </div>
          </div>
        </div>

        <p className="mb-4 text-center text-[10px] text-muted-foreground/70">삼원 상성: 화염계 → 빙결계 → 대지계 → 화염계</p>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'title' })}>
            뒤로
          </Button>
          <Button
            variant="default"
            onClick={() => dispatch({ type: 'START_GAME', name: name.trim() || '이름없는 견습생', element, gender })}
          >
            모험 시작
          </Button>
        </div>
      </div>
    </div>
  )
}
