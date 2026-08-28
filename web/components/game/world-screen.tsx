'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGame } from '@/lib/game-state'
import { ELEMENT_META, GRID_CELLS, ZONES, zoneAt } from '@/lib/constants'
import { MONSTERS, NPCS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MessageCircle } from 'lucide-react'

const TILE = 64
const MOVE_SPEED = 2.1 // 초당 이동 셀 수

// 구역별 기본 배경 (원작·나무위키 삽화 미사용 — 전부 CSS 그라디언트로 자체 제작)
function zoneBg(kind: string): string {
  switch (kind) {
    case 'school': // 마법학교 — 자수정 석조 + 창문 격자
      return 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 26px), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 30px), linear-gradient(160deg, #3a3a78, #232152)'
    case 'forest': // 숲 — 층층 나뭇잎 캐노피
      return 'radial-gradient(circle at 20% 25%, rgba(120,190,110,0.35) 0 14px, transparent 15px), radial-gradient(circle at 70% 60%, rgba(90,160,90,0.3) 0 20px, transparent 22px), radial-gradient(circle at 45% 85%, rgba(140,200,120,0.25) 0 16px, transparent 18px), linear-gradient(180deg, #2f6b3a, #1c4726)'
    case 'sea': // 바다 — 물결 줄무늬
      return 'repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0 3px, transparent 3px 18px), linear-gradient(180deg, #2f86c0, #16466e)'
    case 'colosseum': // 콜로세움 — 모래 + 원형 경기장
      return 'radial-gradient(circle at 50% 50%, transparent 0 40%, rgba(0,0,0,0.18) 41% 43%, transparent 44%), radial-gradient(circle at 50% 50%, rgba(255,220,160,0.18), transparent 70%), linear-gradient(160deg, #c98a4a, #7a4a26)'
    case 'shopStreet': // 상점가 — 차양 줄무늬
      return 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 10px, rgba(0,0,0,0.05) 10px 20px), linear-gradient(160deg, #d9a441, #8a5a1e)'
    case 'village': // 기숙사 마을 — 잔디 + 길
      return 'linear-gradient(90deg, transparent 44%, rgba(200,170,120,0.35) 45% 55%, transparent 56%), radial-gradient(circle at 30% 40%, rgba(120,190,110,0.25) 0 12px, transparent 14px), linear-gradient(180deg, #6fae5d, #3f7a38)'
    case 'military': // 연구동 — 강철 격자
      return 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 16px), linear-gradient(160deg, #8a8f9c, #4a4f5c)'
    case 'ruins': // 아즈카의 폐허 — 균열
      return 'repeating-linear-gradient(70deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 22px), repeating-linear-gradient(200deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 30px), linear-gradient(160deg, #4a3a5c, #221a30)'
    default:
      return 'linear-gradient(180deg, #1a1f45, #12163a)'
  }
}

