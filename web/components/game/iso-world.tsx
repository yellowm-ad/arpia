'use client'

import { useMemo, type Dispatch } from 'react'
import type { Action } from '@/lib/game-state'
import type { GameState } from '@/lib/types'
import { MAPS } from '@/lib/maps'
import { ELEMENT_META } from '@/lib/constants'
import { NPCS } from '@/lib/mock-data'
import { ISO_TILE_W, ISO_TILE_H, isoToScreen, isoBounds, TILE_COLORS, TILE_SPRITES } from '@/lib/iso'
import type { TileKind, PropDef } from '@/lib/iso'
import { renderProp, IsoChara } from '@/components/game/iso-sprites'

const SCALE = 1.4
const PAD_TOP = 240 // 키 큰 건물이 앵커 위로 솟는 여유
const PAD_BOTTOM = 60
const HW = ISO_TILE_W / 2
const HH = ISO_TILE_H / 2

// 프롭 종류별 대략 높이 (지면 그림자 계산용)
const H_BY_KIND: Record<string, number> = {
  hall: 72, dome: 60, cottage: 30, shop: 44, tower: 40, barn: 26, windmill: 46, gate: 56, wall: 22,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** 라스터(PNG) 프롭 — 발밑 앵커를 원점(0,0)에 맞춰 배치. assets:'raster' 맵에서만 사용 */
function RasterProp({ p }: { p: PropDef }) {
  const w = p.px?.w
  const h = p.px?.h
  // 앵커 미지정 시 이미지 하단-중앙을 발밑으로 가정
  const ax = p.anchor?.x ?? (w ? w / 2 : 0)
  const ay = p.anchor?.y ?? (h ?? 0)
  return (
    <image
      href={p.sprite}
      x={-ax}
      y={-ay}
      width={w}
      height={h}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

const NPC_ROLE_COLOR: Record<string, { robe: string; shade: string; hair: string }> = {
  jobTrainer: { robe: '#6b53c0', shade: '#48376f', hair: '#d8d2e8' },
  weaponMerchant: { robe: '#a85a2c', shade: '#6f3a1c', hair: '#3a2a1c' },
  potionMerchant: { robe: '#3f9f7a', shade: '#2b6a52', hair: '#5a3a2a' },
  toolMerchant: { robe: '#c9922f', shade: '#8a6320', hair: '#3a2f1c' },
  petTamer: { robe: '#7fae4d', shade: '#557634', hair: '#2f2a1a' },
  housing: { robe: '#8a8f9c', shade: '#5c606b', hair: '#d8d8e0' },
  arenaMaster: { robe: '#b64430', shade: '#7c2c1f', hair: '#2a1a12' },
  guard: { robe: '#5b6bd6', shade: '#3c489a', hair: '#2a2a30' },
  templePriest: { robe: '#e6dcc0', shade: '#b7a980', hair: '#dcd6c4' },
  saint: { robe: '#f2ede0', shade: '#cfc7b2', hair: '#e8d9b8' },
  farmer: { robe: '#8a6a3a', shade: '#5e4726', hair: '#3a2a18' },
  flavor: { robe: '#7a7f8c', shade: '#53585f', hair: '#3a3a44' },
}
const ELEM_SPRITE: Record<string, { robe: string; shade: string; hair: string; accent: string }> = {
  fire: { robe: '#b5462f', shade: '#7f2e20', hair: '#efe4d2', accent: '#e8641f' },
  ice: { robe: '#3f7fa6', shade: '#2b566f', hair: '#dfeef6', accent: '#6fc3e6' },
  earth: { robe: '#6d7a3e', shade: '#4b5528', hair: '#e6ddc4', accent: '#caa246' },
}

export function IsoWorld({
  state,
  dispatch,
  viewportSize,
  moving,
  interactId,
}: {
  state: GameState
  dispatch: Dispatch<Action>
  viewportSize: { w: number; h: number }
  moving: boolean
  interactId: string | null
}) {
  const map = MAPS[state.currentMapId]
  const { w: VW, h: VH } = map.grid
  const bounds = useMemo(() => isoBounds(VW, VH), [VW, VH])
  const originX = -bounds.minSx
  const originY = PAD_TOP
  const worldW = bounds.width
  const worldH = bounds.height + PAD_TOP + PAD_BOTTOM

  // 지면 (정적 — 메모)
  const ground = useMemo(() => {
    const tiles: React.ReactNode[] = []
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        const kind: TileKind = map.tileAt ? map.tileAt(x + 0.5, y + 0.5) : 'grass'
        const a = isoToScreen(x, y)
        const sprite = map.assets === 'raster' ? TILE_SPRITES[kind] : undefined
        if (sprite) {
          // 다이메트릭 타일 PNG: 상단 꼭짓점(a)에 맞춰 배치
          tiles.push(
            <image
              key={`${x}-${y}`}
              href={sprite}
              x={a.sx - ISO_TILE_W / 2}
              y={a.sy}
              width={ISO_TILE_W}
              height={ISO_TILE_H * 2}
              style={{ imageRendering: 'pixelated' }}
            />,
          )
          continue
        }
        const col = TILE_COLORS[kind]
        const b = isoToScreen(x + 1, y)
        const c = isoToScreen(x + 1, y + 1)
        const d = isoToScreen(x, y + 1)
        tiles.push(
          <polygon
            key={`${x}-${y}`}
            points={`${a.sx},${a.sy} ${b.sx},${b.sy} ${c.sx},${c.sy} ${d.sx},${d.sy}`}
            fill={col.top}
            stroke={col.edge}
            strokeWidth={0.6}
          />,
        )
      }
    }
    return tiles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, VW, VH])

  // 건물 지면 그림자 (정적 — 메모)
  const castShadows = useMemo(() => {
    const out: React.ReactNode[] = []
    for (const p of map.props ?? []) {
      if (p.sprite) continue // 라스터 스프라이트는 그림자를 자체 포함
      const H = H_BY_KIND[p.kind]
      if (!H || !p.size) continue
      const { w, d } = p.size
      const s = isoToScreen(p.cell.x, p.cell.y)
      const A = [0, 0]
      const B = [w * HW, w * HH]
      const Dp = [-d * HW, d * HH]
      const Cp = [w * HW - d * HW, w * HH + d * HH]
      const ox = H * 0.55
      const oy = H * 0.3
      const off = (pt: number[]) => [pt[0] + ox, pt[1] + oy]
      const pts = [A, B, off(B), off(Cp), off(Dp), Dp].map((pt) => pt.join(',')).join(' ')
      out.push(<polygon key={p.id} transform={`translate(${s.sx},${s.sy})`} points={pts} fill="rgba(58,42,22,0.16)" />)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // 정적 오브젝트(건물·나무·NPC·포탈) — 깊이정렬 목록
  const staticEntities = useMemo(() => {
    const list: { sortY: number; node: React.ReactNode }[] = []

    const raster = map.assets === 'raster'
    for (const p of map.props ?? []) {
      // 원형 구조물(콜로세움·분수)은 앵커가 중심이라 half 가산 없이 정렬
      const half = p.radial ? 0 : ((p.size?.w ?? 0.4) + (p.size?.d ?? 0.4)) / 2
      const s = isoToScreen(p.cell.x, p.cell.y)
      list.push({
        sortY: p.cell.x + p.cell.y + half,
        node: (
          <g key={p.id} transform={`translate(${s.sx},${s.sy})`}>
            {raster && p.sprite ? <RasterProp p={p} /> : renderProp(p)}
          </g>
        ),
      })
    }

    const npcs = NPCS.filter((n) => map.zones.some((z) => z.id === n.zoneId))
    for (const npc of npcs) {
      const s = isoToScreen(npc.cell.x, npc.cell.y)
      const c = NPC_ROLE_COLOR[npc.role] ?? NPC_ROLE_COLOR.flavor
      list.push({
        sortY: npc.cell.x + npc.cell.y + 0.2,
        node: (
          <g
            key={npc.id}
            transform={`translate(${s.sx},${s.sy})`}
            style={{ cursor: 'pointer' }}
            onClick={() => dispatch({ type: 'OPEN_NPC', npcId: npc.id })}
          >
            <g transform="scale(0.92)">
              <IsoChara robe={c.robe} shade={c.shade} hair={c.hair} />
            </g>
            <g transform="translate(0,-58)">
              <rect x={-npc.name.length * 5 - 5} y={-9} width={npc.name.length * 10 + 10} height={14} rx={3} fill={interactId === npc.id ? '#e0b050' : 'rgba(10,8,16,0.68)'} />
              <text x={0} y={2} textAnchor="middle" fontSize={10} fontWeight={700} fill={interactId === npc.id ? '#000' : '#e8dcc0'}>
                {npc.name}
              </text>
            </g>
            <circle cx={0} cy={-52} r={2.2} fill={interactId === npc.id ? '#e8dcc0' : '#ffffffaa'} />
          </g>
        ),
      })
    }

    // 포탈: gate(같은 셀 중복) 1개 + 타일 포탈
    const seen = new Set<string>()
    for (const p of map.portals) {
      if (p.kind === 'gate') {
        const k = `${p.cell.x},${p.cell.y}`
        if (seen.has(k)) continue
        seen.add(k)
      }
      const s = isoToScreen(p.cell.x, p.cell.y)
      const color = p.kind === 'gate' ? '#f0c040' : p.kind === 'exit' ? '#7fd0f0' : '#e879f9'
      const isGate = p.kind === 'gate'
      list.push({
        sortY: p.cell.x + p.cell.y + 0.1,
        node: (
          <g
            key={p.id}
            transform={`translate(${s.sx},${s.sy})`}
            style={{ cursor: 'pointer' }}
            onClick={() => dispatch(isGate ? { type: 'OPEN_GATE' } : { type: 'USE_PORTAL', portalId: p.id })}
          >
            <ellipse cx={0} cy={0} rx={isGate ? 26 : 18} ry={isGate ? 13 : 9} fill={`${color}55`} style={{ animation: 'portal-pulse 2s ease-in-out infinite' }} />
            <ellipse cx={0} cy={0} rx={isGate ? 14 : 10} ry={isGate ? 7 : 5} fill={`${color}aa`} />
            <g transform="translate(0,-30)">
              <rect x={isGate ? -12 : -9} y={isGate ? -12 : -9} width={isGate ? 24 : 18} height={isGate ? 24 : 18} rx={3} fill="rgba(10,8,16,0.8)" stroke={color} strokeWidth={2} />
              <path d={isGate ? 'M-5 6 L-5 -4 Q0 -9 5 -4 L5 6' : 'M-4 4 L-4 -3 Q0 -7 4 -3 L4 4'} fill="none" stroke={color} strokeWidth={2} />
            </g>
            <g transform="translate(0,-46)">
              <rect x={-(isGate ? p.label : p.label + (p.requiredLevel ? ` Lv.${p.requiredLevel}+` : '')).length * 4 - 4} y={-8} width={(isGate ? p.label : p.label + (p.requiredLevel ? ` Lv.${p.requiredLevel}+` : '')).length * 8 + 8} height={13} rx={2} fill="rgba(10,8,16,0.7)" />
              <text x={0} y={2} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
                {isGate ? p.label : p.label + (p.requiredLevel ? ` Lv.${p.requiredLevel}+` : '')}
              </text>
            </g>
          </g>
        ),
      })
    }

    list.sort((a, b) => a.sortY - b.sortY)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, interactId])

  // 플레이어
  const pe = ELEM_SPRITE[state.player.element] ?? ELEM_SPRITE.fire
  const ps = isoToScreen(state.position.x, state.position.y)
  const playerSortY = state.position.x + state.position.y
  const playerNode = (
    <g key="__player" transform={`translate(${ps.sx},${ps.sy}) scale(1.18)`}>
      <IsoChara
        robe={pe.robe}
        shade={pe.shade}
        hair={pe.hair}
        accent={pe.accent}
        hat={pe.robe}
        back={state.facing === 'up'}
        flip={state.facing === 'left'}
        moving={moving}
      />
    </g>
  )

  const behind = staticEntities.filter((e) => e.sortY <= playerSortY).map((e) => e.node)
  const front = staticEntities.filter((e) => e.sortY > playerSortY).map((e) => e.node)

  const camX = clamp(viewportSize.w / 2 - (originX + ps.sx) * SCALE, Math.min(0, viewportSize.w - worldW * SCALE), 0)
  const camY = clamp(viewportSize.h / 2 - (originY + ps.sy) * SCALE, Math.min(0, viewportSize.h - worldH * SCALE), 0)

  return (
    <div className="absolute left-0 top-0" style={{ transform: `translate3d(${camX}px, ${camY}px, 0) scale(${SCALE})`, transformOrigin: '0 0', willChange: 'transform' }}>
      <svg
        width={worldW}
        height={worldH}
        viewBox={`${bounds.minSx} ${-PAD_TOP} ${worldW} ${worldH}`}
        style={{ display: 'block', overflow: 'visible' }}
        shapeRendering="crispEdges"
      >
        {/* 지면 */}
        <g>{ground}</g>
        {/* 건물 그림자 */}
        <g>{castShadows}</g>
        {/* 격자 외곽 */}
        <polygon
          points={`${isoToScreen(0, 0).sx},${isoToScreen(0, 0).sy} ${isoToScreen(VW, 0).sx},${isoToScreen(VW, 0).sy} ${isoToScreen(VW, VH).sx},${isoToScreen(VW, VH).sy} ${isoToScreen(0, VH).sx},${isoToScreen(0, VH).sy}`}
          fill="none"
          stroke="rgba(217,164,65,0.35)"
          strokeWidth={3}
        />
        {/* 오브젝트 (뒤 → 플레이어 → 앞) */}
        {behind}
        {playerNode}
        {front}
      </svg>
    </div>
  )
}
