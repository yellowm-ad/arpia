import type { ItemDef, MonsterDef, NpcDef, Skill, Stats } from '@/lib/types'
import { computeStatsForLevel } from '@/lib/constants'

const FIRE = '/images/elements/fire.svg'
const ICE = '/images/elements/ice.svg'
const EARTH = '/images/elements/earth.svg'
const NEUT = '/images/elements/neutral.svg'

// ============================================================================
// 스킬 — 설계: Documents/아르피아 시스템 DB.md §7
//  · 속성 스킬 (불꽃/얼음/대지 × 5전직)
//  · 무속성 공용 스킬
//  · 펫 스킬 (고유 + 훈련)
// ============================================================================
export const SKILLS: Skill[] = [
  // ── 불꽃 ────────────────────────────────────────────────────────────────
  { id: 'fire-t1-1', name: '불씨 던지기', element: 'fire', jobTier: 'apprentice', levelRequired: 1, mpCost: 4, power: 1.0, kind: 'attack', targeting: 'singleEnemy', status: { id: 'burn', chance: 0.2 }, icon: FIRE, description: '작은 불씨를 던져 화염 피해를 입히고 낮은 확률로 화상.' },
  { id: 'fire-t1-2', name: '온기', element: 'fire', jobTier: 'apprentice', levelRequired: 1, mpCost: 5, power: 0.8, kind: 'heal', targeting: 'self', icon: FIRE, description: '따뜻한 불기운으로 자신의 HP를 회복한다.' },
  { id: 'fire-t2-1', name: '화염 강타', element: 'fire', jobTier: 'novice', levelRequired: 10, mpCost: 8, power: 1.5, kind: 'attack', targeting: 'singleEnemy', status: { id: 'burn', chance: 0.35 }, icon: FIRE, description: '압축한 화염으로 적 하나를 강타한다.' },
  { id: 'fire-t2-2', name: '불의 채찍', element: 'fire', jobTier: 'novice', levelRequired: 10, mpCost: 7, power: 1.2, kind: 'attack', targeting: 'singleEnemy', status: { id: 'bleed', chance: 0.3 }, icon: FIRE, description: '불의 채찍으로 적을 찢어 출혈을 유발한다.' },
  { id: 'fire-t3-1', name: '불의 고리', element: 'fire', jobTier: 'adept', levelRequired: 20, mpCost: 12, power: 1.6, kind: 'attack', targeting: 'allEnemies', status: { id: 'burn', chance: 0.25 }, icon: FIRE, description: '불의 고리를 펼쳐 모든 적을 태운다.' },
  { id: 'fire-t3-2', name: '발화', element: 'fire', jobTier: 'adept', levelRequired: 20, mpCost: 10, power: 0.2, kind: 'debuff', targeting: 'allEnemies', status: { id: 'burn', chance: 0.6 }, icon: FIRE, description: '적 전체에 불을 붙여 강한 화상을 남긴다.' },
  { id: 'fire-t4-1', name: '폭염 폭발', element: 'fire', jobTier: 'magus', levelRequired: 30, mpCost: 16, power: 2.3, kind: 'attack', targeting: 'allEnemies', status: { id: 'burn', chance: 0.4 }, icon: FIRE, description: '폭발적인 열기로 전장을 휩쓴다.' },
  { id: 'fire-t4-2', name: '인페르노 낙인', element: 'fire', jobTier: 'magus', levelRequired: 30, mpCost: 15, power: 1.8, kind: 'attack', targeting: 'singleEnemy', status: { id: 'burn', chance: 0.5 }, icon: FIRE, description: '적에게 불의 낙인을 새겨 극심한 화상과 출혈을 남긴다.' },
  { id: 'fire-t5-1', name: '멸화의 심판', element: 'fire', jobTier: 'archmagus', levelRequired: 40, mpCost: 24, atbCost: 30, power: 3.3, kind: 'attack', targeting: 'allEnemies', status: { id: 'burn', chance: 0.5 }, icon: FIRE, description: '대마도사급 화염 마법으로 전장을 불태운다. 사용 후 후딜이 크다.' },

  // ── 얼음 ────────────────────────────────────────────────────────────────
  { id: 'ice-t1-1', name: '서리 화살', element: 'ice', jobTier: 'apprentice', levelRequired: 1, mpCost: 4, power: 1.0, kind: 'attack', targeting: 'singleEnemy', status: { id: 'slow', chance: 0.25 }, icon: ICE, description: '서리 화살을 쏘아 적을 느리게 만든다.' },
  { id: 'ice-t1-2', name: '얼음 방패', element: 'ice', jobTier: 'apprentice', levelRequired: 1, mpCost: 5, power: 0, kind: 'buff', targeting: 'self', buff: { id: 'ironWall', magnitude: 0.4, turns: 3 }, icon: ICE, description: '얼음 방패로 자신의 방어력을 크게 높인다.' },
  { id: 'ice-t2-1', name: '냉기 파동', element: 'ice', jobTier: 'novice', levelRequired: 10, mpCost: 8, power: 1.4, kind: 'attack', targeting: 'singleEnemy', status: { id: 'slow', chance: 0.4 }, icon: ICE, description: '냉기 파동으로 적을 얼려 둔화시킨다.' },
  { id: 'ice-t2-2', name: '빙결 손아귀', element: 'ice', jobTier: 'novice', levelRequired: 10, mpCost: 8, power: 1.1, kind: 'attack', targeting: 'singleEnemy', status: { id: 'paralysis', chance: 0.3 }, icon: ICE, description: '얼음 손아귀로 적을 붙잡아 마비시킨다.' },
  { id: 'ice-t3-1', name: '눈보라', element: 'ice', jobTier: 'adept', levelRequired: 20, mpCost: 12, power: 1.5, kind: 'attack', targeting: 'allEnemies', status: { id: 'slow', chance: 0.35 }, icon: ICE, description: '눈보라를 일으켜 모든 적을 둔화시킨다.' },
  { id: 'ice-t3-2', name: '절대영도', element: 'ice', jobTier: 'adept', levelRequired: 20, mpCost: 12, power: 1.0, kind: 'debuff', targeting: 'singleEnemy', status: { id: 'paralysis', chance: 0.7 }, icon: ICE, description: '주변 온도를 절대영도로 떨어뜨려 적을 완전히 얼린다.' },
  { id: 'ice-t4-1', name: '블리자드', element: 'ice', jobTier: 'magus', levelRequired: 30, mpCost: 16, power: 2.2, kind: 'attack', targeting: 'allEnemies', status: { id: 'slow', chance: 0.5 }, icon: ICE, description: '거대한 눈폭풍으로 전장을 뒤덮는다.' },
  { id: 'ice-t4-2', name: '빙하기', element: 'ice', jobTier: 'magus', levelRequired: 30, mpCost: 17, power: 1.6, kind: 'attack', targeting: 'allEnemies', status: { id: 'paralysis', chance: 0.4 }, icon: ICE, description: '일대를 빙하로 만들어 적들을 얼어붙게 한다.' },
  { id: 'ice-t5-1', name: '영겁의 빙옥', element: 'ice', jobTier: 'archmagus', levelRequired: 40, mpCost: 24, atbCost: 30, power: 3.0, kind: 'attack', targeting: 'allEnemies', status: { id: 'paralysis', chance: 0.5 }, icon: ICE, description: '영원히 녹지 않는 빙옥에 적 전체를 가둔다.' },

  // ── 대지 ────────────────────────────────────────────────────────────────
  { id: 'earth-t1-1', name: '돌팔매', element: 'earth', jobTier: 'apprentice', levelRequired: 1, mpCost: 3, power: 1.0, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: EARTH, description: '단단한 돌을 던져 물리 피해를 입힌다.' },
  { id: 'earth-t1-2', name: '단단한 살갗', element: 'earth', jobTier: 'apprentice', levelRequired: 1, mpCost: 5, power: 0, kind: 'buff', targeting: 'self', buff: { id: 'ironWall', magnitude: 0.4, turns: 3 }, icon: EARTH, description: '피부를 돌처럼 굳혀 방어력을 높인다.' },
  { id: 'earth-t2-1', name: '대지 강타', element: 'earth', jobTier: 'novice', levelRequired: 10, mpCost: 8, power: 1.4, kind: 'attack', targeting: 'singleEnemy', status: { id: 'weaken', chance: 0.3 }, icon: EARTH, description: '땅의 힘을 실어 내려쳐 적을 약화시킨다.' },
  { id: 'earth-t2-2', name: '모래 수렁', element: 'earth', jobTier: 'novice', levelRequired: 10, mpCost: 7, power: 0.6, kind: 'debuff', targeting: 'singleEnemy', status: { id: 'slow', chance: 0.5 }, icon: EARTH, description: '발밑을 수렁으로 만들어 적을 붙잡는다.' },
  { id: 'earth-t3-1', name: '철벽 방어', element: 'earth', jobTier: 'adept', levelRequired: 20, mpCost: 10, power: 0, kind: 'buff', targeting: 'allAllies', buff: { id: 'ironWall', magnitude: 0.4, turns: 3 }, icon: EARTH, description: '아군 전체를 바위 장벽으로 감싼다.' },
  { id: 'earth-t3-2', name: '최면 가루', element: 'earth', jobTier: 'adept', levelRequired: 20, mpCost: 9, power: 0, kind: 'debuff', targeting: 'singleEnemy', status: { id: 'sleep', chance: 0.65 }, icon: EARTH, description: '최면 가루를 뿌려 적을 잠재운다.' },
  { id: 'earth-t4-1', name: '지진', element: 'earth', jobTier: 'magus', levelRequired: 30, mpCost: 16, power: 2.2, kind: 'attack', targeting: 'allEnemies', status: { id: 'weaken', chance: 0.4 }, icon: EARTH, description: '대지를 뒤흔들어 모든 적을 강타하고 약화시킨다.' },
  { id: 'earth-t4-2', name: '석화의 시선', element: 'earth', jobTier: 'magus', levelRequired: 30, mpCost: 16, power: 1.2, kind: 'attack', targeting: 'singleEnemy', status: { id: 'paralysis', chance: 0.55 }, icon: EARTH, description: '적을 돌로 굳혀 움직임을 봉인한다.' },
  { id: 'earth-t5-1', name: '대지의 분노', element: 'earth', jobTier: 'archmagus', levelRequired: 40, mpCost: 24, atbCost: 30, power: 3.2, kind: 'attack', targeting: 'allEnemies', status: { id: 'weaken', chance: 0.5 }, icon: EARTH, description: '대지 그 자체의 분노를 적에게 쏟아낸다.' },

  // ── 무속성 공용 ─────────────────────────────────────────────────────────
  { id: 'n-focus', name: '정신 집중', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, atbCost: 20, power: 0, kind: 'utility', targeting: 'self', restoreMpRatio: 1.0, icon: NEUT, description: '정신을 가다듬어 자신의 MP를 회복한다. (후딜 있음)' },
  { id: 'n-firstaid', name: '응급 처치', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 6, power: 1.2, kind: 'heal', targeting: 'singleAlly', icon: NEUT, description: '아군 하나의 HP를 회복한다.' },
  { id: 'n-purify', name: '정화', element: 'neutral', jobTier: 'apprentice', levelRequired: 10, mpCost: 8, power: 0, kind: 'utility', targeting: 'singleAlly', cleanse: true, icon: NEUT, description: '아군 하나의 상태이상을 모두 해제한다.' },
  { id: 'n-rally', name: '전열 정비', element: 'neutral', jobTier: 'apprentice', levelRequired: 20, mpCost: 12, power: 0, kind: 'buff', targeting: 'allAllies', buff: { id: 'rally', magnitude: 0.15, turns: 3 }, icon: NEUT, description: '아군 전체의 공격력·마법공격력을 높인다.' },
  { id: 'n-laststand', name: '배수의 진', element: 'neutral', jobTier: 'apprentice', levelRequired: 20, mpCost: 10, power: 0, kind: 'buff', targeting: 'self', buff: { id: 'lastStand', magnitude: 0.3, turns: 3 }, icon: NEUT, description: '주는 피해가 크게 늘지만 받는 피해도 늘어난다.' },
  { id: 'n-revive', name: '소생의 빛', element: 'neutral', jobTier: 'apprentice', levelRequired: 30, mpCost: 20, power: 0, kind: 'heal', targeting: 'singleAlly', reviveHpRatio: 0.5, icon: NEUT, description: '전투불능 아군 하나를 HP 절반으로 되살린다.' },

  // ── 펫: 고유 스킬 ──────────────────────────────────────────────────────
  { id: 'pet-scratch', name: '할퀴기', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 0.8, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '발톱으로 적을 할퀸다.' },
  { id: 'pet-bite', name: '물어뜯기', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 0.9, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '적을 세게 물어뜯는다.' },
  { id: 'pet-peck', name: '쪼기', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 0.8, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '부리로 적을 빠르게 쫀다.' },
  { id: 'pet-headbutt', name: '박치기', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 0.9, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '단단한 머리로 들이받는다.' },
  { id: 'pet-slam', name: '내려찍기', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 1.0, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '온몸으로 적을 내려찍는다.' },
  { id: 'pet-glow', name: '온빛', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 3, power: 0.6, kind: 'heal', targeting: 'singleAlly', icon: NEUT, description: '부드러운 빛으로 아군을 감싸 HP를 회복한다.' },
  { id: 'pet-shadow-claw', name: '그림자 발톱', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 1.0, kind: 'attack', physical: true, targeting: 'singleEnemy', icon: NEUT, description: '그림자를 두른 발톱으로 적을 벤다.' },

  // ── 펫: 훈련 스킬 ──────────────────────────────────────────────────────
  { id: 'pet-fire-breath', name: '불꽃 숨결', element: 'fire', jobTier: 'apprentice', levelRequired: 1, mpCost: 6, power: 1.2, kind: 'attack', targeting: 'singleEnemy', status: { id: 'burn', chance: 0.3 }, icon: FIRE, description: '작은 불꽃을 내뿜어 적을 태운다.' },
  { id: 'pet-guard', name: '가드', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 4, power: 0, kind: 'buff', targeting: 'self', buff: { id: 'ironWall', magnitude: 0.4, turns: 3 }, icon: NEUT, description: '몸을 웅크려 방어 태세를 취한다.' },
  { id: 'pet-burn-fang', name: '작열의 송곳니', element: 'fire', jobTier: 'apprentice', levelRequired: 1, mpCost: 7, power: 1.3, kind: 'attack', physical: true, targeting: 'singleEnemy', status: { id: 'burn', chance: 0.4 }, icon: FIRE, description: '달아오른 송곳니로 적을 물어 화상을 남긴다.' },
  { id: 'pet-roar-atk', name: '포효', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 8, power: 0, kind: 'buff', targeting: 'allAllies', buff: { id: 'rally', magnitude: 0.12, turns: 3 }, icon: NEUT, description: '우렁찬 포효로 아군의 사기를 끌어올린다.' },
  { id: 'pet-frost-nip', name: '서리 물기', element: 'ice', jobTier: 'apprentice', levelRequired: 1, mpCost: 6, power: 1.1, kind: 'attack', targeting: 'singleEnemy', status: { id: 'slow', chance: 0.35 }, icon: ICE, description: '차가운 이빨로 적을 물어 둔화시킨다.' },
  { id: 'pet-slow-howl', name: '한기 울음', element: 'ice', jobTier: 'apprentice', levelRequired: 1, mpCost: 8, power: 0, kind: 'debuff', targeting: 'allEnemies', status: { id: 'slow', chance: 0.4 }, icon: ICE, description: '차가운 울음소리로 적 전체를 느리게 만든다.' },
  { id: 'pet-ice-shard', name: '얼음 파편', element: 'ice', jobTier: 'apprentice', levelRequired: 1, mpCost: 7, power: 1.3, kind: 'attack', targeting: 'singleEnemy', status: { id: 'slow', chance: 0.3 }, icon: ICE, description: '날카로운 얼음 파편을 날린다.' },
  { id: 'pet-mp-song', name: '마나의 노래', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 0, power: 0, kind: 'utility', targeting: 'self', restoreMpRatio: 0.8, icon: NEUT, description: '맑은 노래로 자신의 마나를 되찾는다.' },
  { id: 'pet-stone-skin', name: '바위 가죽', element: 'earth', jobTier: 'apprentice', levelRequired: 1, mpCost: 5, power: 0, kind: 'buff', targeting: 'self', buff: { id: 'ironWall', magnitude: 0.5, turns: 3 }, icon: EARTH, description: '가죽을 바위처럼 굳혀 방어에 전념한다.' },
  { id: 'pet-taunt', name: '위협', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 6, power: 0, kind: 'debuff', targeting: 'allEnemies', status: { id: 'weaken', chance: 0.3 }, icon: NEUT, description: '적을 위협해 기세를 꺾는다.' },
  { id: 'pet-quake-stomp', name: '진동 밟기', element: 'earth', jobTier: 'apprentice', levelRequired: 1, mpCost: 9, power: 1.4, kind: 'attack', physical: true, targeting: 'allEnemies', status: { id: 'weaken', chance: 0.3 }, icon: EARTH, description: '땅을 강하게 밟아 진동으로 적 전체를 흔든다.' },
  { id: 'pet-shield-ally', name: '수호의 벽', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 8, power: 0, kind: 'buff', targeting: 'allAllies', buff: { id: 'ironWall', magnitude: 0.35, turns: 3 }, icon: NEUT, description: '아군 전체를 감싸는 보호막을 만든다.' },
  { id: 'pet-heal-lite', name: '치유의 빛', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 6, power: 1.0, kind: 'heal', targeting: 'singleAlly', icon: NEUT, description: '따뜻한 빛으로 아군의 상처를 아문다.' },
  { id: 'pet-cleanse', name: '정결', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 8, power: 0, kind: 'utility', targeting: 'singleAlly', cleanse: true, icon: NEUT, description: '아군의 상태이상을 씻어낸다.' },
  { id: 'pet-silence-hiss', name: '침묵의 쉿', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 7, power: 0, kind: 'debuff', targeting: 'singleEnemy', status: { id: 'silence', chance: 0.5 }, icon: NEUT, description: '기묘한 소리로 적의 주문을 봉인한다.' },
  { id: 'pet-blind-dust', name: '눈속임 가루', element: 'neutral', jobTier: 'apprentice', levelRequired: 1, mpCost: 7, power: 0, kind: 'debuff', targeting: 'singleEnemy', status: { id: 'blind', chance: 0.5 }, icon: NEUT, description: '가루를 뿌려 적의 시야를 흐린다.' },
]

