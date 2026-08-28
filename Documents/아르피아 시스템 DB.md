# 마법학교 아르피아 — 시스템 데이터베이스 설계서

본 문서는 원작 `마법학교 아르피아`(2007~2012, 제이인터랙티브 개발 / 엔씨소프트·야후!코리아 서비스)의
**게임 시스템**을 비영리 개인 복원 목적으로 재구성한 설계 기준이다. **스토리·시나리오·세계관 서사는
범위에서 제외**하며, 전투/성장/펫/스킬/몬스터/아이템/맵 등 규칙과 수치만 다룬다.

- 1차 출처: 나무위키 「마법학교 아르피아」
- 원작 저작권: 주식회사 엔씨소프트 / 제이인터랙티브. 본 복원물은 배포·상업적 이용을 목적으로 하지 않는다.
- 상위 기획: `Documents/전투 기획서.md`(동인 리메이크 `ReArpia` 방향), 본 문서는 그 하위의 원작 정설 DB.
- 구현 대상 코드베이스: `잡다한거/arpia/`(Next.js App Router 프로토타입)

---

## 0. 원작 정설 요약 (나무위키 기준)

| 항목 | 원작 정설 |
|---|---|
| 장르 | 쿼터뷰 턴제 RPG 웹게임 |
| 턴 방식 | 캐릭터별 **행동 대기 게이지(ATB식)**가 차오르면 행동 |
| 속성 | **불꽃 · 얼음 · 대지** 3속성 상성 순환 (불꽃>얼음>대지>불꽃) |
| 전직 | 5단계: 견습 → 초보 → 숙련 → 마도사 → 대마도사 |
| 펫 | 최대 **2마리** 동반. **호감도** 관리, **스킬 훈련** 필요 |
| 상태이상 | 출혈·감염·화상·마비·수면·침묵·실명·감속·약화 |
| 최대 레벨 | 본 복원 기준 **Lv.50** (원작 미상, ReArpia 기획 계승) |
| 콘텐츠 갱신 | 원작은 메인 미션 102화 / 주간 업데이트 (본 복원 = 시스템만) |

---

## 1. 속성 (Element)

### 1.1 상성

```
불꽃(fire) ─▶ 얼음(ice) ─▶ 대지(earth) ─▶ 불꽃(fire)
   각 속성은 "다음 속성"에 강하고 "이전 속성"에 약하다.
```

| 코드 | 이름 | 강함(→1.5×) | 약함(→0.67×) | 색상 토큰 |
|---|---|---|---|---|
| `fire` | 불꽃 | `ice` | `earth` | `--elem-fire` `#e0542b` |
| `ice` | 얼음 | `earth` | `fire` | `--elem-ice` `#3aa6d6` |
| `earth` | 대지 | `fire` | `ice` | `--elem-earth` `#8a6a3c` |
| `neutral` | 무 | — | — | `--elem-neutral` `#9a9aa6` |

### 1.2 데미지 계수

| 상황 | 배율 |
|---|---|
| 상성 우위 (attacker strong vs defender) | **1.5** |
| 상성 열위 | **0.67** |
| 동일 속성 / 무속성 관여 | 1.0 |
| **종족 속성 일치 보너스**: 시전자 속성 == 스킬 속성 | 스킬 위력 **×1.3** (전투 기획서 계승) |

### 1.3 속성별 성향 (스탯 lean)

레벨업 시 `computeStatsForLevel(element, level)`에서 소폭 가산.

| 속성 | 편중 스탯 | 상태이상 친화(스킬 부여) |
|---|---|---|
| 불꽃 | `matk +3`, `atk +1` | 화상, 출혈 |
| 얼음 | `mdef +2`, `maxMp +10`, `spd -1` | 감속, 마비 |
| 대지 | `def +2`, `maxHp +15` | 약화, 수면 |
| 무 | 없음 | 침묵, 실명, 감염 |

---

## 2. 전직 (Job Tier)

원작 5단계. 레벨 게이트는 "10레벨 단위"(ReArpia 기획) 적용, 최대 Lv.50.