export function WorldScreen() {
  const { state, dispatch } = useGame()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ w: 960, h: 640 })
  const pressedKeys = useRef<Set<string>>(new Set())
  const lastTime = useRef<number | null>(null)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      pressedKeys.current.add(e.key.toLowerCase())
      if (e.key.toLowerCase() === 'e') tryInteract()
    }
    const up = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.position, state.screen])

  useEffect(() => {
    let raf = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (state.screen !== 'world') {
        lastTime.current = t
        return
      }
      if (lastTime.current == null) lastTime.current = t
      const dt = Math.min(0.06, (t - lastTime.current) / 1000)
      lastTime.current = t

      const keys = pressedKeys.current
      let dx = 0
      let dy = 0
      if (keys.has('arrowup') || keys.has('w')) dy -= 1
      if (keys.has('arrowdown') || keys.has('s')) dy += 1
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1
      if (keys.has('arrowright') || keys.has('d')) dx += 1
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1
        dispatch({ type: 'MOVE', dx: (dx / len) * MOVE_SPEED * dt, dy: (dy / len) * MOVE_SPEED * dt })
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen])

  function tryInteract() {
    const near = nearestNpc()
    if (near) dispatch({ type: 'OPEN_NPC', npcId: near.id })
  }

  function nearestNpc() {
    let best: (typeof NPCS)[number] | null = null
    let bestDist = 1.2
    for (const npc of NPCS) {
      const d = Math.hypot(npc.cell.x - state.position.x, npc.cell.y - state.position.y)
      if (d < bestDist) {
        bestDist = d
        best = npc
      }
    }
    return best
  }

  const camX = viewportSize.w / 2 - state.position.x * TILE
  const camY = viewportSize.h / 2 - state.position.y * TILE

  const visibleMonsters = useMemo(() => {
    return state.fieldMonsters.filter((fm) => {
      const d = Math.hypot(fm.homeCell.x - state.position.x, fm.homeCell.y - state.position.y)
      return d < 6.5
    })
  }, [state.fieldMonsters, state.position.x, state.position.y])

  const currentZone = zoneAt(state.position.x, state.position.y)
  const interactTarget = nearestNpc()
  const elem = ELEMENT_META[state.player.element]
  const encounterName = state.pendingEncounterUid
    ? MONSTERS.find(
        (m) => m.id === state.fieldMonsters.find((f) => f.uid === state.pendingEncounterUid)?.monsterId,
      )?.name
    : null

  const dpadPress = (dx: number, dy: number) => {
    const key = dx === -1 ? 'arrowleft' : dx === 1 ? 'arrowright' : dy === -1 ? 'arrowup' : 'arrowdown'
    pressedKeys.current.add(key)
  }
  const dpadRelease = (dx: number, dy: number) => {
    const key = dx === -1 ? 'arrowleft' : dx === 1 ? 'arrowright' : dy === -1 ? 'arrowup' : 'arrowdown'
    pressedKeys.current.delete(key)
  }

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden bg-[#080a1a]" style={{ perspective: 1500 }}>
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate3d(${viewportSize.w / 2}px, ${viewportSize.h * 0.32}px, 0) rotateX(55deg) rotateZ(45deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute"
          style={{
            transform: `translate3d(${camX - viewportSize.w / 2}px, ${camY - viewportSize.h * 0.32}px, 0)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 바닥 그리드 */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: GRID_CELLS * TILE,
              height: GRID_CELLS * TILE,
              backgroundImage:
                'linear-gradient(rgba(217,164,65,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(217,164,65,0.10) 1px, transparent 1px)',
              backgroundSize: `${TILE}px ${TILE}px`,
              backgroundColor: '#0e1230',
              boxShadow: '0 0 0 4px rgba(217,164,65,0.4), inset 0 0 120px rgba(0,0,0,0.55)',
            }}
          />

          {/* 구역 타일 */}
          {ZONES.map((zone) => (
            <div key={zone.id}>
              <div
                className="absolute"
                style={{
                  left: zone.cell.x0 * TILE,
                  top: zone.cell.y0 * TILE,
                  width: (zone.cell.x1 - zone.cell.x0) * TILE,
                  height: (zone.cell.y1 - zone.cell.y0) * TILE,
                  background: zoneBg(zone.kind),
                  border: `2px solid ${zone.color}cc`,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.35)',
                }}
              />
              <BillboardLabel x={zone.cell.x0 + 0.15} y={zone.cell.y0 + 0.15} tile={TILE}>
                <span className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-display text-gold-soft text-shadow-ink whitespace-nowrap">
                  {zone.name}
                </span>
              </BillboardLabel>
            </div>
          ))}

          {/* NPC 마커 */}
          {NPCS.map((npc) => (
            <Marker key={npc.id} x={npc.cell.x} y={npc.cell.y} tile={TILE} onClick={() => dispatch({ type: 'OPEN_NPC', npcId: npc.id })}>
              <div className="flex size-8 items-center justify-center rounded-full border-2 border-gold bg-primary-soft">
                <Image src={npc.icon} alt={npc.name} width={18} height={18} />
              </div>
              <span className="text-[10px] font-semibold text-gold-soft whitespace-nowrap">{npc.name}</span>
            </Marker>
          ))}

          {/* 필드 몬스터 마커 */}
          {visibleMonsters.map((fm) => {
            const def = MONSTERS.find((m) => m.id === fm.monsterId)
            if (!def) return null
            return (
              <Marker key={fm.uid} x={fm.homeCell.x} y={fm.homeCell.y} tile={TILE} wanderSeed={fm.wanderSeed}>
                <div
                  className={`flex size-7 items-center justify-center rounded-full border-2 ${def.isTestMonster ? 'border-emerald-400 bg-emerald-950' : 'border-red-400/80 bg-red-950/80'}`}
                >
                  <Image src={def.icon} alt={def.name} width={16} height={16} />
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${def.isTestMonster ? 'text-emerald-200' : 'text-red-200'}`}>
                  {def.isTestMonster ? 'TEST' : def.name}
                </span>
              </Marker>
            )
          })}

          {/* 플레이어 */}
          <Marker x={state.position.x} y={state.position.y} tile={TILE}>
            <div
              className="flex size-9 items-center justify-center rounded-full border-2"
              style={{ borderColor: elem.color as string, background: '#1a1435' }}
            >
              <Image src={elem.icon} alt={elem.name} width={20} height={20} />
            </div>
            <span className="text-[10px] font-semibold text-white whitespace-nowrap">{state.player.name}</span>
          </Marker>
        </div>
      </div>

      {/* 상단 좌측 구역 안내 */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20">
        <div className="panel-gilded px-3 py-1.5 text-xs text-gold-soft">
          현재 위치: <span className="font-display">{currentZone?.name ?? '광야'}</span>
        </div>
      </div>

      {/* 상호작용 프롬프트 */}
      {interactTarget && !state.pendingEncounterUid && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
          <div className="panel-gilded flex items-center gap-2 px-3 py-1.5 text-xs text-gold-soft">
            <MessageCircle className="size-3.5" /> {interactTarget.name}와(과) 대화 (E)
          </div>
        </div>
      )}

      {/* 몬스터 접촉 — 전투 여부 확인 */}
      {state.pendingEncounterUid && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="panel-gilded flex flex-col items-center gap-3 px-6 py-5 text-center">
            <div className="font-display text-sm text-gold-soft text-shadow-ink">
              {encounterName ?? '몬스터'}와(과) 마주쳤다!
            </div>
            <div className="text-xs text-muted-foreground">전투를 시작할까?</div>
            <div className="flex gap-2">
              <Button variant="default" onClick={() => dispatch({ type: 'ENCOUNTER_FIGHT' })}>
                전투하기
              </Button>
              <Button variant="outline" onClick={() => dispatch({ type: 'ENCOUNTER_FLEE' })}>
                피하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일용 D-Pad */}
      <div className="absolute bottom-4 right-4 z-20 grid grid-cols-3 grid-rows-3 gap-1 select-none sm:hidden">
        <div />
        <DpadBtn icon={<ArrowUp className="size-4" />} onDown={() => dpadPress(0, -1)} onUp={() => dpadRelease(0, -1)} />
        <div />
        <DpadBtn icon={<ArrowLeft className="size-4" />} onDown={() => dpadPress(-1, 0)} onUp={() => dpadRelease(-1, 0)} />
        <button
          className="panel-gilded flex size-10 items-center justify-center text-[10px] text-gold-soft"
          onClick={tryInteract}
        >
          talk
        </button>
        <DpadBtn icon={<ArrowRight className="size-4" />} onDown={() => dpadPress(1, 0)} onUp={() => dpadRelease(1, 0)} />
        <div />
        <DpadBtn icon={<ArrowDown className="size-4" />} onDown={() => dpadPress(0, 1)} onUp={() => dpadRelease(0, 1)} />
        <div />
      </div>
    </div>
  )
}

