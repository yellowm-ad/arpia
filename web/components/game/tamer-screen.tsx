'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { skillById, itemById } from '@/lib/mock-data'
import { AFFECTION_TIER_META, affectionTier, canTrain, petDefById, petStatsForLevel } from '@/lib/pets'
import { Coins } from 'lucide-react'

export function TamerScreen() {
  const { state, dispatch } = useGame()
  if (state.screen !== 'tamer') return null
  const close = () => dispatch({ type: 'CLOSE_OVERLAY' })

  const { pet, player } = state
  const def = petDefById(pet.defId)!
  const maxHp = petStatsForLevel(def, pet.level).maxHp
  const tierMeta = AFFECTION_TIER_META[affectionTier(pet.affection)]
  const hasItem = (id: string) => state.inventory.some((s) => s.itemId === id)

  return (
    <Modal open onClose={close} title="조련사 리코의 훈련소" widthClass="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-12 items-center justify-center rounded-full border-2 border-gold/60 bg-black/30">
            <Image src={def.icon} alt={pet.nickname} width={28} height={28} />
          </div>
          <div>
            <div className="text-sm font-semibold">
              {pet.nickname} <span className="opacity-60">({def.species})</span>
            </div>
            <div className="text-[11px] opacity-70">
              Lv.{pet.level} · 애정도 {pet.affection}% · {tierMeta.label} — {tierMeta.note}
            </div>
          </div>
        </div>
        <Badge className="text-sm">
          <Coins className="size-3.5" /> {player.gold.toLocaleString()} G
        </Badge>
      </div>

      <Progress value={pet.affection} barClassName="bg-exp" className="mb-4 h-2" />

      <div className="mb-3">
        <h3 className="mb-1.5 font-display text-sm text-gold-soft">보유 스킬</h3>
        <div className="flex flex-wrap gap-1.5">
          {pet.learnedSkills.map((id) => {
            const s = skillById(id)
            return s ? (
              <Badge key={id} title={s.description}>
                {s.name}
              </Badge>
            ) : null
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 font-display text-sm text-gold-soft">훈련 가능한 스킬</h3>
        <div className="flex flex-col gap-2">
          {def.trainableSkills.map((t) => {
            const s = skillById(t.skillId)
            if (!s) return null
            const check = canTrain(pet, t.skillId, player.gold, hasItem)
            const learned = pet.learnedSkills.includes(t.skillId)
            return (
              <div key={t.skillId} className="panel-parchment flex items-center gap-2.5 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="truncate text-[11px] opacity-70">{s.description}</div>
                  <div className="text-[10px] opacity-60">
                    요구 Lv.{t.minLevel} · {t.costGold}G
                    {t.costItemId ? ` · ${itemById(t.costItemId)?.name ?? '훈련서'}` : ''}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={learned || !check.ok}
                  title={learned ? '이미 배움' : check.reason}
                  onClick={() => dispatch({ type: 'PET_TRAIN', skillId: t.skillId })}
                >
                  {learned ? '습득함' : '훈련'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        먹이를 주면 호감도가 오릅니다(가방 &gt; 먹이). 호감도가 높을수록 펫의 전투 능력치와 지원 공격 확률이 올라갑니다.
      </p>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
