# PixelLab 작업 계획 — 방향별 걷기 + 지역 프롭/타일

> 작성 2026-09-02. `~/.claude.json` 이 프로젝트 항목에 `pixellab` MCP 서버를 추가함.
> **Claude Code 재시작해야 `mcp__pixellab__*` 도구가 로드됨.** 재시작 후 이 파일대로 진행.

---

## A. 방향별 걷기 애니메이션 (최우선) — ✅ 완료 (2026-09-02)

- 6종 각각 PixelLab v3로 `east` + `north` 걷기 8프레임 생성(기존 `Walking` 그룹에 추가). 12 generations 소모.
- `scripts/_pixellab/fetch-hero-spritesheets.sh` 신설 → 6종 스프라이트시트 zip 자동 다운로드/해제.
- `scripts/build-hero-sheets.mjs` → 8열 × **4행**(704×352)으로 확장. JSON `rows` 파싱, 9프레임(레퍼런스 포함) 행은 첫 프레임 스킵. 스테일한 `Walking_2` 그룹은 이름 필터로 제외.
- `components/game/pixel-hero.tsx` → `SHEET_ROWS=4`, `SIDE_WALK` 흔들기 제거, `WALK_ROW` 매핑(`down→1 / right→2 / left→2+scaleX(-1) / up→3`).
- `npm run build` 통과. `public/images/sprites/README.md` 갱신.

### (원본) 현재 상태 / 문제
- 6종 시트(`public/images/sprites/hero-<el>-<gender>.png`)는 **정면(south) 걷기 8프레임만** 있음
  (`<hero>/Chibi_..._Idle.json` → `row 1: type "animation", animation "Walking", direction "south"`).
- 그래서 **아래 방향키만** 다리가 제대로 움직임.
- 좌·우·위는 `components/game/pixel-hero.tsx`의 `SIDE_WALK`가 **8방향 정지 회전 포즈**를
  번갈아 보여주고 ±2px 바운스로 "가짜 걷기" → 다리 고정, 몸통만 방정맞게 흔들림.

### 목표
6종 각각 **east 걷기 + north 걷기** 8프레임 생성. (west = east 좌우 반전)
→ 정면/후면/좌/우 4방향 실제 걷기.

### 캐릭터 (PixelLab character id + 원본 프롬프트)
| hero | character id | 비고 |
|---|---|---|
| fire-male | `62522008-42ca-4a1d-a802-e698b26a9a60` | 살몬핑크→크림슨 머리, 하이포니테일, 검정 그레이트코트+크림슨 파이핑 |
| fire-female | `d4d14b7f-007e-4176-9884-7e9b987d6707` | 살몬핑크→크림슨 단발밥, 플레어 스커트 |
| ice-male | `a9b48a80-d2d2-47c0-827d-590009fc2294` | 실버화이트+아이스블루, 둥근 안경, 아이보리 코트+네이비 |
| ice-female | `e747f40f-148e-4d8d-b97e-a15ea9882726` | 실버화이트 단발밥, 둥근 안경, 아이보리 드레스코트 |
| earth-male | `78bae28b-7836-40c4-8584-cc958851201e` | 플래티넘블론드 스파이크, 태닝, 다크그린블랙 코트+골드 |
| earth-female | `7d4b3b99-507a-4f6d-a856-aed1c7ee568d` | 플래티넘블론드 하이포니테일, 오프숄더 블랙 드레스+골드 |

공통 사양: 64×64, 8-direction, view `low top-down`, "Crisp pixel art, bold dark outline, flat cel shading".

### 순서
1. `mcp__pixellab__*` 도구 목록 확인 (애니메이션 생성/기존 캐릭터에 애니메이션 추가 계열).
2. 각 캐릭터에 `Walking` 애니메이션을 **east**, **north** 방향으로 생성 (프레임 8, south와 동일 스타일).
   - south 걷기와 톤/실루엣 일관성 유지가 핵심.
3. 결과 PNG를 `scripts/_pixellab/<hero>/` 에 방향 접미사로 저장:
   `Chibi_..._Walk-east.png` / `Chibi_..._Walk-north.png` (+ json).
