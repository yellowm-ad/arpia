// ============================================================================
// 레벨업 필요 경험치 테이블 (기획 9번 항목)
//
// "메이플스토리 정보를 따라 200렙 기준을 50으로 환산해서 적용"
//   → 메이플스토리(구버전) 실제 데이터마이닝 수치를 앵커 포인트로 삼아
//     "본 게임 레벨 L" = "메이플스토리 레벨 4L" 로 매핑(50 x 4 = 200)한 뒤,
//     구간 사이는 로그 선형보간(log-linear interpolation)으로 채워
//     메이플스토리 특유의 "후반부로 갈수록 기하급수적으로 커지는" 성장 곡선
//     형태를 그대로 재현한다.
//
// 앵커 데이터 출처: MapleStory Wiki "Experience/Leveling Tables"
//   https://maplestorywiki.net/w/Experience/Leveling_Tables , namu.wiki "메이플스토리/레벨"
//   (레벨 1,5,10,20,30,40,50,60,70,80,90,100,120,140,150,160,180,200의
//    "다음 레벨까지 필요 경험치" 실측값)
//
// ※ 실제 몬스터 처치 시 획득 경험치량은 추후 밸런싱 예정(기획 9번). 이 테이블은
//   "레벨업에 필요한 총 경험치" 기준선으로만 사용한다.
// ============================================================================

export const MAX_LEVEL = 50

/** 메이플스토리 실측 앵커: [메이플 레벨, 다음 레벨까지 필요 EXP] */
const MAPLESTORY_ANCHORS: [number, number][] = [
  [1, 15],
  [5, 135],
  [10, 1242],
  [20, 3705],
  [30, 19112],
  [40, 51357],
  [50, 110870],
  [60, 221624],
  [70, 342029],
  [80, 685481],
  [90, 1342136],
  [100, 2365603],
  [120, 6479400],
  [140, 22777494],
  [150, 41763344],
  [160, 76574580],
  [180, 226009829],
  [200, 2207026470],
]

function logLinearInterp(mapleLevel: number): number {
  const anchors = MAPLESTORY_ANCHORS
  if (mapleLevel <= anchors[0][0]) return anchors[0][1]
  for (let i = 0; i < anchors.length - 1; i++) {
    const [l0, e0] = anchors[i]
    const [l1, e1] = anchors[i + 1]
    if (mapleLevel >= l0 && mapleLevel <= l1) {
      const t = (mapleLevel - l0) / (l1 - l0)
      const log0 = Math.log(e0)
      const log1 = Math.log(e1)
      return Math.exp(log0 + t * (log1 - log0))
    }
  }
  return anchors[anchors.length - 1][1]
}

/** 본 게임 레벨(1~49) → 다음 레벨까지 필요 경험치. 인덱스 0 = 레벨1→2 필요치 */
export const EXP_TO_NEXT_LEVEL: number[] = Array.from({ length: MAX_LEVEL }, (_, i) => {
  const gameLevel = i + 1
  const mapleEquivalentLevel = gameLevel * (200 / MAX_LEVEL) // = gameLevel * 4
  return Math.round(logLinearInterp(mapleEquivalentLevel))
})

export function expRequiredForLevel(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return Number.POSITIVE_INFINITY
  return EXP_TO_NEXT_LEVEL[level - 1]
}

/**
 * 테스트몹 전용: "몬스터 10마리 처치 시 1레벨 상승"이 되도록
 * 현재 레벨 기준 필요경험치의 1/10을 정확히 지급한다. (기획 9번)
 */
export function testMonsterExpReward(currentLevel: number): number {
  const req = expRequiredForLevel(currentLevel)
  if (!Number.isFinite(req)) return 0
  return Math.max(1, Math.ceil(req / 10))
}

export interface LevelUpResult {
  newLevel: number
  newExp: number
  leveledUp: boolean
  levelsGained: number
}

/** 경험치를 더하고 필요 시 여러 레벨을 한 번에 올린다 (최대 레벨 캡 적용) */
export function applyExp(level: number, exp: number, gained: number): LevelUpResult {
  let curLevel = level
  let curExp = exp + gained
  let levelsGained = 0

  while (curLevel < MAX_LEVEL) {
    const need = expRequiredForLevel(curLevel)
    if (curExp >= need) {
      curExp -= need
      curLevel += 1
      levelsGained += 1
    } else {
      break
    }
  }

  if (curLevel >= MAX_LEVEL) {
    curLevel = MAX_LEVEL
    curExp = 0
  }

  return { newLevel: curLevel, newExp: curExp, leveledUp: levelsGained > 0, levelsGained }
}

export function expProgressPercent(level: number, exp: number): number {
  if (level >= MAX_LEVEL) return 100
  const need = expRequiredForLevel(level)
  return Math.max(0, Math.min(100, (exp / need) * 100))
}