| id | 이름 | 짧은 이름 | 요구 레벨 | 비고 |
|---|---|---|---|---|
| `apprentice` | 견습 마법사 | 견습 | 1 | 시작 |
| `novice` | 초보 마법사 | 초보 | 10 | |
| `adept` | 숙련 마법사 | 숙련 | 20 | |
| `magus` | 마도사 | 마도사 | 30 | |
| `archmagus` | 대마도사 | 대마도사 | 40 | 최종 |

- 요구 레벨 도달 시 마법학교의 전직 NPC(미르엘 교수)에게서 전직.
- 전직 시 해당 단계의 속성 스킬 자동 습득.
- 장비의 `requiredJobTier`가 있으면 그 단계 이상만 착용.

---

## 3. 스탯 (Stats)

8종. 프로토타입 모델 유지.

| 키 | 이름 | 용도 |
|---|---|---|
| `maxHp` | 체력 | 0이 되면 전투불능 |
| `maxMp` | 마나 | 스킬 소모 |
| `atk` | 물리 공격력 | 기본공격 / 물리 스킬 |
| `def` | 물리 방어력 | 물리 피해 경감 |
| `matk` | 마법 공격력 | 대부분의 속성 마법 |
| `mdef` | 마법 방어력 | 마법 피해 경감 |
| `spd` | 속도 | **ATB 충전 속도** 결정 |
| `luck` | 행운 | 치명타율·회피·상태이상 저항 보정 |

### 3.1 기본값 / 성장

```
BASE_STATS      = { maxHp 60, maxMp 40, atk 6, def 4, matk 8, mdef 4, spd 6, luck 3 }
GROWTH_PER_LV   = { maxHp 14, maxMp 8, atk 2.2, def 1.6, matk 2.6, mdef 1.6, spd 1.2, luck 0.8 }
finalStat(k) = round( BASE[k] + GROWTH[k]*(level-1) + elementLean[k]*level*0.4 )
```

### 3.2 파생 계산 (전투)

| 값 | 공식 |
|---|---|
| 치명타율 | `min(0.35, 0.05 + luck*0.01)` (+ `실명` 시 명중과 별개) |
| 치명타 배율 | `1.6×` |
| 회피율 | `min(0.30, 0.02 + luck*0.006)` (`감속`/`수면` 대상은 0) |
| 명중률 | `1.0` 기본, `실명` 시 `0.5×` |
| 물리 피해 | `max(1, round(atk*power*elem*variance - def*0.5))` |
| 마법 피해 | `max(1, round(matk*power*elem*variance - mdef*0.5))` |
| variance | `0.85 ~ 1.15` 난수 |
| 방어(Defend) | 다음 피격 1회 피해 `0.5×`, ATB 즉시 `+20` |

### 3.3 경험치 테이블

`lib/exp-table.ts` 유지. 메이플스토리 200렙 곡선을 50렙으로 환산(로그 선형보간).
테스트몹은 "10마리 처치 = 1레벨"이 되도록 `ceil(필요경험치/10)` 동적 지급.

---

## 4. 턴 시스템 — ATB 대기 게이지

원작의 "행동 대기 게이지가 캐릭터당 돌아간다"를 구현.

### 4.1 규칙

- 모든 전투원은 `atb: 0`에서 시작. 매 틱마다 충전:
  ```
  atbGainPerTick = BASE_TICK * (spd / REF_SPD) * slowFactor
    BASE_TICK  = 8
    REF_SPD    = 20         (기준 속도)
    slowFactor = 감속 상태이면 0.6, 아니면 1.0
  ```
- `atb >= 100` 이 되면 **행동 준비 완료**. 가장 먼저 100을 넘은 전투원이 행동.
  - 동시 도달 시 `spd` 높은 쪽 우선, 그다음 아군 우선.
- 행동 후 `atb -= 100` (초과분 이월). 스킬별 `atbCost`가 있으면 추가 차감(무거운 궁극기 = 후딜).
- `수면`/`마비(발동)` 로 행동 불가 시에도 턴 소비, `atb` 는 리셋.

### 4.2 UI

