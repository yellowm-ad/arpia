import type { FieldMonster } from '@/lib/types'
import { ZONES, GRID_CELLS } from '@/lib/constants'
import { MONSTERS, monstersForZoneKind } from '@/lib/mock-data'
import { mulberry32 } from '@/lib/rng'

/**
 * 필드 몬스터 배치 (기획 10번 항목)
 * 200m 정사각형(그리드 셀 1칸)당 약 5마리가 배회하도록 배치한다.
 * testMode가 켜지면 숲/바다 각 셀에 테스트몹(허수아비)을 1마리씩 추가 배치한다.
 */
export function generateFieldMonsters(testMode: boolean): FieldMonster[] {
  const rand = mulberry32(20260828)
  const result: FieldMonster[] = []
  let uidCounter = 0

  for (const zone of ZONES) {
    if (!zone.hasMonsters) continue
    const pool = monstersForZoneKind(zone.kind)
    if (pool.length === 0) continue
    const density = zone.monsterDensityPer200m ?? 5

    for (let cx = zone.cell.x0; cx < zone.cell.x1; cx++) {
      for (let cy = zone.cell.y0; cy < zone.cell.y1; cy++) {
        for (let i = 0; i < density; i++) {
          const monster = pool[Math.floor(rand() * pool.length)]
          const ox = rand() * 0.8 + 0.1
          const oy = rand() * 0.8 + 0.1
          const home = { x: cx + ox, y: cy + oy }
          result.push({
            uid: `fm-${uidCounter++}`,
            monsterId: monster.id,
            cell: { ...home },
            homeCell: { ...home },
            wanderSeed: Math.floor(rand() * 100000),
          })
        }

        if (testMode) {
          const testMonster = MONSTERS.find((m) => m.isTestMonster)
          if (testMonster) {
            const ox = rand() * 0.8 + 0.1
            const oy = rand() * 0.8 + 0.1
            const home = { x: cx + ox, y: cy + oy }
            result.push({
              uid: `fm-test-${uidCounter++}`,
              monsterId: testMonster.id,
              cell: { ...home },
              homeCell: { ...home },
              wanderSeed: Math.floor(rand() * 100000),
            })
          }
        }
      }
    }
  }

  return result
}

/** 배회 애니메이션: 홈 셀 주변을 천천히 맴도는 위치 계산 (시간 기반, 결정론적) */
export function wanderPosition(fm: FieldMonster, timeMs: number): { x: number; y: number } {
  const t = timeMs / 1000 + fm.wanderSeed
  const radius = 0.35
  const speed = 0.4
  return {
    x: fm.homeCell.x + Math.cos(t * speed) * radius,
    y: fm.homeCell.y + Math.sin(t * speed * 1.3) * radius,
  }
}

export function clampToWorld(v: number) {
  return Math.max(0.2, Math.min(GRID_CELLS - 0.2, v))
}
