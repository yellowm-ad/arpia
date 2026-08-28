'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { ELEMENT_META } from '@/lib/constants'
import type { Element } from '@/lib/types'

const ELEMENTS: Element[] = ['fire', 'water', 'wind', 'earth']

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
        <div className="mb-5 grid grid-cols-4 gap-2">
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
          {element === 'fire' && '불 속성: 강력한 화염 마법으로 적을 태웁니다. 마법공격력에 특화되며 바람 속성에 강하고 물 속성에 약합니다.'}
          {element === 'water' && '물 속성: 냉기와 치유 마법을 다룹니다. 마나와 마법방어력에 특화되며 불 속성에 강하고 흙 속성에 약합니다.'}
          {element === 'wind' && '바람 속성: 빠른 속도로 선제 공격에 유리합니다. 속도와 행운에 특화되며 흙 속성에 강하고 불 속성에 약합니다.'}
          {element === 'earth' && '흙 속성: 튼튼한 방어력으로 오래 버팁니다. 체력과 방어력에 특화되며 물 속성에 강하고 바람 속성에 약합니다.'}
        </div>
        <p className="mb-4 text-center text-[10px] text-muted-foreground/70">상성 순환: 불 → 바람 → 흙 → 물 → 불</p>

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