전투 화면에 각 전투원 ATB 바 표시. `battleAnimSpeed`(1/2배속) 설정이 틱 간격에 적용.

### 4.3 타입 변경 (types.ts)

```ts
interface Combatant {
  // ...기존
  atb: number            // 0~100+ (이월 허용)
  baseSpd: number        // 감속 등 적용 전 원본
}
interface BattleState {
  // turnOrder / turnIndex 제거 → ATB 루프로 대체
  round: number
  tick: number
  activeUid: string | null   // 현재 행동권을 가진 전투원 (없으면 계속 틱)
}
```

---

## 5. 상태이상 (Status Effect) — 9종

`lib/status-effects.ts` 신설. 각 효과는 `onTurnStart` / `onApply` / `statMod` / `blocksAction` / `blocksSkill` 훅으로 정의.

| id | 이름 | 분류 | 효과 | 지속 | 부여 속성 |
|---|---|---|---|---|---|
| `bleed` | 출혈 | 지속피해 | 행동 시작 시 `maxHp*4%` 물리 피해 | 3턴 | 불꽃 |
| `infection` | 감염 | 지속피해·확산 | 행동 시작 시 `maxHp*3%` 피해. 25% 확률로 인접 같은 편에 전염 | 4턴 | 무 |
| `burn` | 화상 | 지속피해·약화 | 행동 시작 시 `matk(부여자)*0.6` 화염 피해 + `atk 15%↓` | 3턴 | 불꽃 |
| `paralysis` | 마비 | 행동제약 | 행동 시 35% 확률 턴 상실, `spd 20%↓` | 3턴 | 얼음 |
| `sleep` | 수면 | 행동불가 | 행동 불가. **피격 시 즉시 해제** | 2턴 | 대지 |
| `silence` | 침묵 | 행동제약 | 스킬 사용 불가 (기본공격·아이템만) | 3턴 | 무 |
| `blind` | 실명 | 명중저하 | 기본공격·스킬 명중률 `0.5×` | 3턴 | 무 |
| `slow` | 감속 | ATB | ATB 충전 `0.6×`, 회피율 0 | 4턴 | 얼음 |
| `weaken` | 약화 | 전스탯저하 | `atk/def/matk/mdef 20%↓` | 3턴 | 대지 |

### 5.1 저항 / 해제

- 부여 시 성공률: `baseChance * (1 - 대상 luck*0.01)` (하한 0.1).
- 중첩: 같은 id 재부여 시 **지속 갱신**(최댓값), 수치 스택 없음.
- 해제 수단: `해독제`(전체), `정화` 스킬(무속성), 수면=피격, 사망/승리 시 전체 소멸.
- `버프`(방어/가속/철벽 등)는 별도 `Buff` 목록으로 관리(같은 구조, `turnsLeft`).

---

## 6. 펫 (Pet)

원작: 최대 2마리 동반, 호감도, 스킬 훈련.

### 6.1 구조

```ts
interface PetDef {
  id: string
  name: string           // 기본 이름 (개명 가능)
  species: string        // 종
  element: Element | 'neutral'
  icon: string
  baseStats: Stats       // Lv.1 기준
  growth: Partial<Stats> // 레벨당
  innateSkills: string[]  // 처음부터 보유
  trainableSkills: { skillId: string; minLevel: number; costGold: number; costItemId?: string }[]
  rarity: 'common' | 'rare' | 'special'
}

interface Pet {           // 인스턴스
  defId: string
  nickname: string
  level: number
  exp: number
  affection: number       // 0~100
  learnedSkills: string[]
  hp: number; mp: number
}
```

### 6.2 호감도 (affection 0~100)

| 구간 | 등급 | 효과 |
|---|---|---|
| 0–19 | 낯섦 | 전투 참여만. 가끔(10%) 명령 무시(턴 낭비) |
| 20–49 | 익숙 | 정상 참여 |
| 50–74 | 친밀 | 전 스탯 `+5%`, 치명타율 `+5%` |
| 75–100 | 헌신 | 전 스탯 `+12%`, 25% 확률로 플레이어 행동 턴에 **추가 지원 공격** |