const SKILL_MAP = new Map(SKILLS.map((s) => [s.id, s]))
export function skillById(id: string): Skill | undefined {
  return SKILL_MAP.get(id)
}
export function skillsForElement(element: string): Skill[] {
  return SKILLS.filter((s) => s.element === element)
}
function jobTierOrder(id: string): number {
  return ['apprentice', 'novice', 'adept', 'magus', 'archmagus'].indexOf(id)
}
/** 캐릭터가 특정 레벨/전직에서 보유해야 할 스킬 id 목록 (자신 속성 + 무속성 공용) */
export function autoLearnSkillIds(element: string, level: number, tierOrder: number): string[] {
  return SKILLS.filter(
    (s) =>
      (s.element === element || s.element === 'neutral') &&
      !s.id.startsWith('pet-') &&
      s.levelRequired <= level &&
      jobTierOrder(s.jobTier) <= tierOrder,
  ).map((s) => s.id)
}

// ============================================================================
// 아이템 — 설계: §10
// ============================================================================
type Tier = 1 | 2 | 3 | 4 | 5
const REQ_TIER: Record<Tier, ItemDef['requiredJobTier']> = {
  1: undefined,
  2: 'novice',
  3: 'adept',
  4: 'magus',
  5: 'archmagus',
}
const WAND_PRICE: Record<Tier, number> = { 1: 300, 2: 1000, 3: 2600, 4: 5400, 5: 11000 }
const WAND_BONUS: Record<Tier, { atk: number; matk: number }> = {
  1: { atk: 3, matk: 6 },
  2: { atk: 6, matk: 12 },
  3: { atk: 10, matk: 20 },
  4: { atk: 15, matk: 30 },
  5: { atk: 22, matk: 44 },
}
const ROBE_PRICE: Record<Tier, number> = { 1: 150, 2: 800, 3: 2000, 4: 4500, 5: 9000 }
const ROBE_BONUS: Record<Tier, Partial<Stats>> = {
  1: { def: 3, mdef: 3 },
  2: { def: 6, mdef: 6, maxHp: 10 },
  3: { def: 10, mdef: 10, maxHp: 20 },
  4: { def: 16, mdef: 16, maxHp: 32 },
  5: { def: 26, mdef: 26, maxHp: 50 },
}
const ELEM_KO = { fire: '불꽃', ice: '얼음', earth: '대지' } as const
const WAND_ICON: Record<Tier, string> = {
  1: '/images/items/wand.svg',
  2: '/images/items/wand.svg',
  3: '/images/items/wand-adv.svg',
  4: '/images/items/wand-adv.svg',
  5: '/images/items/wand-adv.svg',
}

