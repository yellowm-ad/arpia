'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'

export function TitleScreen() {
  const { dispatch } = useGame()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0a0d20] px-4 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(91,107,214,0.35), transparent 55%), radial-gradient(circle at 75% 75%, rgba(217,164,65,0.25), transparent 50%)',
        }}
      />
      <Image src="/images/ui/logo.svg" alt="마법학교 울토르" width={300} height={140} className="mb-4 drop-shadow-[0_4px_20px_rgba(217,164,65,0.5)]" priority />
      <h1 className="mb-4 font-display text-3xl text-gold-soft text-shadow-ink">마법학교 울토르</h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
        악마의 피에서 시작된 인간의 마법. 2,000년 동안 이어진 인간과 악마의 전쟁.
        <br />그 끝을 선택하게 되는 한 명의 마법학교 신입생.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="lg" variant="default" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'create' })}>
          새로운 모험 시작하기
        </Button>
      </div>
      <p className="mt-10 text-[11px] text-muted-foreground/70">
        오리지널 세계관 기획 초안(draft). 계약수 진화·상위 지역·전체 스킬 밸런싱은 추후 업데이트 예정입니다.
      </p>
    </div>
  )
}
