// ============================================================================
// 마법학교 아르피아 (원작 시스템 복원) — 도메인 타입 정의
// 설계 기준: Documents/아르피아 시스템 DB.md
// 모든 화면/컴포넌트는 이 타입을 기준으로 데이터를 주고받는다.
// ============================================================================

/** 원작 3속성 상성 순환: 불꽃 > 얼음 > 대지 > 불꽃 */
export type Element = 'fire' | 'ice' | 'earth'
export type ElementOrNeutral = Element | 'neutral'

/** 전직 5단계. 요구 레벨 1 / 10 / 20 / 30 / 40 */
export type JobTierId = 'apprentice' | 'novice' | 'adept' | 'magus' | 'archmagus'

export interface JobTier {
  id: JobTierId
  order: number // 0~4
  name: string // 견습 마법사 등
  shortName: string
  minLevel: number
  description: string
}

/** 전투/성장 스탯 */
export interface Stats {
  maxHp: number
  maxMp: number
  atk: number // 물리 공격력
  def: number // 물리 방어력
  matk: number // 마법 공격력
  mdef: number // 마법 방어력
  spd: number // 속도 — ATB 충전 속도 결정
  luck: number // 치명타/회피/상태이상 저항 보정
}

export type StatKey = keyof Stats

// ─────────────────────────────────────────────────────────────────────────────
// 상태이상 (원작 9종)
// ─────────────────────────────────────────────────────────────────────────────
export type StatusId =
  | 'bleed' // 출혈
  | 'infection' // 감염
  | 'burn' // 화상
  | 'paralysis' // 마비
  | 'sleep' // 수면
  | 'silence' // 침묵
  | 'blind' // 실명
  | 'slow' // 감속
  | 'weaken' // 약화

export type BuffId = 'defendGuard' | 'ironWall' | 'haste' | 'rally' | 'lastStand' | 'elemUp'