const wands: ItemDef[] = (['fire', 'ice', 'earth'] as const).flatMap((el) =>
  ([1, 2, 3, 4, 5] as Tier[]).map(
    (t): ItemDef => ({
      id: `wand-${el}-t${t}`,
      name: `${ELEM_KO[el]} 완드${t > 1 ? ' +' + (t - 1) : ''}`,
      type: 'weapon',
      icon: WAND_ICON[t],
      description: `${ELEM_KO[el]} 기운이 깃든 완드. 같은 속성 스킬 위력 +8%.`,
      price: WAND_PRICE[t],
      sellPrice: Math.round(WAND_PRICE[t] * 0.3),
      requiredJobTier: REQ_TIER[t],
      weaponElement: el,
      statBonus: { atk: WAND_BONUS[t].atk, matk: WAND_BONUS[t].matk },
      stackable: false,
      maxStack: 1,
    }),
  ),
)

const robes: ItemDef[] = ([1, 2, 3, 4, 5] as Tier[]).map(
  (t): ItemDef => ({
    id: `robe-t${t}`,
    name: ['견습생', '초보 마법사', '숙련 마법사', '마도사', '대마도사'][t - 1] + '의 로브',
    type: 'armor',
    icon: '/images/items/robe.svg',
    description: '아르피아 마법학교 지급 로브.',
    price: ROBE_PRICE[t],
    sellPrice: Math.round(ROBE_PRICE[t] * 0.3),
    requiredJobTier: REQ_TIER[t],
    statBonus: ROBE_BONUS[t],
    stackable: false,
    maxStack: 1,
  }),
)

