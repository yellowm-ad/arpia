import type { PlayerCharacter, Stats } from '@/lib/types'
import { itemById } from '@/lib/mock-data'

/** 장비 보정치를 합산한 실효 스탯을 계산한다 */
export function getEffectiveStats(player: PlayerCharacter): Stats {
  const out: Stats = { ...player.stats }
  for (const itemId of Object.values(player.equipped)) {
    if (!itemId) continue
    const item = itemById(itemId)
    if (!item?.statBonus) continue
    ;(Object.keys(item.statBonus) as (keyof Stats)[]).forEach((key) => {
      out[key] = (out[key] ?? 0) + (item.statBonus![key] ?? 0)
    })
  }
  return out
}