4. `scripts/build-hero-sheets.mjs` 확장:
   - 현재: 88px 셀, 8열 × **2행** (row0=회전8, row1=south걷기8).
   - 변경: **4행**으로. row2 = east 걷기 8, row3 = north 걷기 8.
   - `sheet_size` height 176 → 352. `SHEET_ROWS` 상수 등 갱신.
5. `components/game/pixel-hero.tsx` 수정:
   - `SHEET_ROWS = 4`.
   - `SIDE_WALK` 회전-흔들기 로직 제거.
   - 걷기 매핑: `down→row1`, `right→row2`, `left→row2 + scaleX(-1)`, `up→row3`. 각 8프레임.
   - 정지(비걷기)는 기존대로 row0 회전 컬럼(`DIR_COL`).
   - `left` 반전은 컨테이너 `transform: scaleX(-1)` (bob transform과 합성 주의).
6. `npm run build` (정적 export) 후 `world-screen`/`iso-world`에서 4방향 육안 확인.
7. `public/images/sprites/README.md` "현재 상태" 갱신.

### 폴백 (PixelLab east/north 생성이 품질 미달일 때)
`SvgHero`(pixel-hero.tsx 내 절차적 스프라이트)는 이미 다리/팔 스윙 프레임이 있음.
좌·우·위만 `sheetOk`여도 `SvgHero`로 렌더하는 하이브리드도 가능하나 몸통 아트가 달라 이질감.
우선 PixelLab 우선, 안 되면 사용자와 상의.

---

## B. 지역 프롭/타일 초안 (핵심 지역 먼저)

### 진행 (2026-09-02) — forest 슬라이스 완료 (미검증: 인게임 육안)
- 걷기 방정맞음 완화: `sprite-walk` 진폭 2px→1px, CSS 0.3s→0.5s, 프레임 간격 95ms→115ms (`pixel-hero.tsx` / `iso-world.tsx` / `iso-sprites.tsx` / `globals.css`).
- 에르디아 숲 프롭 6종 PixelLab 생성(`create_image_pixflux`, 투명): `f_forest_tree/bush/rock/mushroom/log/firefly.png` → `public/images/map/props/`. 7 generations 소모(덤불 1회 리롤).
- 지면: 신규 타일셋 없이 기존 `grass`/`grass-dark`/`dirt` 재사용 + `zoneBg('forest')`에 흙 패치 dab 추가.
- 렌더: forest 는 iso 가 아니라 쿼터뷰 경로 → `world-screen.tsx`에 `FieldProp` 빌보드 컴포넌트 신설, gradient 분기에서 `map.props` 를 x+y 정렬해 렌더. `lib/maps.ts`에 `FOREST_PROPS`(PropDef[], sprite/px/anchor) + `forest.props` 지정.
- `npx tsc --noEmit` + `npm run build` 통과. **인게임 육안 확인 미완** (브라우저 자동조작으로 지속 이동 입력이 안 돼 숲 화면 도달 실패). 사용자가 게임에서 숲 진입해 확인 필요.

### 걷기 흔들림 2차 완화 (2026-09-02, 사용자 피드백: 아래는 괜찮은데 위/좌/우가 심함)
- 원인: PixelLab 이 방향별로 **따로** 생성한 east/north 8프레임이 머리 높이(bbox top)·좌우 중심(bbox cx)이
  프레임마다 ±1~4px 씩 미묘하게 어긋나 있었음(south 는 원래 있던 걷기라 상대적으로 안정). west 는 east 를
  반전한 것이라 같은 흔들림이 그대로 옮음 → "아래만 괜찮고 위/좌/우가 심하다"는 증상과 일치.
- 해결: `scripts/build-hero-sheets.mjs` 에 프레임 안정화 단계 추가 — 각 걷기 행(south/east/north)의
  8프레임에서 불투명 픽셀 bbox 의 top·cx 를 구해 행의 중앙값에 맞춰 프레임별로 최대 ±6px 재정렬
  (다리 스텝은 그대로, 몸통 흔들림만 제거). 6종 전부 재빌드, `npm run build` 통과.

### volcano 슬라이스 (2026-09-02)
- 참고조사: 크롬으로 구글 이미지 검색("volcanic biome pixel art RPG tileset obsidian lava rocks") →
  매트 블랙 흑요석 + 옅은 청보라 하이라이트 + 주황 발광 균열 팔레트 확인, 프롬프트에 반영.
