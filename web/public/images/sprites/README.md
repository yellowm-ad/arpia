# 주인공 도트 스프라이트 시트 (PixelLab 생성)

`components/game/pixel-hero.tsx`의 `HeroSprite`가 여기 있는 시트를 자동으로 사용합니다.
파일이 없으면 절차적 SVG 스프라이트로 폴백합니다.

## 파일

```
hero-fire-male.png     hero-fire-female.png
hero-ice-male.png      hero-ice-female.png
hero-earth-male.png    hero-earth-female.png
```

각 삼면도(`불/얼음/흙 삼면도.png`) 팔레트를 반영해 PixelLab v3(Low Top-Down, 64px)로 생성.

## 레이아웃 (통일)

- **88px 셀 · 8열 × 2행** (704 × 176)
- **row 0** = 8방향 회전: `south, south-east, east, north-east, north, north-west, west, south-west`
- **row 1** = `south`(정면) 걷기 8프레임

`HeroSprite`의 4방향 매핑: `down→col0`, `right→col2`, `up→col4`, `left→col6` (row 0).
정면 이동 시 row 1 8프레임 사이클, 그 외 방향 이동 시 회전 프레임 + 상하 바운스.

## 현재 상태 (2026-09-01)

- **6종 전부** PixelLab에서 실제 정면(south) 걷기 애니메이션 생성 완료 — row 1 = 진짜 8프레임 걷기.
- 좌/우/뒤 방향 걷기는 PixelLab이 자동 생성하지 않으므로, 회전 프레임 + 상하 바운스로 표현.
  필요하면 PixelLab 각 캐릭터 애니메이션에서 방향별로 개별 생성 후 재빌드.

## 재빌드

PixelLab에서 각 캐릭터 Export → "Spritesheet (PNG + JSON)" → zip 해제 →
`scripts/_pixellab/<hero-name>/` 에 배치 후:

```
node scripts/build-hero-sheets.mjs
```
