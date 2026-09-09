'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import { useGame } from '@/lib/game-state'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ELEMENT_META, JOB_TIERS, jobTierForLevel } from '@/lib/constants'
import { petDefById, petStatsForLevel } from '@/lib/pets'
import { expProgressPercent, expRequiredForLevel, MAX_LEVEL } from '@/lib/exp-table'
import { Backpack, Settings, Sparkles, User, Users } from 'lucide-react'

export function Hud() {
  const { state, dispatch } = useGame()
  const { player, pet } = state
  const petDef = petDefById(pet.defId)!
  const petMaxHp = petStatsForLevel(petDef, pet.level).maxHp
  const elem = ELEMENT_META[player.element]
  const jobTier = JOB_TIERS.find((t) => t.id === player.jobTierId)!
  const eligible = jobTierForLevel(player.level)
  const canJobChange = eligible.id !== player.jobTierId

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-3">
      {/* 좌측: 캐릭터 정보 패널 */}
      <div className="panel-glass pointer-events-auto flex w-72 flex-col gap-2 p-3 sm:w-80">
        <div className="flex items-center gap-2.5">
          <div
            className="portrait-ring flex size-14 shrink-0 items-center justify-center"
            style={{ ['--ring-col' as string]: elem.color as string, ['--ring-glow' as string]: `${elem.color}88` }}
          >
            <Image src={elem.icon} alt={elem.name} width={30} height={30} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-base text-gold-soft text-shadow-ink">{player.name}</span>
              <Badge>Lv.{player.level}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {jobTier.name} · {elem.line}
              {canJobChange && player.level < MAX_LEVEL ? (
                <span className="ml-1 text-gold-soft">· 전직 가능!</span>
              ) : null}
            </div>
          </div>
        </div>

        <Progress
          value={(player.hp / player.stats.maxHp) * 100}
          barClassName="bar-hp-fill"
          className="bar-thick"
          label={`HP ${player.hp}/${player.stats.maxHp}`}
        />
        <Progress
          value={(player.mp / player.stats.maxMp) * 100}
          barClassName="bar-mp-fill"
          className="bar-thick"
          label={`MP ${player.mp}/${player.stats.maxMp}`}
        />
        <Progress
          value={expProgressPercent(player.level, player.exp)}
          barClassName="bar-exp-fill"
          className="h-2"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>EXP {player.level >= MAX_LEVEL ? 'MAX' : `${player.exp.toLocaleString()} / ${expRequiredForLevel(player.level).toLocaleString()}`}</span>
          <span className="text-gold-soft">{player.gold.toLocaleString()} G</span>
        </div>
      </div>

      {/* 펫 미니 패널 */}
      <div className="panel-glass pointer-events-auto hidden w-60 flex-col gap-2 p-3 sm:flex">
        <div className="flex items-center gap-2.5">
          <div className="portrait-ring flex size-11 shrink-0 items-center justify-center">
            <Image src={petDef.icon} alt={pet.nickname} width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm text-gold-soft">{pet.nickname}</div>
            <div className="text-[11px] text-muted-foreground">{petDef.species} · 애정도 {pet.affection}%</div>
          </div>
        </div>
        <Progress value={(pet.hp / Math.max(1, petMaxHp)) * 100} barClassName="bar-hp-fill" className="bar-thick" />
      </div>

      {/* 우측 메뉴 버튼 */}
      <div className="pointer-events-auto flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <MenuButton icon={<Backpack className="size-5" />} label="가방" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'inventory' })} />
          <MenuButton icon={<User className="size-5" />} label="정보" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'character' })} />
          <MenuButton icon={<Users className="size-5" />} label="파티" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'party' })} />
          <MenuButton icon={<Settings className="size-5" />} label="설정" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'settings' })} />
        </div>
        {state.settings.testMode && (
          <div className="panel-gilded flex items-center gap-1 self-end px-2 py-1 text-[10px] text-gold-soft">
            <Sparkles className="size-3" /> 테스트 모드 ON
          </div>
        )}
      </div>
    </div>
  )
}

function MenuButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="gilded" size="icon" onClick={onClick} title={label} aria-label={label} className="size-12 flex-col gap-0">
      {icon}
    </Button>
  )
}
