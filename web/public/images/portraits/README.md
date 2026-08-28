# 주인공 초상화

게임은 다음 순서로 초상화를 찾는다:

1. `hero-<속성>-<성별>.png` — 개별 파일 (예: hero-fire-male.png). 있으면 그대로 사용.
2. `hero-<속성>.png` — 남/여가 좌·우로 합쳐진 1장. object-position 으로 반쪽을 잘라 씀.
3. 없으면 코드로 그린 벡터 초상화(HeroSvg).

속성: fire / ice / earth · 성별: male(왼쪽) / female(오른쪽)

현재: hero-fire.png, hero-ice.png (합본) 사용 중. earth 는 벡터.
합본 프레이밍이 어긋나면 components/game/portrait.tsx 의 FRAME 값(objectPosition) 조정.
