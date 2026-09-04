'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/lib/game-state'
import { Button } from '@/components/ui/button'
import { currentActor } from '@/lib/battle-engine'
import { SKILLS, itemById } from '@/lib/mock-data'
import { HeroSprite } from '@/components/game/pixel-hero'
import { CreatureSprite, spriteIdFromRefId } from '@/components/game/creature-sprite'
import { MAPS } from '@/lib/maps'
import type { BattleAction, Combatant, Skill } from '@/lib/types'

// 숲 전투 배경 위에 뿌릴 반딧불 — variant(방황 경로)·위치·속도를 미리 고정해 자연스럽게 흩뿌린다
const FOREST_FIREFLIES: { variant: 'a' | 'b' | 'c'; left: string; top: string; delay: string }[] = [
  { variant: 'a', left: '18%', top: '58%', delay: '0s' },
  { variant: 'b', left: '32%', top: '42%', delay: '1.4s' },
  { variant: 'c', left: '48%', top: '66%', delay: '0.6s' },
  { variant: 'a', left: '63%', top: '48%', delay: '2.2s' },
  { variant: 'b', left: '76%', top: '62%', delay: '0.9s' },
  { variant: 'c', left: '55%', top: '30%', delay: '1.8s' },
]

// ============================================================================
// 전투 화면 — 저장된 예시(클래식 JRPG 배틀 구도) 참고:
//  · 초원 필드 + 원경 산맥
//  · 아군은 앞(좌하), 적은 뒤(우상)에 배치, 4등신 스프라이트로 대치
//  · 하단: 행동 순서 타임라인(TU 숫자) + 우측 액션 링
//  · 상단: 자동 / x2 / 도망
//  · 움직임은 주인공 캐릭터만 (공격 시 앞으로 돌진 후 복귀)
// ============================================================================

type Pending =
  | { kind: 'attack' }
  | { kind: 'skill'; skill: Skill }
  | { kind: 'item'; itemId: string; needsTarget: boolean }
  | null

// 대략적인 TU(다음 행동까지 남은 시간 단위) 추정 — 표시용
function tuUntil(c: Combatant): number {
  const gain = Math.max(0.5, (c.stats.spd / 20) * 8)
  return Math.max(0, Math.round((100 - Math.min(100, c.atb)) / gain))
}