- 프롭 6종 생성(`create_image_pixflux`, 투명, 6 generations): `f_volcano_spire/vent/rock/sulfur/deadtree/ashmound.png`.
- `lib/maps.ts`: `FIELD_SPRITES`/`fprop()` 를 forest 전용에서 biome-제네릭으로 리팩터, `VOLCANO_PROPS`(24개)
  추가 후 `volcano.props` 지정. forest 와 동일 배치 골격(가장자리 큰 실루엣 + 안쪽 산개) 재사용.
- 지면: 신규 타일 없이 기존 `zoneBg('volcano')` 그라디언트 그대로 사용(이미 용암 균열 표현 있음).
- `npx tsc --noEmit` + `npm run build` 통과. **인게임 육안 확인 미완** (forest 와 동일 사유).
- 다음: 확인 OK 면 snowfield → swamp 동일 패턴. blocker(충돌) 는 forest/volcano 모두 현재 미설정.


### 현재 상태
- 마을(`village`)만 아이소 프롭 시스템 사용: `public/images/map/props/b_*.png` + 자연물
  (`tree_green_*.png`, `bush.png`, `lamp.png` 등). `lib/maps.ts`의 `villageProps()`가 배치.
- **야생/전투 필드 맵은 프롭 없음.** `components/game/world-screen.tsx`의 `zoneBg(map.bg)`가
  CSS 그라디언트로만 배경 표현. `map.bgImage` 필드가 있으면 배경 이미지로 렌더(현재 미사용).

### 접근
필드 맵에 **바이옴별 아이소 프롭 세트 + 지면 타일**을 추가. 마을 프롭과 동일 규격/시점
(low top-down 아이소, PNG, 투명 배경). `lib/field.ts` 또는 `maps.ts`에 필드 프롭 배치 함수 신설.

### 핵심 지역 4곳 (권장 레벨 순, 먼저 작업)
1. **에르디아 숲 `forest`** (Lv2) — 첫 사냥터. 프롭: 뒤틀린 큰나무, 덤불, 이끼 바위, 버섯 무리,
   쓰러진 통나무, 반딧불 표식. 지면: 풀+흙 패치.
2. **화산지대 `volcano`** (Lv20) — 게이트 최상위. 프롭: 흑요석 스파이어, 균열 용암 분출구,
   식은 용암 바위, 유황 결정, 불탄 고목. 지면: 검은 현무암 + 용암 균열.
3. **루미나 설원 `snowfield`** (Lv15) — 프롭: 얼음 스파이크, 서리 맞은 침엽수, 눈더미,
   빙정 크리스탈, 얼어붙은 표석. 지면: 눈밭 + 서리.
4. **안개 늪지 `swamp`** (Lv5) — 프롭: 맹그로브 뿌리, 늪 그루터기, 독버섯, 갈대 다발,
   가라앉은 비석, 안개 웅덩이. 지면: 진흙+물웅덩이.

각 지역 세트 = 프롭 5~7종 + 지면 타일 1~2종. PixelLab tileset/프롭 계열 도구로 반복 생성,
`public/images/map/props/` 에 접두사(`f_forest_*`, `f_volcano_*` …)로 저장.

### 참고 자산 (프로젝트 루트)
`불/얼음/흙 삼면도.png`, `불/얼음/흙.png`, `전투맵 참고 자료.png`, `맵 고도화 예시.jpg`,
`기본 마을 맵.png` — 팔레트/톤 레퍼런스로 사용.

### 순서
1. A 작업 완료 후 착수.
2. `forest`부터 프롭 5~7종 생성 → `world-screen.tsx`/`iso-world.tsx`에 필드 프롭 렌더 경로 추가
   (마을 프롭 렌더 로직 재사용) → 1개 지역 end-to-end 확인.
3. 되면 volcano → snowfield → swamp 순으로 반복.
4. 나머지 지역(동굴/폐광산/심해/폐허/묘지/신전/오로라/마물마을/모르스의 성)은 이후.

---

## 제약 (기록)
- GPT/Gemini 호출 도구 없음. 외부 이미지 생성 도구 없음. → 래스터 도트는 **PixelLab 경유만** 가능.
- PixelLab 크레딧 소모 작업. 대량 생성 전 사용자 확인.
