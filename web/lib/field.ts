import type { FieldMonster, GameMap, MonsterDef } from '@/lib/types'
import { MONSTERS, monsterById, monstersForZoneKind } from '@/lib/mock-data'
import { mulberry32 } from '@/lib/rng'

/** 맵 id 별로 고정 시드를 뽑아 배치가 재현되도록 한다 */
function seedForMap(mapId: string): number {
  let h = 20260828
  for (let i = 0; i < mapId.length; i++) h = (h * 31 + mapId.charCodeAt(i)) | 0
  return h >>> 0
}

/**
 * 현재 맵의 필드 몬스터 배치.
 * field 맵의 각 셀에 density 만큼 배치. testMode 면 각 셀에 허수아비 1마리 추가.
 * town 맵(마을·아틀란티스)은 항상 빈 배열.
 */
export function generateFieldMonsters(map: GameMap, testMode: boolean): FieldMonster[] {
  if (map.kind !== 'field') return []

  const pool: MonsterDef[] = map.monsterPool
    ? map.monsterPool.map(monsterById).filter((m): m is MonsterDef => !!m)
    : monstersForZoneKind(map.monsterZoneKind ?? 'field')
  if (pool.length === 0 && !testMode) return []

  const rand = mulberry32(seedForMap(map.id))
  const result: FieldMonster[] = []
  let uidCounter = 0
  // 셀당 기대 마리수(소수 허용). 12×10 맵에서 0.28 ≈ 34마리.
  const density = map.monsterDensity ?? 0.28
  const testMonster = MONSTERS.find((m) => m.isTestMonster)

  const rollCount = (d: number) => Math.floor(d) + (rand() < d % 1 ? 1 : 0)

  const place = (id: string, cx: number, cy: number, prefix: string) => {
    const ox = rand() * 0.8 + 0.1
    const oy = rand() * 0.8 + 0.1
    const home = { x: cx + ox, y: cy + oy }
    result.push({
      uid: `${prefix}-${uidCounter++}`,
      monsterId: id,
      cell: { ...home },
      homeCell: { ...home },
      wanderSeed: Math.floor(rand() * 100000),
    })
  }

  for (let cx = 0; cx < map.grid.w; cx++) {
    for (let cy = 0; cy < map.grid.h; cy++) {
      if (pool.length > 0) {
        const n = rollCount(density)
        for (let i = 0; i < n; i++) place(pool[Math.floor(rand() * pool.length)].id, cx, cy, 'fm')
      }
      // 테스트 모드: 약 1/3 셀에 허수아비 추가
      if (testMode && testMonster && rand() < 0.34) place(testMonster.id, cx, cy, 'fm-test')
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
