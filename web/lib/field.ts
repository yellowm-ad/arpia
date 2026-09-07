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
 * field 맵의 각 셀에 density 만큼 실제 몬스터 풀에서 배치. 테스트용 허수아비는 셀마다
 * 흩뿌리지 않고, 접근성 테스트용으로 스폰 지점(입구) 바로 근처에 딱 1마리만 남긴다.
 * town 맵(마을·아틀란티스)은 항상 빈 배열.
 */
export function generateFieldMonsters(map: GameMap, testMode: boolean): FieldMonster[] {
  if (map.kind !== 'field') return []

  const pool: MonsterDef[] = map.monsterPool
    ? map.monsterPool.map(monsterById).filter((m): m is MonsterDef => !!m)
    : monstersForZoneKind(map.monsterZoneKind ?? 'field')

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

  if (pool.length > 0) {
    for (let cx = 0; cx < map.grid.w; cx++) {
      for (let cy = 0; cy < map.grid.h; cy++) {
        const n = rollCount(density)
        for (let i = 0; i < n; i++) place(pool[Math.floor(rand() * pool.length)].id, cx, cy, 'fm')
      }
    }
  }

  if (testMode && testMonster) {
    // 입구(스폰 지점) 바로 근처에 테스트용 허수아비 1마리만 배치
    place(testMonster.id, Math.floor(map.spawn.x) - 1, Math.floor(map.spawn.y) - 1, 'fm-test')
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