const hats: ItemDef[] = [
  { id: 'hat-cloth', name: '천 모자', type: 'armor', icon: '/images/items/robe.svg', description: '가벼운 천 모자.', price: 120, sellPrice: 36, statBonus: { mdef: 3, maxMp: 8 }, stackable: false, maxStack: 1 },
  { id: 'hat-pointed', name: '뾰족 모자', type: 'armor', icon: '/images/items/robe.svg', description: '숙련 마법사의 뾰족 모자.', price: 1400, sellPrice: 420, requiredJobTier: 'adept', statBonus: { mdef: 8, maxMp: 18 }, stackable: false, maxStack: 1 },
  { id: 'hat-arch', name: '대마도사의 첨모', type: 'armor', icon: '/images/items/robe.svg', description: '대마도사만이 쓸 수 있는 첨모.', price: 7000, sellPrice: 2100, requiredJobTier: 'archmagus', statBonus: { mdef: 18, maxMp: 40 }, stackable: false, maxStack: 1 },
]

const accessories: ItemDef[] = [
  { id: 'acc-ring-luck', name: '행운의 반지', type: 'accessory', icon: '/images/items/ring.svg', description: '착용자에게 행운을 더한다.', price: 600, sellPrice: 180, statBonus: { luck: 5 }, stackable: false, maxStack: 1 },
  { id: 'acc-amulet-mana', name: '마나의 목걸이', type: 'accessory', icon: '/images/items/amulet.svg', description: 'MP 최대치를 늘려준다.', price: 900, sellPrice: 270, statBonus: { maxMp: 20 }, stackable: false, maxStack: 1 },
  { id: 'acc-brooch-guard', name: '수호의 브로치', type: 'accessory', icon: '/images/items/amulet.svg', description: '방어력과 마법방어력을 높인다.', price: 1100, sellPrice: 330, statBonus: { def: 4, mdef: 4 }, stackable: false, maxStack: 1 },
  { id: 'acc-band-swift', name: '신속의 팔찌', type: 'accessory', icon: '/images/items/ring.svg', description: '속도를 높여 ATB가 빨리 찬다.', price: 1200, sellPrice: 360, statBonus: { spd: 4 }, stackable: false, maxStack: 1 },
  { id: 'acc-charm-ward', name: '방호 부적', type: 'accessory', icon: '/images/items/scroll.svg', description: '상태이상 저항 +15%.', price: 1500, sellPrice: 450, statusResist: 15, stackable: false, maxStack: 1 },
  { id: 'acc-pendant-vitality', name: '활력의 펜던트', type: 'accessory', icon: '/images/items/amulet.svg', description: '최대 HP를 크게 늘린다.', price: 1400, sellPrice: 420, statBonus: { maxHp: 40 }, stackable: false, maxStack: 1 },
]

