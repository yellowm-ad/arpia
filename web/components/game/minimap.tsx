'use client'

import { useMemo } from 'react'
import { useGame } from '@/lib/game-state'
import { MAPS } from '@/lib/maps'
import { ELEMENT_META } from '@/lib/constants'
import { MONSTERS } from '@/lib/mock-data'

const MAX = 148

export function Minimap() {
  const { state } = useGame()

  const nearMonsters = useMemo(
    () =>
      state.fieldMonsters.filter((fm) => {
        const d = Math.hypot(fm.homeCell.x - state.position.x, fm.homeCell.y - state.position.y)
        return d < 9
      }),
    [state.fieldMonsters, state.position.x, state.position.y],
  )

  if (state.screen !== 'world') return null

  const map = MAPS[state.currentMapId]
  const aspect = map.grid.w / map.grid.h
  let w = MAX
  let h = MAX / aspect
  if (h > MAX) {
    h = MAX
    w = MAX * aspect
  }

  const fx = (cx: number) => (cx / map.grid.w) * w
  const fy = (cy: number) => (cy / map.grid.h) * h

  const elem = ELEMENT_META[state.player.element]
  const gateShown = new Set<string>()

  return (
    <div className="pointer-events-none absolute right-2 top-[4.5rem] z-30 sm:right-3 sm:top-24">
      <div className="panel-gilded flex flex-col gap-1 p-1.5">
        <div className="px-0.5 text-center font-display text-[10px] text-gold-soft text-shadow-ink">
          {map.name}
        </div>
        <div
          className="relative overflow-hidden rounded border border-gold/40 bg-[#0b0e22]"
          style={{ width: w, height: h }}
        >
          {/* 구역 블록 */}
          {map.zones.map((z) => (
            <div
              key={z.id}
              className="absolute"
              style={{
                left: fx(z.cell.x0),
                top: fy(z.cell.y0),
                width: fx(z.cell.x1) - fx(z.cell.x0),
                height: fy(z.cell.y1) - fy(z.cell.y0),
                background: `${z.color}44`,
                border: `1px solid ${z.color}aa`,
              }}
            />
          ))}

          {/* 포탈 */}
          {map.portals.map((p) => {
            if (p.kind === 'gate') {
              if (gateShown.has(`${p.cell.x},${p.cell.y}`)) return null
              gateShown.add(`${p.cell.x},${p.cell.y}`)
            }
            const color = p.kind === 'gate' ? '#f0c040' : p.kind === 'exit' ? '#7fd0f0' : '#e879f9'
            return (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px]"
                style={{ left: fx(p.cell.x), top: fy(p.cell.y), width: 5, height: 5, background: color }}
              />
            )
          })}

          {/* 몬스터 */}
          {nearMonsters.map((fm) => {
            const isTest = MONSTERS.find((m) => m.id === fm.monsterId)?.isTestMonster
            return (
              <div
                key={fm.uid}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: fx(fm.homeCell.x),
                  top: fy(fm.homeCell.y),
                  width: 3,
                  height: 3,
                  background: isTest ? '#34d399' : '#f87171',
                }}
              />
            )
          })}

          {/* 플레이어 */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
            style={{
              left: fx(state.position.x),
              top: fy(state.position.y),
              width: 7,
              height: 7,
              background: elem.color as string,
            }}
          />
        </div>
      </div>
    </div>
  )
}
