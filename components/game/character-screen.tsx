'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { HeroPortrait } from '@/components/game/portrait'
import { ELEMENT_META, JOB_TIERS, jobTitle } from '@/lib/constants'
import { itemById, SKILLS } from '@/lib/mock-data'
import { getEffectiveStats } from '@/lib/derived'
import { expProgressPercent, expRequiredForLevel, MAX_LEVEL } from '@/lib/exp-table'
import type { EquipSlot } from '@/lib/types'

const STAT_LABELS: Record<string, string> = {
  maxHp: 'HP',
  maxMp: 'MP',
  atk: '공격력',
  def: '방어력',
  matk: '마법공격력',
  mdef: '마법방어력',
  spd: '속도',
  luck: '행운',
}

const SLOT_LABELS: Record<EquipSlot, string> = { weapon: '무기', armor: '방어구', accessory: '장신구' }

export function CharacterScreen() {
  const { state, dispatch } = useGame()
  if (state.screen !== 'character') return null
  const close = () => dispatch({ type: 'SET_SCREEN', screen: 'world' })

  const { player } = state
  const elem = ELEMENT_META[player.element]
  const jobTier = JOB_TIERS.find((t) => t.id === player.jobTierId)!
  const jobName = jobTitle(player.element, jobTier.order)
  const effStats = getEffectiveStats(player)
  const learnedSkills = SKILLS.filter((s) => player.learnedSkills.includes(s.id))

  return (
    <Modal open onClose={close} title="내 정보" widthClass="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div
            className="h-32 w-24 overflow-hidden rounded-lg border-2"
            style={{ borderColor: elem.color as string, background: 'rgba(0,0,0,0.3)' }}
          >
            <HeroPortrait element={player.element} gender={player.gender} className="h-full w-full" />
          </div>
          <div className="text-center">
            <div className="font-display text-lg text-gold-soft">{player.name}</div>
            <div className="text-xs text-muted-foreground">
              Lv.{player.level} · {jobName} · {elem.line}
            </div>
          </div>
          <div className="w-full space-y-1">
            <Progress value={(player.hp / effStats.maxHp) * 100} barClassName="bg-hp" label={`HP ${player.hp}/${effStats.maxHp}`} />
            <Progress value={(player.mp / effStats.maxMp) * 100} barClassName="bg-mp" label={`MP ${player.mp}/${effStats.maxMp}`} />
            <Progress value={expProgressPercent(player.level, player.exp)} barClassName="bg-exp" className="h-2" />
            <div className="text-center text-[10px] text-muted-foreground">
              {player.level >= MAX_LEVEL ? '최대 레벨' : `다음 레벨까지 ${(expRequiredForLevel(player.level) - player.exp).toLocaleString()} EXP`}
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-1.5 pt-1">
            {(['weapon', 'armor', 'accessory'] as EquipSlot[]).map((slot) => {
              const itemId = player.equipped[slot]
              const item = itemId ? itemById(itemId) : null
              return (
                <button
                  key={slot}
                  onClick={() => item && dispatch({ type: 'UNEQUIP_ITEM', slot })}
                  className="panel-parchment flex aspect-square flex-col items-center justify-center gap-0.5 p-1"
                  title={item ? `${item.name} (클릭하여 해제)` : SLOT_LABELS[slot]}
                >
                  {item ? <Image src={item.icon} alt={item.name} width={22} height={22} /> : <span className="text-[9px] opacity-50">{SLOT_LABELS[slot]}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="mb-1.5 font-display text-sm text-gold-soft">스탯</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((key) => (
                <div key={key} className="flex justify-between border-b border-border/40 py-0.5">
                  <span className="opacity-70">{STAT_LABELS[key]}</span>
                  <span className="font-semibold">{(effStats as any)[key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 font-display text-sm text-gold-soft">습득 스킬 ({jobName})</h3>
            <div className="flex flex-wrap gap-1.5">
              {learnedSkills.length === 0 && <span className="text-xs opacity-50">습득한 스킬이 없습니다.</span>}
              {learnedSkills.map((s) => (
                <Badge key={s.id} title={s.description}>
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 font-display text-sm text-gold-soft">전직 단계</h3>
            <div className="flex flex-wrap gap-1">
              {JOB_TIERS.map((t) => (
                <Badge key={t.id} className={t.id === player.jobTierId ? 'border-gold bg-primary-soft text-gold' : 'opacity-40'}>
                  {t.shortName} Lv.{t.minLevel}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
