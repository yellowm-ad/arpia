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
      <Image src="/images/ui/logo.svg" alt="마법학교 아르피아" width={300} height={140} className="mb-6 drop-shadow-[0_4px_20px_rgba(217,164,65,0.5)]" priority />
      <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
        쿼터뷰 턴제 RPG 웹게임 초안 — 마법학교를 배경으로 파티를 꾸려 몬스터와 맞서 싸우세요.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="lg" variant="default" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'create' })}>
          새로운 모험 시작하기
        </Button>
      </div>
      <p className="mt-10 text-[11px] text-muted-foreground/70">
        본 게임은 기획 초안(draft)이며 일부 데이터(펫 디자인, 전체 스킬/밸런싱)는 추후 업데이트 예정입니다.
      </p>
    </div>
  )
}