const potions: ItemDef[] = [
  { id: 'potion-hp-s', name: '체력 물약(소)', type: 'potion', icon: '/images/items/potion-red.svg', description: 'HP를 40 회복한다.', price: 30, sellPrice: 10, useEffect: { healHp: 40 }, stackable: true, maxStack: 99 },
  { id: 'potion-hp-m', name: '체력 물약(중)', type: 'potion', icon: '/images/items/potion-red.svg', description: 'HP를 120 회복한다.', price: 90, sellPrice: 30, useEffect: { healHp: 120 }, stackable: true, maxStack: 99 },
  { id: 'potion-hp-l', name: '체력 물약(대)', type: 'potion', icon: '/images/items/potion-red.svg', description: 'HP를 320 회복한다.', price: 240, sellPrice: 80, useEffect: { healHp: 320 }, stackable: true, maxStack: 99 },
  { id: 'potion-mp-s', name: '마나 물약(소)', type: 'potion', icon: '/images/items/potion-blue.svg', description: 'MP를 30 회복한다.', price: 35, sellPrice: 12, useEffect: { healMp: 30 }, stackable: true, maxStack: 99 },
  { id: 'potion-mp-m', name: '마나 물약(중)', type: 'potion', icon: '/images/items/potion-blue.svg', description: 'MP를 80 회복한다.', price: 100, sellPrice: 35, useEffect: { healMp: 80 }, stackable: true, maxStack: 99 },
  { id: 'potion-elixir', name: '엘릭서', type: 'potion', icon: '/images/items/potion-gold.svg', description: 'HP와 MP를 모두 완전히 회복한다.', price: 500, sellPrice: 150, useEffect: { healHp: 9999, healMp: 9999 }, stackable: true, maxStack: 99 },
]

const tools: ItemDef[] = [
  { id: 'tool-escape', name: '탈출의 주문서', type: 'tool', icon: '/images/items/scroll.svg', description: '전투에서 확실하게 도망친다.', price: 50, sellPrice: 15, useEffect: { escapeBattle: true }, stackable: true, maxStack: 20 },
  { id: 'tool-antidote', name: '해독제', type: 'tool', icon: '/images/items/vial-green.svg', description: '상태이상을 모두 치료한다.', price: 40, sellPrice: 12, useEffect: { cureStatus: true }, stackable: true, maxStack: 20 },
  { id: 'tool-revive-feather', name: '부활의 깃털', type: 'tool', icon: '/images/items/feather.svg', description: '쓰러진 아군을 HP 절반으로 되살린다.', price: 300, sellPrice: 90, useEffect: { reviveOnly: true, healHp: 9999 }, stackable: true, maxStack: 10 },
  { id: 'tool-haste-sand', name: '가속의 모래', type: 'tool', icon: '/images/items/vial-green.svg', description: '대상의 ATB를 즉시 50 채운다.', price: 120, sellPrice: 36, useEffect: { atbBoost: 50 }, stackable: true, maxStack: 20 },
]

const feeds: ItemDef[] = [
  { id: 'feed-fire', name: '매콤한 먹이', type: 'feed', icon: '/images/items/vial-green.svg', description: '불꽃 계열 펫이 좋아한다. 호감도 +12.', price: 80, sellPrice: 24, feedElement: 'fire', useEffect: { petAffection: 12 }, stackable: true, maxStack: 30 },
  { id: 'feed-ice', name: '시원한 먹이', type: 'feed', icon: '/images/items/vial-green.svg', description: '얼음 계열 펫이 좋아한다. 호감도 +12.', price: 80, sellPrice: 24, feedElement: 'ice', useEffect: { petAffection: 12 }, stackable: true, maxStack: 30 },
  { id: 'feed-earth', name: '든든한 먹이', type: 'feed', icon: '/images/items/vial-green.svg', description: '대지 계열 펫이 좋아한다. 호감도 +12.', price: 80, sellPrice: 24, feedElement: 'earth', useEffect: { petAffection: 12 }, stackable: true, maxStack: 30 },
  { id: 'feed-any', name: '평범한 먹이', type: 'feed', icon: '/images/items/vial-green.svg', description: '어떤 펫이든 조금 좋아한다. 호감도 +6.', price: 40, sellPrice: 12, feedElement: 'neutral', useEffect: { petAffection: 6 }, stackable: true, maxStack: 30 },
]