- 증가: 전투 승리 +2, 먹이 아이템 사용 +5~15, 함께 전직 이벤트 +10.
- 감소: 펫 전투불능 -8, 장시간 미출전(세션 기준 생략 가능) -.

### 6.3 스킬 훈련

- `trainableSkills` 항목은 **펫 레벨 조건 + 골드(+선택적 훈련서 아이템)** 소모로 학습.
- 학습은 마을의 **조련사 NPC**(신규)에서 수행.
- 펫 스킬 슬롯 최대 4. 초과 시 교체.

### 6.4 펫 도감 (8종, 속성별 2 + 무 2)

| id | 이름 | 종 | 속성 | 희귀도 | 고유스킬 | 훈련스킬(예) |
|---|---|---|---|---|---|---|
| `pet-emberling` | 이글릿 | 불도마뱀 | 불꽃 | common | `pet-scratch` | `pet-fire-breath`, `pet-guard` |
| `pet-magma-pup` | 마그누 | 용암 강아지 | 불꽃 | rare | `pet-bite` | `pet-burn-fang`, `pet-roar-atk` |
| `pet-frostkit` | 서리 | 눈여우 | 얼음 | common | `pet-scratch` | `pet-frost-nip`, `pet-slow-howl` |
| `pet-glacier-owl` | 서리깃 | 빙하 올빼미 | 얼음 | rare | `pet-peck` | `pet-ice-shard`, `pet-mp-song` |
| `pet-pebblemole` | 모구 | 돌두더지 | 대지 | common | `pet-headbutt` | `pet-stone-skin`, `pet-taunt` |
| `pet-golem-cub` | 바우 | 꼬마 골렘 | 대지 | rare | `pet-slam` | `pet-quake-stomp`, `pet-shield-ally` |
| `pet-wisp` | 하양 | 빛 정령 | 무 | special | `pet-glow` | `pet-heal-lite`, `pet-cleanse` |
| `pet-shade` | 그늘 | 그림자 고양이 | 무 | special | `pet-shadow-claw` | `pet-silence-hiss`, `pet-blind-dust` |

> 종/이름은 원작 그래픽 자료 부재로 오리지널 플레이스홀더. SVG 아이콘도 코드 생성.

---

## 7. 스킬 (Skill)

### 7.1 구조

```ts
interface Skill {
  id: string
  name: string
  element: Element | 'neutral'
  jobTier: JobTierId          // 이 단계부터 사용
  levelRequired: number
  mpCost: number
  atbCost?: number            // 사용 후 추가 ATB 차감 (궁극기)
  power: number               // 위력 배율
  kind: 'attack' | 'heal' | 'buff' | 'debuff' | 'utility'
  physical?: boolean          // true면 atk/def 기반, 기본 false(마법)
  targeting: 'singleEnemy' | 'allEnemies' | 'singleAlly' | 'allAllies' | 'self'
  status?: { id: StatusId; chance: number; turns?: number }   // 부여 상태이상
  cleanse?: boolean           // 상태이상 해제
  reviveHpRatio?: number
  icon: string
  description: string
}
```

### 7.2 속성 스킬 (3속성 × 5전직, 각 2~3개 ≈ 42개)

명명 규칙 id: `<element>-t<tier>-<n>` (예 `fire-t1-1`).

#### 불꽃 (fire) — 공격·화상·출혈 특화

| tier | 스킬 | 위력 | kind | 대상 | 상태이상 | MP |
|---|---|---|---|---|---|---|
| 1 견습 | 불씨 던지기 | 1.0 | attack | 단일 | 화상 20% | 4 |
| 1 견습 | 온기 | 0.8 | heal(self) | 자신 | — | 5 |
| 2 초보 | 화염 강타 | 1.5 | attack | 단일 | 화상 35% | 8 |
| 2 초보 | 불의 채찍 | 1.2 | attack | 단일 | 출혈 30% | 7 |
| 3 숙련 | 불의 고리 | 1.6 | attack | 전체 | 화상 25% | 12 |
| 3 숙련 | 발화 | 0.0 | debuff | 전체 | 화상 60% | 10 |
| 4 마도사 | 폭염 폭발 | 2.3 | attack | 전체 | 화상 40% | 16 |
| 4 마도사 | 인페르노 낙인 | 1.8 | attack | 단일 | 출혈 50% + 화상 50% | 15 |
| 5 대마도사 | 멸화의 심판 | 3.3 | attack | 전체 | 화상 50% | 24 (atbCost 30) |