export function BattleScreen() {
  const { state, dispatch } = useGame()
  const battle = state.battle
  const [menu, setMenu] = useState<'root' | 'skill' | 'item'>('root')
  const [pending, setPending] = useState<Pending>(null)
  const [heroAnim, setHeroAnim] = useState<'idle' | 'lunge' | 'hit'>('idle')
  const [auto, setAuto] = useState(false)
  const autoRef = useRef(false)

  const actor = battle ? currentActor(battle) : null
  const isHeroTurn = actor?.kind === 'hero'
  const speed = state.settings.battleAnimSpeed

  // 행동 순서(TU) 자동 진행
  useEffect(() => {
    if (!battle || battle.isOver) return
    const delay = speed === 2 ? 200 : 430
    const timer = setInterval(() => dispatch({ type: 'BATTLE_TICK' }), delay)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.isOver, speed])

  useEffect(() => {
    setMenu('root')
    setPending(null)
  }, [battle?.activeUid])

  // 자동 전투: 히어로 턴이면 기본 공격 자동 실행
  useEffect(() => {
    autoRef.current = auto
    if (!auto || !battle || battle.isOver || !isHeroTurn || !actor) return
    const enemies = battle.combatants.filter((c) => c.side === 'enemy' && c.alive)
    if (enemies.length === 0) return
    const t = setTimeout(() => {
      dispatch({ type: 'BATTLE_ACTOR_ACTION', actorUid: actor.uid, action: { type: 'attack', targetUid: enemies[0].uid } })
      triggerLunge()
    }, speed === 2 ? 260 : 520)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, battle?.activeUid, isHeroTurn])

  function triggerLunge() {
    setHeroAnim('lunge')
    setTimeout(() => setHeroAnim('idle'), speed === 2 ? 260 : 460)
  }

  if (!battle) return null

  const isForestBattle = MAPS[state.currentMapId]?.bg === 'forest'
  const enemies = battle.combatants.filter((c) => c.side === 'enemy')
  const players = battle.combatants.filter((c) => c.side === 'player')
  const hero = players.find((c) => c.kind === 'hero')

  function submit(action: BattleAction) {
    if (!actor) return
    if (action.type === 'attack' || action.type === 'skill') triggerLunge()
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

  // 타임라인: 살아있는 전투원을 TU 오름차순으로
  const order = battle.combatants
    .filter((c) => c.alive)
    .map((c) => ({ c, tu: c.uid === battle.activeUid ? -1 : tuUntil(c) }))
    .sort((a, b) => a.tu - b.tu)
    .slice(0, 8)

  return (
    <div className={`battle-field relative flex h-full w-full flex-col overflow-hidden ${isForestBattle ? 'battle-field-forest-edge' : ''}`}>
      {/* ── 상단 바 ── */}
      <div className="relative z-20 flex items-center justify-center gap-2 px-3 pt-2">
        <button
          onClick={() => setAuto((a) => !a)}
          className={`rounded-full border px-3 py-1 text-xs font-display ${auto ? 'border-gold bg-gold/25 text-gold-soft' : 'border-white/30 bg-black/40 text-white/80'}`}
        >
          자동 {auto ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { battleAnimSpeed: speed === 2 ? 1 : 2 } })}
          className={`rounded-full border px-3 py-1 text-xs font-display ${speed === 2 ? 'border-gold bg-gold/25 text-gold-soft' : 'border-white/30 bg-black/40 text-white/80'}`}
        >
          x{speed}
        </button>
        <button
          onClick={() => actor && isHeroTurn && submit({ type: 'flee' })}
          disabled={!isHeroTurn}
          className="rounded-full border border-white/30 bg-black/40 px-3 py-1 text-xs font-display text-white/80 disabled:opacity-40"
        >
          도망
        </button>
      </div>

      {/* ── 전장 ── */}
      <div className={`relative z-10 flex-1 overflow-hidden ${isForestBattle ? 'battle-field-forest-bg' : ''}`}>
        {isForestBattle && (
          <>
            {/* 살랑이는 나무 그림자 */}
            <div className="battle-forest-shadow" aria-hidden />
            {/* 은은하게 돌아다니는 반짝임 */}
            <div className="battle-fireflies" aria-hidden>
              {FOREST_FIREFLIES.map((f, i) => (
                <span
                  key={i}
                  className={`battle-firefly battle-firefly-${f.variant}`}
                  style={{ left: f.left, top: f.top, animationDelay: `${f.delay}, ${f.delay}` }}
                />
              ))}
            </div>
          </>
        )}
        {/* 적: 뒤(우상) */}
        {enemies.map((c, i) => (
          <CombatantSprite
            key={c.uid}
            c={c}
            side="enemy"
            index={i}
            count={enemies.length}
            active={actor?.uid === c.uid}
            targetable={targetableSide === 'enemy' && c.alive}
            onClick={() => handleTargetClick(c)}
          />
        ))}
        {/* 아군: 앞(좌하) */}
        {players.map((c, i) => (
          <CombatantSprite
            key={c.uid}
            c={c}
            side="player"
            index={i}
            count={players.length}
            active={actor?.uid === c.uid}
            targetable={targetableSide === 'player' && c.alive}
            onClick={() => handleTargetClick(c)}
            heroGender={c.kind === 'hero' ? state.player.gender : undefined}
            heroElement={c.kind === 'hero' ? state.player.element : undefined}
            heroAnim={c.kind === 'hero' ? heroAnim : undefined}
          />
        ))}
      </div>

      {/* ── 로그 스트립 ── */}
      <div className="relative z-20 mx-3 mb-1 max-h-12 overflow-y-auto rounded bg-black/45 px-2 py-1 text-[11px] leading-tight scrollbar-thin">
        {battle.log.slice(-3).map((l) => (
          <div
            key={l.id}
            className={
              l.kind === 'damage' ? 'text-red-300'
              : l.kind === 'heal' ? 'text-emerald-300'
              : l.kind === 'status' ? 'text-violet-300'
              : l.kind === 'system' ? 'text-gold-soft'
              : 'text-white/80'
            }
          >
            {l.text}
          </div>
        ))}
      </div>

      {/* ── 하단: 타임라인 + 액션 ── */}
      <div className="relative z-20 flex items-end gap-2 px-3 pb-3">
        {/* 타임라인 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[10px] font-display text-white/60">행동 순서 (TU)</span>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
            {order.map(({ c, tu }, i) => (
              <div
                key={c.uid}
                className={`flex shrink-0 flex-col items-center rounded-md border px-1 py-0.5 ${
                  i === 0 ? 'border-gold bg-gold/20' : c.side === 'player' ? 'border-sky-400/50 bg-sky-950/50' : 'border-red-400/50 bg-red-950/50'
                }`}
              >
                <div className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-black/40">
                  {c.kind === 'hero' ? (
                    <HeroSprite element={state.player.element} gender={state.player.gender} dir="down" px={26} />
                  ) : (
                    <Image src={c.icon} alt={c.name} width={16} height={16} />
                  )}
                </div>
                <span className={`mt-0.5 text-[9px] font-bold ${i === 0 ? 'text-gold-soft' : 'text-white/70'}`}>
                  {tu < 0 ? 'NOW' : `TU ${tu}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 패널 (링 스타일) */}
        <div className="w-[46%] max-w-[340px] shrink-0 rounded-xl border-2 border-gold/60 bg-[#141024]/92 p-2">
          {battle.isOver ? (
            <BattleResult />
          ) : !isHeroTurn ? (
            <div className="flex h-16 items-center justify-center text-xs text-white/60">
              {actor ? `${actor.name}의 턴...` : '행동 순서 대기 중...'}
            </div>
          ) : pending ? (
            <div className="flex h-16 flex-col items-center justify-center gap-1 text-center text-xs">
              <span className="text-gold-soft">대상을 선택하세요</span>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>취소</Button>
            </div>
          ) : menu === 'root' ? (
            <div className="grid grid-cols-2 gap-1.5">
              <RingBtn label="공격" hint="기본 공격" onClick={() => setPending({ kind: 'attack' })} />
              <RingBtn label="스킬" hint={`${availableSkills.length}개`} onClick={() => setMenu('skill')} />
              <RingBtn label="물약·도구" hint={`${availableItems.length}개`} onClick={() => setMenu('item')} />
              <RingBtn label="방어" hint="피해 감소" onClick={() => submit({ type: 'defend' })} />
            </div>
          ) : menu === 'skill' ? (
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto scrollbar-thin">
              {availableSkills.length === 0 && <span className="text-xs opacity-60">사용 가능한 스킬이 없습니다.</span>}
              {availableSkills.map((s) => (
                <button
                  key={s.id}
                  disabled={!actor || actor.mp < s.mpCost}
                  title={s.description}
                  onClick={() => {
                    if (s.targeting === 'allEnemies' || s.targeting === 'allAllies' || s.targeting === 'self') {
                      submit({ type: 'skill', skillId: s.id, targetUid: actor!.uid })
                    } else {
                      setPending({ kind: 'skill', skill: s })
                    }
                  }}
                  className="rounded-md border border-gold/40 bg-black/40 px-2 py-1 text-[11px] text-white/90 disabled:opacity-40"
                >
                  {s.name} <span className="text-mp/90 text-[10px]">{s.mpCost}MP</span>
                </button>
              ))}
              <button onClick={() => setMenu('root')} className="rounded-md px-2 py-1 text-[11px] text-white/60">뒤로</button>
            </div>
          ) : (
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto scrollbar-thin">
              {availableItems.length === 0 && <span className="text-xs opacity-60">보유한 물약/도구가 없습니다.</span>}
              {availableItems.map(({ slot, item }) => (
                <button
                  key={slot.itemId}
                  title={item!.description}
                  onClick={() => {
                    if (item!.useEffect?.reviveOnly) setPending({ kind: 'item', itemId: slot.itemId, needsTarget: true })
                    else submit({ type: 'item', itemId: slot.itemId, targetUid: actor!.uid })
                  }}
                  className="rounded-md border border-gold/40 bg-black/40 px-2 py-1 text-[11px] text-white/90"
                >
                  {item!.name} ×{slot.qty}
                </button>
              ))}
              <button onClick={() => setMenu('root')} className="rounded-md px-2 py-1 text-[11px] text-white/60">뒤로</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RingBtn({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 flex-col items-center justify-center rounded-lg border border-gold/60 bg-gradient-to-b from-[#2a2350] to-[#1a1636] text-gold-soft transition-all hover:brightness-125 active:translate-y-px"
    >
      <span className="font-display text-[13px] leading-none">{label}</span>
      {hint && <span className="mt-0.5 text-[9px] text-white/50">{hint}</span>}
    </button>
  )
}

function CombatantSprite({
  c,
  side,
  index,
  count,
  active,
  targetable,
  onClick,
  heroGender,
  heroElement,
  heroAnim,
}: {
  c: Combatant
  side: 'player' | 'enemy'
  index: number
  count: number
  active: boolean
  targetable: boolean
  onClick: () => void
  heroGender?: 'male' | 'female'
  heroElement?: 'fire' | 'ice' | 'earth'
  heroAnim?: 'idle' | 'lunge' | 'hit'
}) {
  // 필드 배치: 중앙에서 대치 — 아군은 좌중앙(근경, 크게), 적은 우중앙(원경, 약간 작게)
  const spread = count > 1 ? index / (count - 1) - 0.5 : 0
  const left = side === 'enemy' ? 68 + spread * 22 : 32 + spread * 24
  const top = side === 'enemy'
    ? 42 + Math.abs(spread) * 12 + (index % 2) * 7
    : 58 + Math.abs(spread) * 8 + (index % 2) * 8
  const scale = side === 'enemy' ? 0.95 : 1.12

  const statuses = c.effects.filter((e) => e.kind === 'status')
  const buffs = c.effects.filter((e) => e.kind === 'buff')
  const hpPct = (c.hp / Math.max(1, c.stats.maxHp)) * 100

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-50%) scale(${scale})`, zIndex: Math.round(top) }}
    >
      <button
        onClick={targetable ? onClick : undefined}
        className={`relative flex flex-col items-center ${targetable ? 'cursor-pointer' : 'cursor-default'} ${!c.alive ? 'opacity-25 grayscale' : ''}`}
      >
        {/* 상태 아이콘 + HP */}
        <div className="mb-0.5 flex flex-col items-center gap-0.5">
          {(statuses.length > 0 || buffs.length > 0) && (
            <div className="flex flex-wrap justify-center gap-0.5">
              {statuses.map((e) => (
                <span key={e.key} className="rounded bg-violet-900/80 px-1 text-[7px] text-violet-100">{e.name}</span>
              ))}
              {buffs.map((e) => (
                <span key={e.key} className="rounded bg-emerald-900/80 px-1 text-[7px] text-emerald-100">{e.name}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-bold ${side === 'player' ? 'text-sky-200' : 'text-red-200'} text-shadow-ink`}>
              {c.name}
            </span>
          </div>
          <div className="h-1.5 w-14 overflow-hidden rounded-full border border-black/50 bg-black/50">
            <div className="h-full bg-hp transition-all duration-300" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        {/* 스프라이트 */}
        <div
          className={`${active ? 'battle-active' : ''} ${
            heroAnim === 'lunge' ? (side === 'player' ? 'hero-lunge-right' : 'hero-lunge-left') : ''
          }`}
        >
          {c.kind === 'hero' && heroElement && heroGender ? (
            <HeroSprite
              element={heroElement}
              gender={heroGender}
              dir="right"
              walking={heroAnim === 'lunge'}
              px={150}
              className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.55)]"
            />
          ) : (
            <CreatureSprite
              spriteId={spriteIdFromRefId(c.refId)}
              fallbackSrc={c.icon}
              dir="right"
              flip={side === 'enemy'}
              walking={active && c.alive}
              px={116}
              className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.55)]"
            />
          )}
        </div>

        {/* TU 뱃지 */}
        {c.alive && (
          <span className="mt-0.5 rounded-full bg-black/55 px-1.5 text-[8px] font-bold text-white/80">
            {active ? 'NOW' : `TU ${tuUntil(c)}`}
          </span>
        )}
        {targetable && <span className="absolute -top-2 text-xs text-red-400">▼</span>}
      </button>
    </div>
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
      <Button size="sm" onClick={() => dispatch({ type: 'BATTLE_END_CONTINUE' })}>계속하기</Button>
    </div>
  )
}
