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

- **88px 셀 · 8열 × 4행** (704 × 352)
- **row 0** = 8방향 회전: `south, south-east, east, north-east, north, north-west, west, south-west`
- **row 1** = `south`(정면) 걷기 8프레임
- **row 2** = `east`(우) 걷기 8프레임 — `west`(좌)는 `HeroSprite`가 이 행을 좌우 반전
- **row 3** = `north`(후면) 걷기 8프레임

`HeroSprite` 매핑: 정지 시 `down→col0 / right→col2 / up→col4 / left→col6` (row 0).
이동 시 `down→row1 / right→row2 / left→row2+scaleX(-1) / up→row3`, 각 8프레임 순환.

## 현재 상태 (2026-09-02)

- **6종 전부** PixelLab v3에서 `south`·`east`·`north` 걷기 8프레임 생성 완료 → 4방향 실제 걷기.
- `west`(좌) 걷기는 `east` 행을 CSS `scaleX(-1)`로 반전해 사용(별도 생성 안 함).
- 대각 이동은 가장 가까운 카디널 걷기로 표시(게임 입력이 4방향).

## 재빌드

각 캐릭터에 `Walking` 애니메이션(south/east/north) 이 있는 상태에서:

```
bash scripts/_pixellab/fetch-hero-spritesheets.sh   # PixelLab에서 6종 시트 zip 내려받아 _pixellab/ 에 해제
node scripts/build-hero-sheets.mjs                  # public/images/sprites/hero-*.png 생성
```

수동 경로: PixelLab에서 각 캐릭터 Export → "Spritesheet (PNG + JSON)" → zip 해제 →
`scripts/_pixellab/<hero-name>/` 에 배치 후 `node scripts/build-hero-sheets.mjs`.