#### 얼음 (ice) — 제어·감속·마비 특화

| tier | 스킬 | 위력 | kind | 대상 | 상태이상 | MP |
|---|---|---|---|---|---|---|
| 1 견습 | 서리 화살 | 1.0 | attack | 단일 | 감속 25% | 4 |
| 1 견습 | 얼음 방패 | 0.0 | buff(def↑) | 자신 | — | 5 |
| 2 초보 | 냉기 파동 | 1.4 | attack | 단일 | 감속 40% | 8 |
| 2 초보 | 빙결 손아귀 | 1.1 | attack | 단일 | 마비 30% | 8 |
| 3 숙련 | 눈보라 | 1.5 | attack | 전체 | 감속 35% | 12 |
| 3 숙련 | 절대영도 | 1.0 | debuff | 단일 | 마비 70% | 12 |
| 4 마도사 | 블리자드 | 2.2 | attack | 전체 | 감속 50% | 16 |
| 4 마도사 | 빙하기 | 1.6 | attack | 전체 | 마비 40% | 17 |
| 5 대마도사 | 영겁의 빙옥 | 3.0 | attack | 전체 | 마비 50% + 감속 50% | 24 (atbCost 30) |

#### 대지 (earth) — 방어·약화·수면 특화

| tier | 스킬 | 위력 | kind | 대상 | 상태이상 | MP |
|---|---|---|---|---|---|---|
| 1 견습 | 돌팔매 | 1.0 | attack(phys) | 단일 | — | 3 |
| 1 견습 | 단단한 살갗 | 0.0 | buff(def↑) | 자신 | — | 5 |
| 2 초보 | 대지 강타 | 1.4 | attack | 단일 | 약화 30% | 8 |
| 2 초보 | 모래 수렁 | 0.6 | debuff | 단일 | 감속 50% + 약화 20% | 7 |
| 3 숙련 | 철벽 방어 | 0.0 | buff(def↑ 전체) | 아군전체 | — | 10 |
| 3 숙련 | 최면 가루 | 0.0 | debuff | 단일 | 수면 65% | 9 |
| 4 마도사 | 지진 | 2.2 | attack | 전체 | 약화 40% | 16 |
| 4 마도사 | 석화의 시선 | 1.2 | attack | 단일 | 마비 55% + 약화 40% | 16 |
| 5 대마도사 | 대지의 분노 | 3.2 | attack | 전체 | 약화 50% | 24 (atbCost 30) |

### 7.3 무속성 공용 스킬 (전 캐릭터, 전직 무관 — ≈6)

| id | 이름 | kind | 효과 | MP | 습득 |
|---|---|---|---|---|---|
| `n-focus` | 정신 집중 | utility | 자신 MP `matk*1.0` 회복, ATB `-20` | 0 | Lv.1 |
| `n-firstaid` | 응급 처치 | heal | 아군 단일 HP `matk*1.2` 회복 | 6 | Lv.1 |
| `n-purify` | 정화 | utility | 아군 단일 상태이상 전체 해제 | 8 | Lv.10 |
| `n-rally` | 전열 정비 | buff | 아군 전체 atk/matk `+15%` 3턴 | 12 | Lv.20 |
| `n-laststand` | 배수의 진 | buff | 자신 피해 `+30%`, 받는 피해 `+15%` 3턴 | 10 | Lv.20 |
| `n-revive` | 소생의 빛 | heal | 전투불능 아군 1인 HP 50%로 부활 | 20 | Lv.30 |

### 7.4 펫 스킬 (≈14)