export const ITEMS: ItemDef[] = [...wands, ...robes, ...hats, ...accessories, ...potions, ...tools, ...feeds]
const ITEM_MAP = new Map(ITEMS.map((i) => [i.id, i]))
export function itemById(id: string): ItemDef | undefined {
  return ITEM_MAP.get(id)
}

// ============================================================================
// 몬스터 — 설계: §8
// ============================================================================
function mstat(level: number, mult: Partial<Stats> = {}): Stats {
  const s = computeStatsForLevel('neutral', level)
  const base: Stats = {
    maxHp: Math.round(s.maxHp * 0.75),
    maxMp: Math.round(s.maxMp * 0.6),
    atk: Math.round(s.atk * 0.85),
    def: Math.round(s.def * 0.7),
    matk: Math.round(s.matk * 0.7),
    mdef: Math.round(s.mdef * 0.65),
    spd: Math.round(s.spd * 0.9),
    luck: Math.round(s.luck * 0.6),
  }
  ;(Object.keys(base) as (keyof Stats)[]).forEach((k) => {
    if (mult[k] != null) base[k] = Math.max(1, Math.round(base[k] * (mult[k] as number)))
  })
  return base
}

export const MONSTERS: MonsterDef[] = [
  // 위습 숲
  { id: 'mon-forest-raccoon', name: '숲너구리', level: 2, icon: '/images/monsters/raccoon.svg', element: 'earth', family: 'beast', stats: mstat(2), skills: [], expReward: 18, goldReward: 12, zoneKinds: ['forest'], dropTable: [{ itemId: 'potion-hp-s', chance: 0.3 }, { itemId: 'feed-any', chance: 0.15 }] },
  { id: 'mon-thorn-vine', name: '가시덩굴', level: 3, icon: '/images/monsters/vine.svg', element: 'earth', family: 'plant', stats: mstat(3, { maxHp: 1.4, def: 1.3, spd: 0.6 }), traits: ['tank'], skills: [], expReward: 26, goldReward: 15, zoneKinds: ['forest'], dropTable: [{ itemId: 'potion-hp-s', chance: 0.25 }] },
  { id: 'mon-sprite-green', name: '초록 요정', level: 4, icon: '/images/monsters/bubble.svg', element: 'neutral', family: 'beast', stats: mstat(4, { spd: 1.4, luck: 1.5 }), traits: ['swift'], skills: [], expReward: 30, goldReward: 22, zoneKinds: ['forest'], dropTable: [{ itemId: 'potion-mp-s', chance: 0.3 }] },
  { id: 'mon-grey-wolf', name: '회색 늑대', level: 5, icon: '/images/monsters/wolf.svg', element: 'ice', family: 'beast', stats: mstat(5, { atk: 1.2, spd: 1.2 }), traits: ['aggressive'], skills: [], expReward: 38, goldReward: 24, zoneKinds: ['forest'] },
  { id: 'mon-mush-cap', name: '독버섯 갓', level: 6, icon: '/images/monsters/vine.svg', element: 'earth', family: 'plant', stats: mstat(6, { matk: 1.4, maxMp: 1.6 }), traits: ['caster'], skills: ['earth-t3-2'], expReward: 46, goldReward: 28, zoneKinds: ['forest'], dropTable: [{ itemId: 'tool-antidote', chance: 0.2 }] },
  { id: 'mon-bark-golem', name: '나무 골렘', level: 8, icon: '/images/monsters/dummy.svg', element: 'earth', family: 'construct', stats: mstat(8, { maxHp: 1.6, def: 1.5, spd: 0.6 }), traits: ['tank'], skills: [], expReward: 62, goldReward: 40, zoneKinds: ['forest'], dropTable: [{ itemId: 'robe-t1', chance: 0.1 }] },
  // 가나폴리 해안
  { id: 'mon-bubble-spirit', name: '물거품 정령', level: 2, icon: '/images/monsters/bubble.svg', element: 'ice', family: 'aquatic', stats: mstat(2), skills: [], expReward: 17, goldReward: 11, zoneKinds: ['sea'], dropTable: [{ itemId: 'potion-mp-s', chance: 0.25 }] },
  { id: 'mon-crab-soldier', name: '게 껍질병정', level: 3, icon: '/images/monsters/crab.svg', element: 'ice', family: 'aquatic', stats: mstat(3, { def: 1.4, maxHp: 1.2 }), traits: ['tank'], skills: [], expReward: 24, goldReward: 16, zoneKinds: ['sea'] },
  { id: 'mon-shallows-eel', name: '얕은여울 뱀장어', level: 5, icon: '/images/monsters/eel.svg', element: 'ice', family: 'aquatic', stats: mstat(5, { spd: 1.4 }), traits: ['swift'], skills: [], expReward: 42, goldReward: 26, zoneKinds: ['sea'] },
  { id: 'mon-siren-larva', name: '세이렌 유충', level: 7, icon: '/images/monsters/bubble.svg', element: 'neutral', family: 'aquatic', stats: mstat(7, { matk: 1.3 }), traits: ['caster'], skills: ['pet-silence-hiss'], expReward: 54, goldReward: 34, zoneKinds: ['sea'], dropTable: [{ itemId: 'acc-amulet-mana', chance: 0.05 }] },
  { id: 'mon-reef-turtle', name: '암초 거북', level: 9, icon: '/images/monsters/crab.svg', element: 'ice', family: 'aquatic', stats: mstat(9, { maxHp: 1.7, def: 1.6, spd: 0.5 }), traits: ['tank'], skills: [], expReward: 70, goldReward: 44, zoneKinds: ['sea'] },
  { id: 'mon-tide-elemental', name: '밀물 정령', level: 11, icon: '/images/monsters/bubble.svg', element: 'ice', family: 'aquatic', stats: mstat(11, { matk: 1.5, maxMp: 1.6 }), traits: ['caster'], skills: ['ice-t2-1'], expReward: 88, goldReward: 52, zoneKinds: ['sea'], dropTable: [{ itemId: 'wand-ice-t2', chance: 0.06 }] },
  // 아즈카의 폐허
  { id: 'mon-ember-imp', name: '잉걸 임프', level: 10, icon: '/images/monsters/raccoon.svg', element: 'fire', family: 'beast', stats: mstat(10, { atk: 1.2, spd: 1.2 }), traits: ['aggressive'], skills: ['fire-t1-1'], expReward: 82, goldReward: 50, zoneKinds: ['ruins'] },
  { id: 'mon-ash-hound', name: '잿빛 사냥개', level: 12, icon: '/images/monsters/wolf.svg', element: 'fire', family: 'beast', stats: mstat(12, { spd: 1.5, atk: 1.2 }), traits: ['swift', 'aggressive'], skills: [], expReward: 96, goldReward: 58, zoneKinds: ['ruins'] },
  { id: 'mon-bone-archer', name: '해골 궁수', level: 13, icon: '/images/monsters/eel.svg', element: 'neutral', family: 'undead', stats: mstat(13, { atk: 1.3 }), traits: ['caster'], skills: ['fire-t2-2'], expReward: 104, goldReward: 62, zoneKinds: ['ruins'], dropTable: [{ itemId: 'potion-hp-m', chance: 0.2 }] },
  { id: 'mon-cursed-armor', name: '저주받은 갑주', level: 15, icon: '/images/monsters/dummy.svg', element: 'earth', family: 'construct', stats: mstat(15, { maxHp: 1.8, def: 1.7, spd: 0.5 }), traits: ['tank'], skills: [], expReward: 122, goldReward: 74, zoneKinds: ['ruins'], dropTable: [{ itemId: 'robe-t3', chance: 0.08 }] },
  { id: 'mon-wraith', name: '원귀', level: 17, icon: '/images/monsters/bubble.svg', element: 'neutral', family: 'undead', stats: mstat(17, { matk: 1.5, spd: 1.2 }), traits: ['caster'], skills: ['pet-blind-dust'], expReward: 140, goldReward: 84, zoneKinds: ['ruins'] },
  { id: 'mon-dark-acolyte', name: '어둠의 수련생', level: 18, icon: '/images/monsters/vine.svg', element: 'fire', family: 'darkmage', stats: mstat(18, { matk: 1.5, maxMp: 1.6 }), traits: ['caster'], skills: ['fire-t2-1'], expReward: 150, goldReward: 90, zoneKinds: ['ruins'], dropTable: [{ itemId: 'wand-fire-t3', chance: 0.05 }] },
  { id: 'mon-flame-warden', name: '화염 파수꾼', level: 20, icon: '/images/monsters/dummy.svg', element: 'fire', family: 'construct', stats: mstat(20, { maxHp: 1.9, def: 1.6, matk: 1.3 }), traits: ['tank', 'caster'], skills: ['fire-t3-1'], expReward: 180, goldReward: 110, zoneKinds: ['ruins'], dropTable: [{ itemId: 'wand-fire-t3', chance: 0.12 }] },
  { id: 'mon-frost-revenant', name: '서리 망령', level: 22, icon: '/images/monsters/bubble.svg', element: 'ice', family: 'undead', stats: mstat(22, { matk: 1.6, spd: 1.1 }), traits: ['caster'], skills: ['ice-t2-1', 'ice-t2-2'], expReward: 200, goldReward: 122, zoneKinds: ['ruins'] },
  { id: 'mon-dark-mage', name: '흑마법사', level: 25, icon: '/images/monsters/vine.svg', element: 'neutral', family: 'darkmage', stats: mstat(25, { matk: 1.8, maxMp: 1.8 }), traits: ['caster'], skills: ['fire-t3-1', 'ice-t3-1'], expReward: 240, goldReward: 150, zoneKinds: ['ruins'], dropTable: [{ itemId: 'acc-charm-ward', chance: 0.1 }] },
  { id: 'mon-stone-titan', name: '석상 거인', level: 28, icon: '/images/monsters/dummy.svg', element: 'earth', family: 'construct', stats: mstat(28, { maxHp: 2.2, def: 1.9, spd: 0.5, atk: 1.3 }), traits: ['tank'], skills: ['earth-t4-1'], expReward: 300, goldReward: 190, zoneKinds: ['ruins'], dropTable: [{ itemId: 'robe-t4', chance: 0.1 }] },
  { id: 'mon-azka-herald', name: '아즈카의 전령', level: 32, icon: '/images/monsters/wolf.svg', element: 'fire', family: 'darkmage', stats: mstat(32, { maxHp: 2.4, matk: 2.0, maxMp: 2.0, atk: 1.4 }), traits: ['caster', 'aggressive'], skills: ['fire-t4-1', 'fire-t3-2'], expReward: 420, goldReward: 280, zoneKinds: ['ruins'], dropTable: [{ itemId: 'wand-fire-t4', chance: 0.15 }, { itemId: 'potion-elixir', chance: 0.3 }] },
  // 테스트몹
  { id: 'mon-training-dummy', name: '훈련용 허수아비', level: 1, icon: '/images/monsters/dummy.svg', element: 'neutral', family: 'test', stats: { maxHp: 30, maxMp: 0, atk: 1, def: 1, matk: 0, mdef: 1, spd: 1, luck: 0 }, skills: [], expReward: 0, goldReward: 0, zoneKinds: ['forest', 'sea', 'ruins'], isTestMonster: true },
]

