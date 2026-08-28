'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { npcById } from '@/lib/mock-data'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { JOB_TIERS, jobTierForLevel } from '@/lib/constants'

const ROLE_LABEL: Record<string, string> = {
  jobTrainer: '전직 담당관',
  weaponMerchant: '무기 상인',
  potionMerchant: '물약 상인',
  toolMerchant: '도구 상인',
  petTamer: '펫 조련사',
  housing: '마을 촌장',
  arenaMaster: '투기장장',
  guard: '경비대장',
  flavor: '주민',
}

export function DialogueScreen() {
  const { state, dispatch } = useGame()
  const npc = state.activeNpcId ? npcById(state.activeNpcId) : null
  const [lineIdx, setLineIdx] = useState(0)

  if (!npc) return null

  const close = () => {
    setLineIdx(0)
    dispatch({ type: 'CLOSE_OVERLAY' })
  }

  const isShopkeeper = ['weaponMerchant', 'potionMerchant', 'toolMerchant'].includes(npc.role)
  const isTamer = npc.role === 'petTamer'
  const isJobTrainer = npc.role === 'jobTrainer'
  const eligible = jobTierForLevel(state.player.level)
  const canJobChange = isJobTrainer && eligible.id !== state.player.jobTierId
  const currentTier = JOB_TIERS.find((t) => t.id === state.player.jobTierId)!
  const lastLine = lineIdx >= npc.greeting.length - 1

  return (
    <Modal open onClose={close} title={`${npc.name} · ${ROLE_LABEL[npc.role]}`}>
      <div className="flex gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-black/30">
          <Image src={npc.icon} alt={npc.name} width={34} height={34} />
        </div>
        <div className="panel-parchment flex-1 p-3 text-sm leading-relaxed">{npc.greeting[lineIdx]}</div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!lastLine && (
          <Button variant="outline" onClick={() => setLineIdx((i) => Math.min(npc.greeting.length - 1, i + 1))}>
            다음
          </Button>
        )}

        {lastLine && (isShopkeeper || isTamer) && (
          <Button
            variant="default"
            onClick={() => dispatch({ type: 'OPEN_SHOP', npcId: npc.id })}
          >
            {isTamer ? '먹이 상점' : '상점 열기'}
          </Button>
        )}

        {lastLine && isTamer && (
          <Button variant="default" onClick={() => dispatch({ type: 'OPEN_TAMER', npcId: npc.id })}>
            펫 훈련
          </Button>
        )}

        {lastLine && isJobTrainer && (
          <>
            {canJobChange ? (
              <Button variant="default" onClick={() => { dispatch({ type: 'JOB_CHANGE' }); close() }}>
                {eligible.name}(으)로 전직하기
              </Button>
            ) : (
              <span className="self-center text-xs text-muted-foreground">
                현재 {currentTier.name} · 다음 전직은 Lv.{JOB_TIERS.find((t) => t.order === currentTier.order + 1)?.minLevel ?? '-'}부터
              </span>
            )}
          </>
        )}

        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
