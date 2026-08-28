'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { currentActor } from '@/lib/battle-engine'
import { SKILLS, itemById } from '@/lib/mock-data'
import type { BattleAction, Combatant, Skill } from '@/lib/types'
import { Backpack, Footprints, Shield, Sword, Wand2 } from 'lucide-react'

type Pending =
  | { kind: 'attack' }
  | { kind: 'skill'; skill: Skill }
  | { kind: 'item'; itemId: string; needsTarget: boolean }
  | null

export function BattleScreen() {
  const { state, dispatch } = useGame()
  const battle = state.battle
  const [menu, setMenu] = useState<'root' | 'skill' | 'item'>('root')
  const [pending, setPending] = useState<Pending>(null)

  const actor = battle ? currentActor(battle) : null
  const isHeroTurn = actor?.kind === 'hero'

  // ATB 진행 — 히어로 입력 대기 중이 아니면 리듀서가 계속 자동 진행
  useEffect(() => {
    if (!battle || battle.isOver) return
    const delay = state.settings.battleAnimSpeed === 2 ? 220 : 460
    const timer = setInterval(() => dispatch({ type: 'BATTLE_TICK' }), delay)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.isOver, state.settings.battleAnimSpeed])

  useEffect(() => {
    setMenu('root')
    setPending(null)
  }, [battle?.activeUid])

  if (!battle) return null

  const enemies = battle.combatants.filter((c) => c.side === 'enemy')
  const players = battle.combatants.filter((c) => c.side === 'player')

  function submit(action: BattleAction) {
    if (!actor) return
    dispatch({ type: 'BATTLE_ACTOR_ACTION', actorUid: actor.uid, action })
    setPending(null)
    setMenu('root')
  }

  function handleTargetClick(target: Combatant) {
    if (!pending) return
    if (pending.kind === 'attack') {
      if (target.side !== 'enemy' || !target.alive) return
      submit({ type: 'attack', targetUid: target.uid })
    } else if (pending.kind === 'skill') {
      const t = pending.skill.targeting
      if (t === 'singleEnemy' && (target.side !== 'enemy' || !target.alive)) return
      if (t === 'singleAlly' && target.side !== 'player') return
      submit({ type: 'skill', skillId: pending.skill.id, targetUid: target.uid })
    } else if (pending.kind === 'item') {
      submit({ type: 'item', itemId: pending.itemId, targetUid: target.uid })
    }
  }

  const availableSkills = actor ? SKILLS.filter((s) => actor.skills.includes(s.id)) : []
  const availableItems = state.inventory
    .map((slot) => ({ slot, item: itemById(slot.itemId) }))
    .filter((x) => x.item && (x.item.type === 'potion' || x.item.type === 'tool'))

  const targetableSide =
    pending?.kind === 'attack'
      ? 'enemy'
      : pending?.kind === 'skill'
        ? pending.skill.targeting === 'singleEnemy'
          ? 'enemy'
          : pending.skill.targeting === 'singleAlly'
            ? 'player'
            : null
        : pending?.kind === 'item' && pending.needsTarget
          ? 'player'
          : null

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-[#151a3c] to-[#0a0d20]">
      <div className="flex flex-1 items-center justify-center gap-6 px-6 pt-8">
        {enemies.map((c) => (
          <CombatantCard key={c.uid} c={c} highlight={actor?.uid === c.uid} targetable={targetableSide === 'enemy' && c.alive} onClick={() => handleTargetClick(c)} />
        ))}
      </div>

      <div className="panel-gilded mx-3 mb-2 h-20 overflow-y-auto scrollbar-thin p-2 text-xs leading-relaxed">
        {battle.log.slice(-6).map((l) => (
          <div
            key={l.id}
            className={
              l.kind === 'damage'
                ? 'text-red-300'
                : l.kind === 'heal'
                  ? 'text-emerald-300'
                  : l.kind === 'status'
                    ? 'text-violet-300'
                    : l.kind === 'system'
                      ? 'text-gold-soft'
                      : 'text-foreground/80'
            }
          >
            {l.text}
          </div>
        ))}
      </div>

      <div className="flex items-end justify-center gap-6 px-6 pb-2">
        {players.map((c) => (
          <CombatantCard key={c.uid} c={c} highlight={actor?.uid === c.uid} targetable={targetableSide === 'player' && c.alive} onClick={() => handleTargetClick(c)} showMp />
        ))}
      </div>

      <div className="panel-gilded mx-3 mb-3 min-h-24 p-2.5">
        {battle.isOver ? (
          <BattleResult />
        ) : !isHeroTurn ? (
          <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
            {actor ? `${actor.name}의 턴...` : '대기 게이지 충전 중...'}
          </div>
        ) : pending ? (
          <div className="flex h-16 flex-col items-center justify-center gap-1 text-center text-xs">
            <span className="text-gold-soft">대상을 선택하세요</span>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              취소
            </Button>
          </div>
        ) : menu === 'root' ? (
          <div className="grid grid-cols-5 gap-1.5">
            <ActionBtn icon={<Sword className="size-4" />} label="공격" onClick={() => setPending({ kind: 'attack' })} />
            <ActionBtn icon={<Wand2 className="size-4" />} label="스킬" onClick={() => setMenu('skill')} />
            <ActionBtn icon={<Backpack className="size-4" />} label="물약/도구" onClick={() => setMenu('item')} />
            <ActionBtn icon={<Shield className="size-4" />} label="방어" onClick={() => submit({ type: 'defend' })} />
            <ActionBtn icon={<Footprints className="size-4" />} label="도망" onClick={() => submit({ type: 'flee' })} />
          </div>
        ) : menu === 'skill' ? (
          <div className="flex flex-wrap gap-1.5">
            {availableSkills.length === 0 && <span className="text-xs opacity-60">사용 가능한 스킬이 없습니다.</span>}
            {availableSkills.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="outline"
                disabled={!actor || actor.mp < s.mpCost}
                title={s.description}
                onClick={() => {
                  if (s.targeting === 'allEnemies' || s.targeting === 'allAllies' || s.targeting === 'self') {
                    submit({ type: 'skill', skillId: s.id, targetUid: actor!.uid })
                  } else {
                    setPending({ kind: 'skill', skill: s })
                  }
                }}
              >
                {s.name} ({s.mpCost}MP)
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setMenu('root')}>
              뒤로
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableItems.length === 0 && <span className="text-xs opacity-60">보유한 물약/도구가 없습니다.</span>}
            {availableItems.map(({ slot, item }) => (
              <Button
                key={slot.itemId}
                size="sm"
                variant="outline"
                title={item!.description}
                onClick={() => {
                  if (item!.useEffect?.reviveOnly) {
                    setPending({ kind: 'item', itemId: slot.itemId, needsTarget: true })
                  } else {
                    submit({ type: 'item', itemId: slot.itemId, targetUid: actor!.uid })
                  }
                }}
              >
                {item!.name} x{slot.qty}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setMenu('root')}>
              뒤로
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="gilded" onClick={onClick} className="flex h-16 flex-col gap-1">
      {icon}
      <span className="text-[11px]">{label}</span>
    </Button>
  )
}

function CombatantCard({
  c,
  highlight,
  targetable,
  onClick,
  showMp,
}: {
  c: Combatant
  highlight: boolean
  targetable: boolean
  onClick: () => void
  showMp?: boolean
}) {
  const statuses = c.effects.filter((e) => e.kind === 'status')
  const buffs = c.effects.filter((e) => e.kind === 'buff')
  return (
    <button
      onClick={targetable ? onClick : undefined}
      className={`flex w-24 flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${
        targetable ? 'cursor-pointer ring-2 ring-red-400/70 hover:brightness-125' : ''
      } ${highlight ? 'panel-gilded' : ''} ${!c.alive ? 'opacity-30 grayscale' : ''}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full border-2 border-gold/60 bg-black/40">
        <Image src={c.icon} alt={c.name} width={26} height={26} />
      </div>
      <span className="truncate text-[11px] font-semibold">{c.name}</span>
      <Progress value={(c.hp / Math.max(1, c.stats.maxHp)) * 100} barClassName="bg-hp" className="h-1.5 w-full" />
      {showMp && <Progress value={(c.mp / Math.max(1, c.stats.maxMp)) * 100} barClassName="bg-mp" className="h-1.5 w-full" />}
      <Progress value={Math.min(100, c.atb)} barClassName="bg-exp" className="h-1 w-full" />
      {(statuses.length > 0 || buffs.length > 0) && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {statuses.map((e) => (
            <span key={e.key} className="rounded bg-violet-900/70 px-1 text-[8px] text-violet-200">
              {e.name}
            </span>
          ))}
          {buffs.map((e) => (
            <span key={e.key} className="rounded bg-emerald-900/70 px-1 text-[8px] text-emerald-200">
              {e.name}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function BattleResult() {
  const { state, dispatch } = useGame()
  const battle = state.battle
  if (!battle) return null
  return (
    <div className="flex h-16 flex-col items-center justify-center gap-1">
      <span className={`font-display text-sm ${battle.victory ? 'text-gold-soft' : 'text-red-300'}`}>
        {battle.victory ? `승리! EXP +${battle.rewardExp} · Gold +${battle.rewardGold}` : '전투 패배...'}
      </span>
      <Button size="sm" onClick={() => dispatch({ type: 'BATTLE_END_CONTINUE' })}>
        계속하기
      </Button>
    </div>
  )
}
