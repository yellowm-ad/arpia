'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { ELEMENTS, ELEMENT_META } from '@/lib/constants'
import type { Element } from '@/lib/types'

export function CreateScreen() {
  const { dispatch } = useGame()
  const [name, setName] = useState('')
  const [element, setElement] = useState<Element>('fire')

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0d20] px-4">
      <div className="panel-gilded w-full max-w-lg p-5">
        <h1 className="mb-4 text-center font-display text-xl text-gold-soft text-shadow-ink">캐릭터 생성</h1>

        <label className="mb-1 block text-xs text-muted-foreground">이름</label>
        <input
          value={name}
          maxLength={10}
          onChange={(e) => setName(e.target.value)}
          placeholder="견습생의 이름을 입력하세요"
          className="mb-4 w-full rounded-lg border border-border bg-black/30 px-3 py-2 text-sm outline-none focus:border-gold"
        />

        <label className="mb-2 block text-xs text-muted-foreground">속성 선택</label>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {ELEMENTS.map((el) => {
            const meta = ELEMENT_META[el]
            const active = element === el
            return (
              <button
                key={el}
                onClick={() => setElement(el)}
                className="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all"
                style={{
                  borderColor: active ? (meta.color as string) : 'var(--border)',
                  background: active ? `${meta.color}22` : 'transparent',
                }}
              >
                <Image src={meta.icon} alt={meta.name} width={32} height={32} />
                <span className="text-xs font-semibold">{meta.name}</span>
              </button>
            )
          })}
        </div>

        <div className="mb-5 rounded-lg border border-border/60 bg-black/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {ELEMENT_META[element].blurb}
        </div>
        <p className="mb-4 text-center text-[10px] text-muted-foreground/70">상성 순환: 불꽃 → 얼음 → 대지 → 불꽃</p>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'title' })}>
            뒤로
          </Button>
          <Button
            variant="default"
            onClick={() => dispatch({ type: 'START_GAME', name: name.trim() || '이름없는 견습생', element })}
          >
            모험 시작
          </Button>
        </div>
      </div>
    </div>
  )
}
