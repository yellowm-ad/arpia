import type { Element, GameState, Pet, PlayerCharacter } from '@/lib/types'
import { computeStatsForLevel, jobTierForLevel, ZONES, STARTING_GOLD, DEFAULT_SETTINGS } from '@/lib/constants'
import { autoLearnSkillIds } from '@/lib/mock-data'
import { createPet, STARTER_PET_BY_ELEMENT } from '@/lib/pets'

export function createPlayer(name: string, element: Element): PlayerCharacter {
  const stats = computeStatsForLevel(element, 1)
  const jobTier = jobTierForLevel(1)
  return {
    name: name || '이름없는 견습생',
    element,
    level: 1,
    exp: 0,
    jobTierId: jobTier.id,
    stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    gold: STARTING_GOLD,
    equipped: {},
    learnedSkills: autoLearnSkillIds(element, 1, 0),
  }
}

export function createStarterPet(element: Element): Pet {
  return createPet(STARTER_PET_BY_ELEMENT[element], { level: 1, affection: 45 })
}

export function createInitialGameState(): GameState {
  const player = createPlayer('', 'fire')
  const pet = createStarterPet('fire')
  const schoolZone = ZONES.find((z) => z.id === 'zone-school')!

  return {
    screen: 'title',
    previousScreen: 'title',
    player,
    pet,
    ownedPets: [pet],
    position: {
      x: (schoolZone.cell.x0 + schoolZone.cell.x1) / 2,
      y: schoolZone.cell.y1 + 0.5,
    },
    facing: 'down',
    currentZoneId: schoolZone.id,
    inventory: [
      { itemId: 'potion-hp-s', qty: 5 },
      { itemId: 'potion-mp-s', qty: 3 },
      { itemId: 'tool-escape', qty: 3 },
      { itemId: 'feed-any', qty: 2 },
    ],
    fieldMonsters: [],
    activeNpcId: null,
    activeShopId: null,
    battle: null,
    settings: DEFAULT_SETTINGS,
    toast: null,
  }
}