`pet-*` 프리픽스. 기본형(scratch/bite/peck/headbutt/slam/glow/shadow-claw) + 훈련형
(fire-breath/burn-fang/frost-nip/slow-howl/ice-shard/mp-song/stone-skin/taunt/quake-stomp/
shield-ally/heal-lite/cleanse/silence-hiss/blind-dust/roar-atk). 위력 0.7~1.4, MP 0~10.

---

## 8. 몬스터 (Monster)

### 8.1 구조

```ts
interface MonsterDef {
  id: string
  name: string
  level: number
  icon: string
  element: Element | 'neutral'
  family: 'beast' | 'plant' | 'aquatic' | 'undead' | 'darkmage' | 'construct' | 'test'
  stats: Stats
  skills: string[]
  traits?: ('aggressive' | 'caster' | 'tank' | 'swift' | 'splitOnDeath')[]
  expReward: number
  goldReward: number
  dropTable?: { itemId: string; chance: number }[]
  zoneKinds: ZoneKind[]
  isTestMonster?: boolean
}
```

몬스터 스탯: `computeStatsForLevel` 기반 배율 `{ hp 0.7, atk 0.8, def 0.7, matk 0.6, mdef 0.6, spd 0.9, luck 0.6 }`,
`traits`에 따라 tank(+def, +hp), caster(+matk, skills), swift(+spd) 가산.

### 8.2 카탈로그 (≈24)

| id | 이름 | Lv | 속성 | family | 구역 | 특성 | 비고 |
|---|---|---|---|---|---|---|---|
| `mon-forest-raccoon` | 숲너구리 | 2 | 대지 | beast | 숲 | — | |
| `mon-thorn-vine` | 가시덩굴 | 3 | 대지 | plant | 숲 | tank | |
| `mon-sprite-green` | 초록 요정 | 4 | 무 | beast | 숲 | swift | 회피↑ |
| `mon-grey-wolf` | 회색 늑대 | 5 | 얼음 | beast | 숲 | aggressive | |
| `mon-mush-cap` | 독버섯 갓 | 6 | 대지 | plant | 숲 | caster | 최면 가루 |
| `mon-bark-golem` | 나무 골렘 | 8 | 대지 | construct | 숲 | tank | |
| `mon-bubble-spirit` | 물거품 정령 | 2 | 얼음 | aquatic | 해안 | — | |
| `mon-crab-soldier` | 게 껍질병정 | 3 | 얼음 | aquatic | 해안 | tank | |
| `mon-shallows-eel` | 얕은여울 뱀장어 | 5 | 얼음 | aquatic | 해안 | swift | |
| `mon-siren-larva` | 세이렌 유충 | 7 | 무 | aquatic | 해안 | caster | 침묵 |
| `mon-reef-turtle` | 암초 거북 | 9 | 얼음 | aquatic | 해안 | tank | |
| `mon-tide-elemental` | 밀물 정령 | 11 | 얼음 | aquatic | 해안 | caster | 냉기 파동 |
| `mon-ember-imp` | 잉걸 임프 | 10 | 불꽃 | beast | 폐허 | aggressive | 화상 |
| `mon-ash-hound` | 잿빛 사냥개 | 12 | 불꽃 | beast | 폐허 | swift | |
| `mon-bone-archer` | 해골 궁수 | 13 | 무 | undead | 폐허 | caster | 출혈 |
| `mon-cursed-armor` | 저주받은 갑주 | 15 | 대지 | construct | 폐허 | tank | |
| `mon-wraith` | 원귀 | 17 | 무 | undead | 폐허 | caster | 실명 |
| `mon-dark-acolyte` | 어둠의 수련생 | 18 | 불꽃 | darkmage | 폐허 | caster | 아즈카 추종자 |
| `mon-flame-warden` | 화염 파수꾼 | 20 | 불꽃 | construct | 폐허 | tank | 미니보스급 |
| `mon-frost-revenant` | 서리 망령 | 22 | 얼음 | undead | 폐허 | caster | 감속·마비 |
| `mon-dark-mage` | 흑마법사 | 25 | 무 | darkmage | 폐허 | caster | 다속성 |
| `mon-stone-titan` | 석상 거인 | 28 | 대지 | construct | 폐허 | tank | 지진 |
| `mon-azka-herald` | 아즈카의 전령 | 32 | 불꽃 | darkmage | 폐허 | caster | 보스급, splitOnDeath 없음 |
| `mon-training-dummy` | 훈련용 허수아비 | 1 | 무 | test | 숲·해안 | — | 10킬=1렙 |

