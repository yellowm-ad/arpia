'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGame } from '@/lib/game-state'
import { ELEMENT_META, GRID_CELLS, ZONES, zoneAt } from '@/lib/constants'
import { MONSTERS, NPCS } from '@/lib/mock-data'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MessageCircle } from 'lucide-react'

const TILE = 64
const MOVE_SPEED = 2.1 // 초당 이동 셀 수

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
                'linear-gradient(rgba(217,164,65,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(217,164,65,0.15) 1px, transparent 1px)',
              backgroundSize: `${TILE}px ${TILE}px`,
              backgroundColor: '#12163a',
              boxShadow: '0 0 0 4px rgba(217,164,65,0.4)',
            }}
          />

          {/* 구역 타일 */}
          {ZONES.map((zone) => (
            <div key={zone.id}>
              <div
                className="absolute flex items-start justify-start p-2"
                style={{
                  left: zone.cell.x0 * TILE,
                  top: zone.cell.y0 * TILE,
                  width: (zone.cell.x1 - zone.cell.x0) * TILE,
                  height: (zone.cell.y1 - zone.cell.y0) * TILE,
                  background: `${zone.color}33`,
                  border: `2px solid ${zone.color}aa`,
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
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex size-8 items-center justify-center rounded-full border-2 border-gold bg-primary-soft shadow-lg">
                  <Image src={npc.icon} alt={npc.name} width={18} height={18} />
                </div>
                <span className="rounded bg-black/70 px-1 text-[10px] text-gold-soft whitespace-nowrap">{npc.name}</span>
              </div>
            </Marker>
          ))}

          {/* 필드 몬스터 마커 */}
          {visibleMonsters.map((fm) => {
            const def = MONSTERS.find((m) => m.id === fm.monsterId)
            if (!def) return null
            return (
              <Marker key={fm.uid} x={fm.homeCell.x} y={fm.homeCell.y} tile={TILE} wanderSeed={fm.wanderSeed}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex size-7 items-center justify-center rounded-full border-2 ${def.isTestMonster ? 'border-emerald-400 bg-emerald-950' : 'border-red-400/70 bg-red-950/70'}`}
                  >
                    <Image src={def.icon} alt={def.name} width={16} height={16} />
                  </div>
                  {def.isTestMonster && <span className="rounded bg-emerald-900/80 px-1 text-[9px] text-emerald-200">TEST</span>}
                </div>
              </Marker>
            )
          })}

          {/* 플레이어 */}
          <Marker x={state.position.x} y={state.position.y} tile={TILE}>
            <div className="flex flex-col items-center">
              <div
                className="flex size-9 items-center justify-center rounded-full border-2 shadow-xl"
                style={{ borderColor: elem.color as string, background: '#1a1435' }}
              >
                <Image src={elem.icon} alt={elem.name} width={20} height={20} />
              </div>
              <span className="mt-0.5 rounded bg-black/70 px-1 text-[10px] text-white">{state.player.name}</span>
            </div>
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
      {interactTarget && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
          <div className="panel-gilded flex items-center gap-2 px-3 py-1.5 text-xs text-gold-soft">
            <MessageCircle className="size-3.5" /> {interactTarget.name}와(과) 대화 (E)
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
      <div
        className={onClick ? 'cursor-pointer' : ''}
        style={{ transform: 'rotateX(-55deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}
        onClick={onClick}
      >
        {children}
      </div>
    </div>
  )
}

function BillboardLabel({ x, y, tile, children }: { x: number; y: number; tile: number; children: ReactNode }) {
  return (
    <div className="absolute" style={{ left: x * tile, top: y * tile, transformStyle: 'preserve-3d' }}>
      <div style={{ transform: 'rotateX(-55deg) rotateZ(-45deg)' }}>{children}</div>
    </div>
  )
}
