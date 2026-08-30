# 주인공 초상화

게임은 다음 순서로 초상화를 찾는다:

1. `hero-<속성>-<성별>.png` — 개별 파일 (예: hero-fire-male.png). 있으면 그대로 사용.
2. 없으면 코드로 그린 벡터 초상화(HeroSvg).

속성: fire / ice / earth · 성별: male(왼쪽) / female(오른쪽)

현재: fire / ice / earth 3속성 모두 사용자 일러스트를 사용 중.
원본은 `남(좌) + 여(우)` 합본 1장이며, scripts 의 split 로 좌·우 절반씩 잘라
`hero-<속성>-<성별>.png` 4쌍을 생성한다.

프레이밍이 어긋나면 `components/game/portrait.tsx` 의 `HeroPortrait` 안
`objectPosition` 값(현재 `50% 14%`)을 조정.