### 8.3 필드 배치

`lib/field.ts` 유지: 몬스터 구역 셀당 밀도 5, 결정론적 시드. `testMode` 시 각 셀에 허수아비 1.
폐허 구역 신규 추가(§9).

---

## 9. 맵 / 구역 (Zone)

원작에 확정 맵 자료가 없어 프로토타입의 10×10 그리드(셀=200m, 2km²)를 유지하되 원작 톤으로 재명명.
스토리 미션은 제외하고 **구역·NPC·필드 전투**만 배치.

| id | kind | 이름 | 셀 범위 | 몬스터 | 설명 |
|---|---|---|---|---|---|
| `zone-school` | `school` | 아르피아 마법학교 | (0,0)–(3,3) | ✕ | 전직 NPC, 사서. 시작 지점 |
| `zone-shop` | `shopStreet` | 별빛 상점가 | (7,0)–(10,3) | ✕ | 무기·물약·도구 상인, 조련사 |
| `zone-plaza` | `colosseum` | 수련의 광장 | (4,4)–(6,6) | ✕ | 콜로세움(대전=추후) |
| `zone-dorm` | `village` | 기숙사 마을 | (0,3)–(3,7) | ✕ | 촌장, 하우징(추후) |
| `zone-research` | `military` | 마법 연구동 | (7,3)–(10,7) | ✕ | 경비대장 |
| `zone-forest` | `forest` | 위습 숲 | (0,7)–(5,10) | ✓ | Lv 2–8 |
| `zone-sea` | `sea` | 가나폴리 해안 | (5,7)–(8,10) | ✓ | Lv 2–11 |
| `zone-ruins` | `ruins`(신규) | 아즈카의 폐허 | (8,7)–(10,10) | ✓ | Lv 10–32, 언데드·흑마법사 |

> `ZoneKind`에 `'ruins'` 추가. 폐허는 레벨 제한 안내(권장 Lv.10+) 표시.

### 9.1 NPC (≈9)

| id | 이름 | 역할 | 구역 |
|---|---|---|---|
| `npc-job-trainer` | 미르엘 교수 | 전직 | 마법학교 |
| `npc-librarian` | 사서 오웬 | 플레이버 | 마법학교 |
| `npc-weapon` | 대장장이 반 | 무기상 | 상점가 |
| `npc-potion` | 약사 셀린 | 물약상 | 상점가 |
| `npc-tool` | 만물상 토비 | 도구상 | 상점가 |
| `npc-tamer` | 조련사 리코 | **펫 스킬 훈련·먹이 판매** | 상점가 |
| `npc-elder` | 촌장 헬가 | 하우징(추후) | 기숙사 마을 |
| `npc-arena` | 투기장장 그로먼 | 대전(추후) | 수련의 광장 |
| `npc-guard` | 경비대장 로한 | 플레이버/폐허 경고 | 마법 연구동 |

---

## 10. 아이템 (Item)

### 10.1 무기 — 속성 완드 (3속성 × 5전직 = 15)

id `wand-<element>-t<tier>`. `statBonus` 대략:

| tier | atk | matk | 요구전직 | 가격 |
|---|---|---|---|---|
| 1 | 3 | 6 | — | 300 |
| 2 | 6 | 12 | novice | 1,000 |
| 3 | 10 | 20 | adept | 2,600 |
| 4 | 15 | 30 | magus | 5,400 |
| 5 | 22 | 44 | archmagus | 11,000 |

속성 완드는 착용 시 해당 속성 스킬 위력 `+8%` (동일 속성 시너지).

### 10.2 방어구