const MONSTER_MAP = new Map(MONSTERS.map((m) => [m.id, m]))
export function monsterById(id: string): MonsterDef | undefined {
  return MONSTER_MAP.get(id)
}
export function monstersForZoneKind(kind: string): MonsterDef[] {
  return MONSTERS.filter((m) => !m.isTestMonster && m.zoneKinds.includes(kind as never))
}

// ============================================================================
// NPC — 설계: §9.1
// ============================================================================
export const NPCS: NpcDef[] = [
  // ── 학교 지구 (마법동) ──
  { id: 'npc-job-trainer', name: '미르엘 교수', role: 'jobTrainer', icon: '/images/npc/professor.svg', zoneId: 'z-magic-hall', cell: { x: 1.4, y: 1.4 }, greeting: ['어서 오렴, 견습생. 나는 전직을 담당하는 미르엘이란다.', '레벨이 충분히 오르면 언제든 찾아오렴 — 다음 단계로 이끌어주마.'] },
  { id: 'npc-librarian', name: '사서 오웬', role: 'flavor', icon: '/images/npc/librarian.svg', zoneId: 'z-magic-hall', cell: { x: 2.3, y: 2.4 }, greeting: ['마법동 도서관에는 아직 정리 중인 마법서가 많단다. 조용히 둘러보렴.', '연금술동과 마도구동도 둘러보면 좋을 게야.'] },
  // ── 별빛 상점가 ──
  { id: 'npc-weapon', name: '대장장이 반', role: 'weaponMerchant', icon: '/images/npc/blacksmith.svg', zoneId: 'z-shops', cell: { x: 10.4, y: 6.2 }, greeting: ['속성별 완드, 다 갖춰놨다네. 전직 단계에 맞는 걸로 골라 가시게.'], shopItemIds: [...wands.map((w) => w.id), ...robes.map((r) => r.id), ...hats.map((h) => h.id), ...accessories.map((a) => a.id)] },
  { id: 'npc-potion', name: '약사 셀린', role: 'potionMerchant', icon: '/images/npc/alchemist.svg', zoneId: 'z-shops', cell: { x: 11.5, y: 6.9 }, greeting: ['신선한 물약이 방금 들어왔어요. 통문 밖으로 나가기 전엔 꼭 챙기세요!'], shopItemIds: potions.map((p) => p.id) },
  { id: 'npc-tool', name: '만물상 토비', role: 'toolMerchant', icon: '/images/npc/tinker.svg', zoneId: 'z-shops', cell: { x: 12.6, y: 6.2 }, greeting: ['도구는 다 여기 있습니다. 가속의 모래, 이거 전투에서 꽤 쓸만해요.'], shopItemIds: tools.map((t) => t.id) },
  { id: 'npc-tamer', name: '조련사 리코', role: 'petTamer', icon: '/images/npc/librarian.svg', zoneId: 'z-shops', cell: { x: 13.3, y: 7.0 }, greeting: ['펫한테 새 재주를 가르쳐 볼까? 먹이도 팔고 있어.', '햇살 농가에서 펫 농장도 준비 중이라던데.'], shopItemIds: feeds.map((f) => f.id) },
  // ── 하우징 마을 ──
  { id: 'npc-elder', name: '촌장 헬가', role: 'housing', icon: '/images/npc/elder.svg', zoneId: 'z-housing', cell: { x: 11.5, y: 2.5 }, greeting: ['하우징 마을에 온 걸 환영하네. 집을 짓는 기능은 다음 업데이트에서 만나볼 걸세.', '지친 견습생은 여기서 쉬어 가도 좋네.'] },
  // ── 수련의 광장 ──
  { id: 'npc-arena', name: '투기장장 그로먼', role: 'arenaMaster', icon: '/images/npc/arena-master.svg', zoneId: 'z-plaza', cell: { x: 7.5, y: 6.4 }, greeting: ['콜로세움 대전은 준비 중이다! 조금만 기다려다오.'] },
  // ── 통문 주둔지 ──
  { id: 'npc-guard', name: '경비대장 로한', role: 'guard', icon: '/images/npc/guard.svg', zoneId: 'z-barracks', cell: { x: 10.6, y: 10.2 }, greeting: ['야생으로 나가려면 저 군 통문을 통해야 한다.', '숲은 견습생도 견딜 만하지만, 폐허와 화산지대는 준비가 단단히 되어 있어야 살아 돌아온다.'] },
  // ── 성역 신전 (신규) ──
  { id: 'npc-priest', name: '신관 세드릭', role: 'templePriest', icon: '/images/npc/elder.svg', zoneId: 'z-temple', cell: { x: 1.9, y: 10.0 }, greeting: ['성역에 온 것을 환영하네, 젊은 마법사여.', '이곳은 지친 영혼이 쉬어 가는 곳. 통문 밖에서 쓰러지면 이 신전에서 눈을 뜨게 될 걸세.'] },
  { id: 'npc-saint', name: '성녀 리아나', role: 'saint', icon: '/images/npc/librarian.svg', zoneId: 'z-temple', cell: { x: 3.1, y: 10.7 }, greeting: ['빛이 그대와 함께하기를.', '언젠가 이 손으로 그대에게 축복을 내릴 날이 오겠지요. 지금은 준비 중이랍니다.'] },
  // ── 햇살 농가 (신규) ──
  { id: 'npc-farmer', name: '농부 하름', role: 'farmer', icon: '/images/npc/tinker.svg', zoneId: 'z-farm', cell: { x: 7.0, y: 10.2 }, greeting: ['어이, 견습생! 여기가 햇살 농가일세.', '밭농사에 펫 농장까지 해볼 생각인데, 아직은 삽질만 하고 있다네. 곧 열 테니 기대하게.'] },
]
const NPC_MAP = new Map(NPCS.map((n) => [n.id, n]))
export function npcById(id: string): NpcDef | undefined {
  return NPC_MAP.get(id)
}
