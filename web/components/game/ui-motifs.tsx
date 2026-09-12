/** 참고자료(ui 인터페이스 참고자료.png)에 반복 등장하는 4방향 반짝임 다이아몬드 마크.
 * 섹션 헤더·탭·패널 코너 장식에 공통으로 쓰는 작은 SVG 글리프. */
export function DiamondMark({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`motif-diamond ${className}`}
      aria-hidden
    >
      <path
        d="M12 1c0.6 4.2 2.1 8.4 5.2 9.7C13.8 12.1 12.6 15.6 12 23c-0.6-7.4-1.8-10.9-5.2-12.3C10 9.4 11.4 5.2 12 1Z"
        fill="currentColor"
      />
      <circle cx="19.5" cy="4.5" r="1.4" fill="currentColor" opacity="0.75" />
    </svg>
  )
}

/** 등급별 아이템 슬롯 발광 색 — 아이템 종류(type)에 대응해 살짝 다른 톤을 줘 참고자료의
 * "슬롯마다 다른 색 광채" 느낌을 재현한다. 실제 희귀도 데이터는 없어 종류 기반으로 매핑. */
export const RARITY_GLOW: Record<string, string> = {
  weapon: '#8fb4ff',
  armor: '#8fb4ff',
  accessory: '#c9a4ff',
  potion: '#c9a4ff',
  tool: '#7fe0c8',
  feed: '#7fe0c8',
  material: '#d9a441',
}

export function rarityGlowStyle(type?: string) {
  const col = (type && RARITY_GLOW[type]) || 'transparent'
  return { ['--rarity-col' as string]: `${col}66`, ['--rarity-glow' as string]: `${col}55` }
}
