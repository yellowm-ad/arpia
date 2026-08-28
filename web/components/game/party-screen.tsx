'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ELEMENT_META, JOB_TIERS, MAX_PARTY_SIZE } from '@/lib/constants'
import { AFFECTION_TIER_META, affectionTier, petDefById, petStatsForLevel } from '@/lib/pets'
import { Lock } from 'lucide-react'

export function PartyScreen() {
  const { state, dispatch } = useGame()
  if (state.screen !== 'party') return null
  const close = () => dispatch({ type: 'SET_SCREEN', screen: 'world' })

  const { player, pet } = state
  const elem = ELEMENT_META[player.element]
  const jobTier = JOB_TIERS.find((t) => t.id === player.jobTierId)!
  const petDef = petDefById(pet.defId)!
  const petMaxHp = petStatsForLevel(petDef, pet.level).maxHp
  const petTierMeta = AFFECTION_TIER_META[affectionTier(pet.affection)]
  const lockedCount = MAX_PARTY_SIZE - 2

  return (
    <Modal open onClose={close} title={`파티 (2/${MAX_PARTY_SIZE})`} widthClass="max-w-2xl">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="panel-parchment flex flex-col items-center gap-1.5 p-2.5">
          <div
            className="flex size-12 items-center justify-center rounded-full border-2"
            style={{ borderColor: elem.color as string }}
          >
            <Image src={elem.icon} alt="" width={26} height={26} />
          </div>
          <div className="text-center text-xs font-semibold">{player.name}</div>
          <div className="text-[10px] opacity-70">
            Lv.{player.level} · {jobTier.shortName}
          </div>
          <Progress value={(player.hp / player.stats.maxHp) * 100} barClassName="bg-hp" className="h-1.5 w-full" />
        </div>

        <div className="panel-parchment flex flex-col items-center gap-1.5 p-2.5">
          <div className="flex size-12 items-center justify-center rounded-full border-2 border-gold/60">
            <Image src={petDef.icon} alt="" width={26} height={26} />
          </div>
          <div className="text-center text-xs font-semibold">{pet.nickname}</div>
          <div className="text-[10px] opacity-70">
            {petDef.species} · Lv.{pet.level} · 애정도 {pet.affection}% ({petTierMeta.label})
          </div>
          <Progress value={(pet.hp / Math.max(1, petMaxHp)) * 100} barClassName="bg-hp" className="h-1.5 w-full" />
        </div>

        {Array.from({ length: lockedCount }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-2.5 opacity-50">
            <Lock className="size-6" />
            <div className="text-center text-[10px]">추후 합류 예정</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        파티는 최대 {MAX_PARTY_SIZE}인까지 구성됩니다. 현재는 주인공과 펫만 전투에 참여하며, 나머지 슬롯은 추후 합류
        가능한 동료 캐릭터를 위해 예약되어 있습니다.
      </p>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