/** 전투원에 부착되는 상태이상/버프 인스턴스 */
export interface ActiveEffect {
  key: string // 인스턴스 고유 id
  kind: 'status' | 'buff'
  id: StatusId | BuffId
  name: string
  turnsLeft: number
  /** 부여 시점의 부여자 마법공격력 — 화상 등 지속피해 계산용 */
  sourceMatk?: number
  /** 버프 수치(예: def +0.4) */
  magnitude?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 스킬
// ─────────────────────────────────────────────────────────────────────────────
export type SkillTargeting = 'singleEnemy' | 'allEnemies' | 'singleAlly' | 'allAllies' | 'self'
export type SkillKind = 'attack' | 'heal' | 'buff' | 'debuff' | 'utility'

export interface SkillStatusRider {
  id: StatusId
  chance: number // 0~1
  turns?: number
}

export interface Skill {
  id: string
  name: string
  element: ElementOrNeutral
  jobTier: JobTierId
  levelRequired: number
  mpCost: number
  atbCost?: number // 사용 후 추가 ATB 차감(궁극기 후딜)
  power: number // 위력 배율
  kind: SkillKind
  physical?: boolean // true면 atk/def 기반. 기본 false(마법)
  targeting: SkillTargeting
  status?: SkillStatusRider // 부여 상태이상
  buff?: { id: BuffId; magnitude: number; turns: number }
  cleanse?: boolean // 상태이상 해제
  reviveHpRatio?: number // 부활 스킬
  restoreMpRatio?: number // MP 회복 스킬(배율 * matk)
  icon: string
  description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 아이템
// ─────────────────────────────────────────────────────────────────────────────
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'potion' | 'tool' | 'feed' | 'material'
export type EquipSlot = 'weapon' | 'armor' | 'accessory'

export interface ItemDef {
  id: string
  name: string
  type: ItemType
  icon: string
  description: string
  price: number
  sellPrice: number
  statBonus?: Partial<Stats>
  requiredJobTier?: JobTierId
  /** 무기: 이 속성 스킬 위력 +8% */
  weaponElement?: Element
  /** 상태이상 저항 % (장신구) */
  statusResist?: number
  useEffect?: {
    healHp?: number
    healMp?: number
    reviveOnly?: boolean
    escapeBattle?: boolean
    cureStatus?: boolean
    atbBoost?: number // 대상 ATB 즉시 가산
    petAffection?: number // 펫 호감도 증가
  }
  feedElement?: Element | 'neutral'
  stackable: boolean
  maxStack: number
}

export interface InventorySlot {
  itemId: string
  qty: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 펫 (원작: 최대 2마리 동반, 호감도, 스킬 훈련)
// 본 복원 1차 구현은 활성 슬롯 1마리 + 완전한 도감/호감도/훈련 데이터 모델.
// ─────────────────────────────────────────────────────────────────────────────
export type PetRarity = 'common' | 'rare' | 'special'

export interface PetTrainableSkill {
  skillId: string
  minLevel: number
  costGold: number
  costItemId?: string
}

export interface PetDef {
  id: string
  name: string
  species: string
  element: ElementOrNeutral
  icon: string
  rarity: PetRarity
  baseStats: Stats
  growth: Partial<Stats>
  innateSkills: string[]
  trainableSkills: PetTrainableSkill[]
}

export interface Pet {
  defId: string
  nickname: string
  level: number
  exp: number
  affection: number // 0~100
  learnedSkills: string[]
  hp: number
  mp: number
}

export type AffectionTier = 'unfamiliar' | 'familiar' | 'close' | 'devoted'

// ─────────────────────────────────────────────────────────────────────────────
// 전투
// ─────────────────────────────────────────────────────────────────────────────
export type CombatantSide = 'player' | 'enemy'

export interface Combatant {
  uid: string
  side: CombatantSide
  kind: 'hero' | 'pet' | 'ally' | 'monster'
  refId: string
  name: string
  icon: string
  element: ElementOrNeutral
  level: number
  stats: Stats // 장비 반영 후 기본 스탯. 상태이상/버프는 계산 시점에 적용
  hp: number
  mp: number
  skills: string[]
  atb: number // 0~100+ (이월 허용)
  effects: ActiveEffect[]
  isTestMonster?: boolean
  traits?: MonsterTrait[]
  /** 펫 호감도 보정: 치명타율 가산 */
  bonusCrit?: number
  /** 펫 호감도 '헌신' 지원 공격 확률 */
  supportChance?: number
  alive: boolean
}

export type BattleAction =
  | { type: 'attack'; targetUid: string }
  | { type: 'skill'; skillId: string; targetUid: string }
  | { type: 'item'; itemId: string; targetUid?: string }
  | { type: 'flee' }
  | { type: 'defend' }

export type MonsterFamily =
  | 'beast'
  | 'plant'
  | 'aquatic'
  | 'undead'
  | 'darkmage'
  | 'construct'
  | 'test'

export type MonsterTrait = 'aggressive' | 'caster' | 'tank' | 'swift' | 'splitOnDeath'

export interface MonsterDef {
  id: string
  name: string
  level: number
  icon: string
  element: ElementOrNeutral
  family: MonsterFamily
  stats: Stats
  skills: string[]
  traits?: MonsterTrait[]
  expReward: number
  goldReward: number
  dropTable?: { itemId: string; chance: number }[]
  zoneKinds: ZoneKind[]
  isTestMonster?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 맵 / 구역
// ─────────────────────────────────────────────────────────────────────────────
export type ZoneKind =
  | 'school'
  | 'colosseum'
  | 'shopStreet'
  | 'village'
  | 'military'
  | 'forest'
  | 'sea'
  | 'ruins'
  | 'field'

export interface ZoneDef {
  id: string
  kind: ZoneKind
  name: string
  cell: { x0: number; y0: number; x1: number; y1: number }
  color: string
  description: string
  hasMonsters: boolean
  monsterDensityPer200m?: number
  recommendedLevel?: number
}

export type NpcRole =
  | 'jobTrainer'
  | 'weaponMerchant'
  | 'potionMerchant'
  | 'toolMerchant'
  | 'petTamer'
  | 'housing'
  | 'arenaMaster'
  | 'guard'
  | 'flavor'

export interface NpcDef {
  id: string
  name: string
  role: NpcRole
  icon: string
  zoneId: string
  cell: { x: number; y: number }
  greeting: string[]
  shopItemIds?: string[]
}

export interface FieldMonster {
  uid: string
  monsterId: string
  cell: { x: number; y: number }
  homeCell: { x: number; y: number }
  wanderSeed: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 플레이어 / 게임 상태
// ─────────────────────────────────────────────────────────────────────────────
export interface PlayerCharacter {
  name: string
  element: Element
  level: number
  exp: number
  jobTierId: JobTierId
  stats: Stats
  hp: number
  mp: number
  gold: number
  equipped: Partial<Record<EquipSlot, string>>
  learnedSkills: string[]
}

export interface BattleLogEntry {
  id: string
  text: string
  kind: 'info' | 'damage' | 'heal' | 'system' | 'levelup' | 'status'
}

export interface BattleState {
  round: number
  tick: number
  activeUid: string | null // 현재 행동권을 가진 전투원(없으면 ATB 계속 충전)
  combatants: Combatant[]
  log: BattleLogEntry[]
  isOver: boolean
  victory: boolean
  originCell: { x: number; y: number }
  fieldMonsterUid?: string
  rewardExp?: number
  rewardGold?: number
  rewardDrops?: string[]
  leveledUp?: boolean
  jobChangedAvailable?: boolean
}

export type ScreenId =
  | 'title'
  | 'create'
  | 'world'
  | 'battle'
  | 'inventory'
  | 'character'
  | 'party'
  | 'shop'
  | 'jobChange'
  | 'tamer'
  | 'settings'
  | 'dialogue'

export interface GameSettings {
  testMode: boolean
  bgmVolume: number
  sfxVolume: number
  battleAnimSpeed: 1 | 2
}

export interface GameState {
  screen: ScreenId
  previousScreen: ScreenId
  player: PlayerCharacter
  pet: Pet
  ownedPets: Pet[] // 보유 펫 도감(활성 펫 포함)
  position: { x: number; y: number }
  facing: 'up' | 'down' | 'left' | 'right'
  currentZoneId: string
  inventory: InventorySlot[]
  fieldMonsters: FieldMonster[]
  pendingEncounterUid: string | null // 접촉 시 전투 여부를 묻는 대상
  activeNpcId: string | null
  activeShopId: string | null
  battle: BattleState | null
  settings: GameSettings
  toast: string | null
}
