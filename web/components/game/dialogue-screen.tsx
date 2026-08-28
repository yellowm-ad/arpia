'use client'

import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { npcById } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Portrait } from '@/components/game/portrait'
import { JOB_TIERS, jobTierForLevel } from '@/lib/constants'

const ROLE_LABEL: Record<string, string> = {
  jobTrainer: '전직 담당관',
  weaponMerchant: '무기 상인',
  potionMerchant: '물약 상인',
  toolMerchant: '도구 상인',
  petTamer: '펫 조련사',
  housing: '기숙사 촌장',
  arenaMaster: '투기장장',
  guard: '경비대장',
  flavor: '주민',
}

export function DialogueScreen() {
  const { state, dispatch } = useGame()
  const npc = state.activeNpcId ? npcById(state.activeNpcId) : null
  const [lineIdx, setLineIdx] = useState(0)

  if (!npc || state.screen !== 'dialogue') return null

  const close = () => {
    setLineIdx(0)
    dispatch({ type: 'CLOSE_OVERLAY' })
  }

  const isShopkeeper = ['weaponMerchant', 'potionMerchant', 'toolMerchant'].includes(npc.role)
  const isTamer = npc.role === 'petTamer'
  const isJobTrainer = npc.role === 'jobTrainer'
  const isElder = npc.role === 'housing'
  const eligible = jobTierForLevel(state.player.level)
  const canJobChange = isJobTrainer && eligible.id !== state.player.jobTierId
  const currentTier = JOB_TIERS.find((t) => t.id === state.player.jobTierId)!
  const lastLine = lineIdx >= npc.greeting.length - 1

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-black/50 p-3 sm:p-6">
      {/* RPG 대화창 */}
      <div className="dialogue-box relative w-full max-w-3xl">
        <div className="flex items-stretch gap-0">
          {/* 초상화 */}
          <div className="relative w-28 shrink-0 overflow-hidden rounded-l-xl border-y-2 border-l-2 border-gold/70 sm:w-40">
            <Portrait id={npc.id} className="h-full w-full" />
          </div>

          {/* 본문 */}
          <div className="flex-1 rounded-r-xl border-2 border-gold/70 bg-[#1c1731] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-gold/20 px-2 py-0.5 font-display text-sm text-gold-soft text-shadow-ink">
                {npc.name}
              </span>
              <span className="text-[11px] text-muted-foreground">{ROLE_LABEL[npc.role]}</span>
            </div>

            <p className="min-h-16 text-sm leading-relaxed text-foreground/90">{npc.greeting[lineIdx]}</p>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {!lastLine && (
                <Button variant="outline" size="sm" onClick={() => setLineIdx((i) => Math.min(npc.greeting.length - 1, i + 1))}>
                  ▼ 다음
                </Button>
              )}

              {lastLine && (isShopkeeper || isTamer) && (
                <Button variant="default" size="sm" onClick={() => dispatch({ type: 'OPEN_SHOP', npcId: npc.id })}>
                  {isTamer ? '먹이 상점' : '상점 열기'}
                </Button>
              )}

              {lastLine && isTamer && (
                <Button variant="default" size="sm" onClick={() => dispatch({ type: 'OPEN_TAMER', npcId: npc.id })}>
                  펫 훈련
                </Button>
              )}

              {lastLine && isElder && (
                <Button variant="default" size="sm" onClick={() => dispatch({ type: 'REST' })}>
                  휴식하기 (파티 전원 회복)
                </Button>
              )}

              {lastLine && isJobTrainer &&
                (canJobChange ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      dispatch({ type: 'JOB_CHANGE' })
                      close()
                    }}
                  >
                    {eligible.name}(으)로 전직
                  </Button>
                ) : (
                  <span className="self-center text-[11px] text-muted-foreground">
                    현재 {currentTier.name} · 다음 전직 Lv.
                    {JOB_TIERS.find((t) => t.order === currentTier.order + 1)?.minLevel ?? '-'}
                  </span>
                ))}

              <Button variant="ghost" size="sm" onClick={close}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
