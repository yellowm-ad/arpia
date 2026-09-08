'use client'

import type { BattleFx, ElementOrNeutral } from '@/lib/types'

// ============================================================================
// 스킬 모션(VFX) — 참고: 데스크톱 "스킬 모션.png" 연출 가이드(시전준비→발동→대상이동→임팩트→상태효과).
// 67개 스킬/물약/도구 전부를 낱개로 손그림 애니메이션화하는 대신, element × archetype 로 조합되는
// 소수의 재사용 가능한 절차적 연출(투사체·버스트·디버프 안개·힐 광휘·버프 링)을 만들어 전체를 커버한다.
// 매 행동마다 lib/battle-engine.ts 의 resolveAction() 이 새 fxId 로 BattleFx 를 발급 → 이 컴포넌트가
// fxId 를 React key 로 써서 매번 새로 마운트되며 CSS 애니메이션을 재생하고, 끝나면 그대로 사라진다.
// ============================================================================

const FX_COLORS: Record<ElementOrNeutral, { a: string; b: string }> = {
  fire: { a: '#ff7a3c', b: '#ffd580' },
  ice: { a: '#7fd0f5', b: '#e6faff' },
  earth: { a: '#c99a52', b: '#8a6a35' },
  neutral: { a: '#f0e6c0', b: '#ffffff' },
}

export interface FxPos {
  left: number
  top: number
}

export function SkillFxLayer({
  fx,
  posOf,
}: {
  fx: BattleFx | undefined
  posOf: (uid: string) => FxPos | undefined
}) {
  if (!fx) return null
  const col = FX_COLORS[fx.element]
  const sourcePos = posOf(fx.sourceUid)
  const targetPositions = fx.targetUids.map((uid) => posOf(uid)).filter((p): p is FxPos => !!p)
  const scale = 0.85 + Math.min(1.4, fx.power) * 0.35

  return (
    <div key={fx.fxId} className="pointer-events-none absolute inset-0 z-30" aria-hidden>
      {/* 시전자 캐스트 펄스 — 모든 갈래 공통 */}
      {sourcePos && <CastPulse pos={sourcePos} color={col.a} />}

      {fx.archetype === 'magicAttack' &&
        targetPositions.map((tp, i) => (
          <MagicBolt key={i} from={sourcePos} to={tp} color={col} aoe={fx.aoe} scale={scale} delay={i * 60} />
        ))}

      {fx.archetype === 'attack' &&
        targetPositions.map((tp, i) => <SlashImpact key={i} pos={tp} scale={scale} delay={i * 50} />)}

      {fx.archetype === 'debuff' &&
        targetPositions.map((tp, i) => <DebuffCloud key={i} pos={tp} color={col} scale={scale} delay={i * 70} />)}

      {fx.archetype === 'heal' &&
        targetPositions.map((tp, i) => <HealGlow key={i} pos={tp} delay={i * 60} />)}

      {fx.archetype === 'buff' &&
        targetPositions.map((tp, i) => <BuffRing key={i} pos={tp} color={col} delay={i * 60} />)}

      {fx.archetype === 'utility' && targetPositions.map((tp, i) => <UtilityPulse key={i} pos={tp} />)}

      {fx.archetype === 'item' && targetPositions.map((tp, i) => <ItemSparkle key={i} pos={tp} />)}

      {/* 전체 대상(aoe) 강한 스킬 — 화면 전체를 살짝 물들이는 플래시 */}
      {fx.aoe && fx.power >= 2 && (
        <div
          className="fx-screen-flash absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 45%, ${col.a}55, transparent 68%)` }}
        />
      )}
    </div>
  )
}

function CastPulse({ pos, color }: { pos: FxPos; color: string }) {
  return (
    <div
      className="fx-cast-pulse absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, borderColor: color }}
    />
  )
}

function MagicBolt({
  from,
  to,
  color,
  aoe,
  scale,
  delay,
}: {
  from: FxPos | undefined
  to: FxPos
  color: { a: string; b: string }
  aoe: boolean
  scale: number
  delay: number
}) {
  return (
    <>
      {from && !aoe && (
        <div
          className="fx-bolt-travel absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ['--fx-x0' as any]: `${from.left}%`,
            ['--fx-y0' as any]: `${from.top}%`,
            ['--fx-x1' as any]: `${to.left}%`,
            ['--fx-y1' as any]: `${to.top}%`,
            left: `${from.left}%`,
            top: `${from.top}%`,
            background: `radial-gradient(circle, ${color.b}, ${color.a})`,
            boxShadow: `0 0 12px 4px ${color.a}aa`,
            animationDelay: `${delay}ms`,
          }}
        />
      )}
      <div
        className="fx-burst absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${to.left}%`,
          top: `${to.top}%`,
          width: `${44 * scale}px`,
          height: `${44 * scale}px`,
          background: `radial-gradient(circle, ${color.b}ee, ${color.a}88 55%, transparent 75%)`,
          animationDelay: `${(aoe ? 0 : 280) + delay}ms`,
        }}
      />
    </>
  )
}

function SlashImpact({ pos, scale, delay }: { pos: FxPos; scale: number; delay: number }) {
  return (
    <div
      className="fx-slash absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, width: `${52 * scale}px`, height: `${52 * scale}px`, animationDelay: `${delay}ms` }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d="M12 78 L82 22" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path d="M24 88 L90 34" stroke="#ffe9c0" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  )
}

function DebuffCloud({ pos, color, scale, delay }: { pos: FxPos; color: { a: string; b: string }; scale: number; delay: number }) {
  return (
    <div
      className="fx-debuff absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${40 * scale}px`,
        height: `${40 * scale}px`,
        background: `radial-gradient(circle, ${color.a}cc, transparent 70%)`,
        animationDelay: `${delay}ms`,
      }}
    />
  )
}

function HealGlow({ pos, delay }: { pos: FxPos; delay: number }) {
  return (
    <div
      className="fx-heal absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, animationDelay: `${delay}ms` }}
    />
  )
}

function BuffRing({ pos, color, delay }: { pos: FxPos; color: { a: string; b: string }; delay: number }) {
  return (
    <div
      className="fx-buff-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, borderColor: color.b, boxShadow: `0 0 14px 2px ${color.a}aa`, animationDelay: `${delay}ms` }}
    />
  )
}

function UtilityPulse({ pos }: { pos: FxPos }) {
  return <div className="fx-utility absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos.left}%`, top: `${pos.top}%` }} />
}

function ItemSparkle({ pos }: { pos: FxPos }) {
  return <div className="fx-item absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos.left}%`, top: `${pos.top}%` }} />
}