function DpadBtn({ icon, onDown, onUp }: { icon: ReactNode; onDown: () => void; onUp: () => void }) {
  return (
    <button
      className="panel-gilded flex size-10 items-center justify-center text-gold-soft active:brightness-125"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      {icon}
    </button>
  )
}

function Marker({
  x,
  y,
  tile,
  children,
  onClick,
  wanderSeed,
}: {
  x: number
  y: number
  tile: number
  children: ReactNode
  onClick?: () => void
  wanderSeed?: number
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x * tile,
        top: y * tile,
        transformStyle: 'preserve-3d',
        animation: wanderSeed != null ? `wander-${wanderSeed % 4} 3.4s ease-in-out infinite` : undefined,
        animationDelay: wanderSeed != null ? `${(wanderSeed % 1000) / 1000}s` : undefined,
      }}
    >
      {/* 쿼터뷰 정면을 향하는 레이어. 콘텐츠를 화면상 위로 띄우고 지면과 기둥으로 연결 */}
      <div style={{ transform: 'rotateX(-55deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}>
        {/* 지면 그림자 */}
        <div
          style={{
            position: 'absolute',
            left: -9,
            top: -4,
            width: 18,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            filter: 'blur(1.5px)',
          }}
        />
        {/* 기둥 */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: -40,
            width: 2,
            height: 40,
            background: 'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          }}
        />
        {/* 떠 있는 콘텐츠 (다크 플레이트) */}
        <div
          className={onClick ? 'cursor-pointer' : ''}
          onClick={onClick}
          style={{ position: 'absolute', left: 0, top: -40, transform: 'translate(-50%, -100%)' }}
        >
          <div className="flex flex-col items-center gap-0.5 rounded-lg border border-gold/60 bg-[#0d0b18]/90 px-1.5 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function BillboardLabel({ x, y, tile, children }: { x: number; y: number; tile: number; children: ReactNode }) {
  return (
    <div className="absolute" style={{ left: x * tile, top: y * tile, transformStyle: 'preserve-3d' }}>
      <div style={{ transform: 'rotateX(-55deg) rotateZ(-45deg) translateY(-14px)' }}>{children}</div>
    </div>
  )
}