- 로브 5단계 `robe-t1..t5`: `def/mdef` 3/6/10/16/26, `maxHp` 0/10/20/32/50, 요구전직 순차.
- 모자 3종 `hat-cloth/hat-pointed/hat-arch`: `mdef` + `maxMp`.

### 10.3 장신구 (≈6)

| id | 이름 | 효과 |
|---|---|---|
| `acc-ring-luck` | 행운의 반지 | `luck +5` |
| `acc-amulet-mana` | 마나의 목걸이 | `maxMp +20` |
| `acc-brooch-guard` | 수호의 브로치 | `def +4, mdef +4` |
| `acc-band-swift` | 신속의 팔찌 | `spd +4` (ATB↑) |
| `acc-charm-ward` | 방호 부적 | 상태이상 저항 `+15%` |
| `acc-pendant-vitality` | 활력의 펜던트 | `maxHp +40` |

### 10.4 소모품 (≈12)

| id | 이름 | 효과 |
|---|---|---|
| `potion-hp-s/m/l` | 체력 물약 소/중/대 | HP 40 / 120 / 320 |
| `potion-mp-s/m` | 마나 물약 소/중 | MP 30 / 80 |
| `potion-elixir` | 엘릭서 | HP·MP 완전 회복 |
| `tool-escape` | 탈출의 주문서 | 전투 확정 이탈 |
| `tool-antidote` | 해독제 | 상태이상 전체 치료 |
| `tool-revive-feather` | 부활의 깃털 | 전투불능 아군 HP 50% 부활 |
| `tool-haste-sand` | 가속의 모래 | 대상 ATB 즉시 `+50` |
| `feed-*` | 펫 먹이(속성별) | 펫 호감도 `+5~15` |

### 10.5 드롭

몬스터 `dropTable`: 소모품·먹이·하급 장비 위주. 보스급(`mon-azka-herald`)은 4tier 완드 낮은 확률.

---

## 11. 구현 매핑 (arpia 코드베이스)

| 파일 | 변경 |
|---|---|
| `lib/types.ts` | Element 4→3, JobTierId 이름 정설화, `atb`/`baseSpd` 추가, `Skill.status`/`atbCost`/`utility`, `PetDef`/`Pet` 개편, `ZoneKind` += `ruins`, `StatusEffect` id 9종 |
| `lib/constants.ts` | `ELEMENT_META` 3속성, `JOB_TIERS` 레벨 1/10/20/30/40, lean 재조정, `ZONES` 재명명 + 폐허 |
| `lib/status-effects.ts` | **신규** — 9종 정의 + 적용 로직 |
| `lib/battle-engine.ts` | turnOrder → **ATB 루프**, 상태이상 훅 호출, 명중/회피, 펫 호감도 보정 |
| `lib/mock-data.ts` | SKILLS 42+6+14, MONSTERS 24, ITEMS 40+, NPCS 9 (조련사 추가) |
| `lib/pets.ts` | **신규** — PET_DEFS 8종, 호감도/훈련 로직 |
| `lib/player-factory.ts` | 3속성 펫 매핑 제거 → PET_DEFS 참조, 파티에 펫 최대 2 |
| `lib/field.ts` | 폐허 구역 반영 |
| `lib/game-state.tsx` | 파티(hero + pet[0..1]), 훈련 액션, ATB tick 액션 |
| `components/game/*` | create-screen 3속성, battle-screen ATB 바, party-screen 2펫, 신규 tamer 화면 |
| `public/images/` + `scripts/gen-icons.py` | 3속성 아이콘, 폐허/언데드/흑마법사/펫 8종 SVG 재생성 |

---

## 12. 범위 밖 (명시적 제외)

- 스토리, 메인 미션 102화, 대사/컷신, 세계관 서사
- 콜로세움 대전 실제 로직, 하우징 실제 로직 (자리만 유지)
- 사운드 에셋, 최종 아트(스프라이트/타일)
- 실 서버·계정·결제

---

_작성: yellowm-ad · 원작 시스템 출처: 나무위키 「마법학교 아르피아」 · 원작 IP: 엔씨소프트/제이인터랙티브_
