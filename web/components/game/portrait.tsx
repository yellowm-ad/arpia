'use client'

import { useState } from 'react'
import type { Element, Gender } from '@/lib/types'

// ============================================================================
// NPC / 주인공 초상화 — 전부 코드로 그린 오리지널 (원작·나무위키 삽화 미사용).
// 주인공은 사용자 제공 스타일 브리프(클린 라인아트 + 플랫 셀 명암) 기준의 벡터 근사치.
// public/images/portraits/hero-<element>-<gender>.png 가 있으면 자동으로 그 이미지를 사용.
// ============================================================================

type Hat = 'pointed' | 'cap' | 'hood' | 'none'
type Prop = 'book' | 'wand' | 'flask' | 'hammer' | 'gear' | 'staff' | 'shield' | 'paw' | 'scroll' | 'none'

interface Spec {
  bg: [string, string]
  skin: string
  hair: string
  robe: string
  accent: string
  hat: Hat
  prop: Prop
  elder?: boolean
}

const SPECS: Record<string, Spec> = {
  'npc-job-trainer': { bg: ['#3a3466', '#211d40'], skin: '#e8c9a8', hair: '#3a2f5a', robe: '#5b4bd0', accent: '#d9a441', hat: 'pointed', prop: 'staff' },
  'npc-librarian': { bg: ['#20504e', '#123330'], skin: '#e8c9a8', hair: '#2a2a2a', robe: '#2f8f86', accent: '#cfe8e4', hat: 'cap', prop: 'book' },
  'npc-weapon': { bg: ['#5a3620', '#2f1d10'], skin: '#d9a878', hair: '#3a2a18', robe: '#c9622b', accent: '#f0b04a', hat: 'none', prop: 'hammer' },
  'npc-potion': { bg: ['#2f5a3a', '#173322'], skin: '#ecd0b0', hair: '#6b3f2a', robe: '#3f9f6a', accent: '#bff0cf', hat: 'hood', prop: 'flask' },
  'npc-tool': { bg: ['#5a4620', '#312611'], skin: '#e8c9a8', hair: '#4a3520', robe: '#d9a441', accent: '#7a5a2a', hat: 'cap', prop: 'gear' },
  'npc-tamer': { bg: ['#3a4a26', '#20280f'], skin: '#e0be96', hair: '#2f2a1a', robe: '#7fae4d', accent: '#d9c07a', hat: 'cap', prop: 'paw' },
  'npc-elder': { bg: ['#4a4656', '#28242f'], skin: '#e8d0b8', hair: '#d8d8e0', robe: '#8a8f9c', accent: '#d9a441', hat: 'hood', prop: 'scroll', elder: true },
  'npc-arena': { bg: ['#5c2626', '#2f1414'], skin: '#d9a878', hair: '#2a1a12', robe: '#c9622b', accent: '#f0c060', hat: 'none', prop: 'shield' },
  'npc-guard': { bg: ['#2a3a5c', '#14202f'], skin: '#e0be96', hair: '#2a2a30', robe: '#5b6bd6', accent: '#c8ccd8', hat: 'cap', prop: 'shield' },
}

const FALLBACK: Spec = { bg: ['#3a3a44', '#20202a'], skin: '#e8c9a8', hair: '#2a2a2a', robe: '#6a6a7a', accent: '#d9a441', hat: 'none', prop: 'none' }

function HatShape({ hat, robe, accent }: { hat: Hat; robe: string; accent: string }) {
  if (hat === 'pointed')
    return (
      <>
        <path d="M70 8 L102 60 H38 Z" fill={robe} stroke={accent} strokeWidth="2" />
        <ellipse cx="70" cy="60" rx="34" ry="7" fill={robe} stroke={accent} strokeWidth="2" />
        <circle cx="70" cy="12" r="4" fill={accent} />
      </>
    )
  if (hat === 'cap') return <path d="M42 46 Q70 24 98 46 Q86 40 70 40 Q54 40 42 46 Z" fill={robe} stroke={accent} strokeWidth="2" />
  if (hat === 'hood') return <path d="M40 66 Q42 22 70 20 Q98 22 100 66 Q86 44 70 44 Q54 44 40 66 Z" fill={robe} stroke={accent} strokeWidth="2" />
  return null
}

function PropShape({ prop, accent }: { prop: Prop; accent: string }) {
  const c = accent
  switch (prop) {
    case 'staff':
      return <><rect x="112" y="60" width="5" height="100" rx="2" fill="#8a6a3c" /><circle cx="114.5" cy="58" r="9" fill="none" stroke={c} strokeWidth="3" /></>
    case 'book':
      return <><rect x="98" y="118" width="34" height="26" rx="2" fill="#7a4a2a" /><rect x="102" y="122" width="26" height="18" fill="#e8dcc0" /><line x1="115" y1="122" x2="115" y2="140" stroke="#7a4a2a" strokeWidth="2" /></>
    case 'flask':
      return <><path d="M110 116 h12 l6 24 a10 10 0 0 1 -24 0 Z" fill="none" stroke={c} strokeWidth="3" /><path d="M108 138 a10 10 0 0 0 24 0 Z" fill="#5fd18a" /></>
    case 'hammer':
      return <><rect x="110" y="100" width="5" height="52" rx="2" fill="#6b4a2a" /><rect x="100" y="96" width="26" height="16" rx="2" fill="#8a8f9c" stroke={c} strokeWidth="2" /></>
    case 'gear':
      return <circle cx="118" cy="128" r="14" fill="none" stroke={c} strokeWidth="4" strokeDasharray="4 4" />
    case 'shield':
      return <path d="M104 106 h28 v18 q0 20 -14 26 q-14 -6 -14 -26 Z" fill={c} opacity="0.9" stroke="#00000033" strokeWidth="2" />
    case 'scroll':
      return <><rect x="102" y="120" width="30" height="22" rx="3" fill="#e8dcc0" stroke="#7a4a2a" strokeWidth="2" /><line x1="108" y1="128" x2="126" y2="128" stroke="#7a4a2a" strokeWidth="1.5" /><line x1="108" y1="134" x2="122" y2="134" stroke="#7a4a2a" strokeWidth="1.5" /></>
    case 'paw':
      return <><circle cx="118" cy="130" r="8" fill={c} /><circle cx="110" cy="120" r="3" fill={c} /><circle cx="118" cy="117" r="3" fill={c} /><circle cx="126" cy="120" r="3" fill={c} /></>
    default:
      return null
  }
}

/** NPC 초상화 */
export function Portrait({ id, className }: { id: string; className?: string }) {
  const s = SPECS[id] ?? FALLBACK
  const gid = `pg-${id.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox="0 0 140 180" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label="초상화">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.bg[0]} />
          <stop offset="1" stopColor={s.bg[1]} />
        </linearGradient>
      </defs>
      <rect width="140" height="180" fill={`url(#${gid})`} />
      <path d="M18 180 Q22 128 70 122 Q118 128 122 180 Z" fill={s.robe} stroke={s.accent} strokeWidth="2" />
      <path d="M62 120 h16 v14 h-16 Z" fill={s.skin} />
      <circle cx="70" cy="88" r="30" fill={s.skin} />
      <path d="M40 88 Q40 52 70 50 Q100 52 100 88 Q100 70 88 64 Q78 74 70 72 Q62 74 52 64 Q40 70 40 88 Z" fill={s.hair} />
      {s.elder && <path d="M60 108 q10 12 20 0 q-2 16 -10 18 q-8 -2 -10 -18 Z" fill="#e8e8ee" />}
      <circle cx="60" cy="90" r="3" fill="#2a2333" />
      <circle cx="80" cy="90" r="3" fill="#2a2333" />
      <HatShape hat={s.hat} robe={s.robe} accent={s.accent} />
      <PropShape prop={s.prop} accent={s.accent} />
    </svg>
  )
}

// ─── 주인공 초상화 ───────────────────────────────────────────────────────────

interface ElemPal {
  bg: string
  tip1: string
  tip2: string
  iris: string
  irisLow: string
  irisRim: string
  wisp: string
  piping: string
}

const ELEM_PAL: Record<Element, ElemPal> = {
  fire: { bg: '#241A05', tip1: '#E85A20', tip2: '#A9281C', iris: '#D99420', irisLow: '#E85A20', irisRim: '#A9281C', wisp: '#E85A20', piping: '#E85A20' },
  ice: { bg: '#0E2230', tip1: '#5FB5DE', tip2: '#2E6E8C', iris: '#8FD3F0', irisLow: '#3AA6D6', irisRim: '#1C4A63', wisp: '#8FD3F0', piping: '#8FD3F0' },
  earth: { bg: '#241A0A', tip1: '#C9902F', tip2: '#8A5A1E', iris: '#D9A441', irisLow: '#B57A2A', irisRim: '#6B4A1E', wisp: '#D9A441', piping: '#D9A441' },
}

const IVORY = '#EEE5D2'
const IVORY_HI = '#FBF6EC'
const TAUPE = '#B8AC9C'
const CHARCOAL = '#292827'
const CHARCOAL_SH = '#1E1D1C'
const SKIN = '#F0E4CE'
const SKIN_SH = '#E0C9A9'
const LINE = '#191410'
const BRASS = '#D99420'

function HeroSvg({ element, gender, className }: { element: Element; gender: Gender; className?: string }) {
  const p = ELEM_PAL[element]
  const g = gender === 'female'
  return (
    <svg viewBox="0 0 160 200" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label="주인공 초상화">
      {/* 배경 (플랫) + 아주 약한 엠버 악센트 */}
      <rect width="160" height="200" fill={p.bg} />
      <ellipse cx="34" cy="188" rx="78" ry="46" fill={p.wisp} opacity="0.12" />

      {/* 뒤 헤어 (바람에 날리는 넓은 리본) */}
      <path d="M52 78 Q28 40 44 16 Q40 46 70 40 Q60 60 78 60 Q40 66 44 108 Q34 92 52 78Z" fill={IVORY} stroke={LINE} strokeWidth="2" />
      <path d="M108 74 Q140 44 128 14 Q136 48 104 44 Q118 64 96 60 Q132 70 122 110 Q138 88 108 74Z" fill={IVORY} stroke={LINE} strokeWidth="2" />
      <path d="M56 92 Q44 70 52 50 Q56 74 78 66 Q64 84 56 92Z" fill={TAUPE} opacity="0.8" />
      <path d="M110 90 Q122 68 114 50 Q110 74 92 66 Q104 82 110 90Z" fill={TAUPE} opacity="0.8" />

      {/* 코트 + 하이넥 카라 */}
      <path d={`M24 200 Q28 150 60 138 L60 122 Q80 132 100 122 L100 138 Q132 150 136 200Z`} fill={CHARCOAL} stroke={LINE} strokeWidth="2.5" />
      <path d="M60 138 Q56 108 44 96 L52 150Z" fill={CHARCOAL_SH} stroke={LINE} strokeWidth="2.5" />
      <path d="M100 138 Q104 108 116 96 L108 150Z" fill={CHARCOAL} stroke={LINE} strokeWidth="2.5" />
      {/* 엠버 파이핑 */}
      <path d="M44 96 L60 138 M116 96 L100 138 M60 138 Q80 148 100 138" fill="none" stroke={p.piping} strokeWidth="2" strokeLinecap="round" />
      {/* 브라스 버클 */}
      <rect x="74" y="150" width="12" height="9" rx="1.5" fill={BRASS} stroke={LINE} strokeWidth="1.5" />
      <rect x="77" y="152" width="3" height="2" fill={IVORY_HI} />

      {/* 목 */}
      <path d="M68 118 h24 v18 q-12 8 -24 0Z" fill={SKIN} stroke={LINE} strokeWidth="2" />
      <path d="M80 120 v16 q6 2 12 -2 v-14Z" fill={SKIN_SH} />

      {/* 마그마 균열 스카프 */}
      <path d="M52 128 Q80 146 108 128 Q108 140 80 150 Q52 140 52 128Z" fill="#3A322E" stroke={LINE} strokeWidth="2" />
      <path d="M60 132 l4 6 l-3 4 M74 134 l3 7 M88 132 l-2 7 l4 3 M98 130 l-3 6" fill="none" stroke={p.tip2} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M66 138 l3 4 M82 136 l2 6" fill="none" stroke={p.tip1} strokeWidth="1.4" strokeLinecap="round" />

      {/* 얼굴 (3/4 뷰) */}
      <path
        d={g
          ? 'M52 92 Q50 62 80 56 Q110 62 108 92 Q108 112 92 122 Q80 130 68 122 Q52 112 52 92Z'
          : 'M52 92 Q50 60 80 54 Q110 60 110 92 Q110 110 94 122 Q80 132 66 122 Q50 110 52 92Z'}
        fill={SKIN}
        stroke={LINE}
        strokeWidth="2"
      />
      {/* 하드 셀 그림자 (오른쪽) */}
      <path d="M92 60 Q112 66 108 96 Q106 114 92 122 Q104 108 100 88 Q98 66 92 60Z" fill={SKIN_SH} />
      {/* 턱 밑 얕은 2차 그림자 */}
      <path d="M70 120 q10 8 20 0 q-10 6 -20 0Z" fill={SKIN_SH} opacity="0.7" />
      {/* 귀 */}
      <path d="M50 92 q-6 2 -4 10 q4 4 8 0Z" fill={SKIN} stroke={LINE} strokeWidth="1.6" />

      {/* 눈썹 */}
      <path d={g ? 'M58 82 q8 -5 16 -2' : 'M57 80 q9 -6 17 -1'} fill="none" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" />
      <path d={g ? 'M86 80 q8 -3 14 1' : 'M86 78 q8 -4 15 1'} fill="none" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" />

      {/* 눈 — 크고 각진 애니 스타일, 몰튼 앰버 홍채 */}
      <g>
        <path d={g ? 'M56 92 q10 -8 20 -2 q-2 10 -12 11 q-8 -1 -8 -9Z' : 'M56 91 q10 -7 19 -2 q-2 9 -11 10 q-8 -1 -8 -8Z'} fill="#F7F1E6" stroke={LINE} strokeWidth="2" />
        <ellipse cx="66" cy="94" rx="6" ry="7" fill={p.iris} />
        <path d="M60 96 a6 7 0 0 0 12 0Z" fill={p.irisLow} />
        <ellipse cx="66" cy="94" rx="6" ry="7" fill="none" stroke={p.irisRim} strokeWidth="1.6" />
        <ellipse cx="66" cy="95" rx="2.6" ry="3.2" fill="#180F06" />
        <circle cx="63.5" cy="91.5" r="1.6" fill="#fff" />
        <path d={g ? 'M55 90 q10 -8 21 -3 l3 -3' : 'M55 89 q10 -7 20 -3'} fill="none" stroke={LINE} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M57 100 q7 3 15 0" fill="none" stroke={LINE} strokeWidth="1.3" strokeLinecap="round" />
      </g>
      <g>
        <path d={g ? 'M86 90 q9 -6 17 -1 q-1 9 -9 10 q-8 -1 -8 -9Z' : 'M86 89 q9 -5 16 -1 q-1 8 -9 9 q-7 -1 -7 -8Z'} fill="#F7F1E6" stroke={LINE} strokeWidth="2" />
        <ellipse cx="94" cy="92" rx="5.6" ry="6.6" fill={p.iris} />
        <path d="M88.5 94 a5.6 6.6 0 0 0 11 0Z" fill={p.irisLow} />
        <ellipse cx="94" cy="92" rx="5.6" ry="6.6" fill="none" stroke={p.irisRim} strokeWidth="1.5" />
        <ellipse cx="94" cy="93" rx="2.4" ry="3" fill="#180F06" />
        <circle cx="91.8" cy="89.8" r="1.4" fill="#fff" />
        <path d={g ? 'M85 88 q9 -6 18 -2 l3 -2' : 'M85 87 q9 -5 17 -2'} fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* 코 · 자신만만한 smirk */}
      <path d="M79 100 q-3 5 -1 8" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M70 112 q9 6 18 -1" fill="none" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <path d="M86 111 q3 0 4 -2" fill="none" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" />

      {/* 앞 헤어 — 넓은 리본 스트랜드, 끝단으로 갈수록 크림슨-오렌지 */}
      <path d="M46 96 Q40 52 82 44 Q120 50 116 92 Q112 66 96 60 Q104 74 92 70 Q98 56 80 58 Q86 44 66 52 Q74 64 60 66 Q66 52 52 60 Q56 78 50 96Z" fill={IVORY} stroke={LINE} strokeWidth="2" />
      <path d={g ? 'M54 96 Q48 120 56 150 Q62 122 60 98Z' : 'M54 96 Q50 112 56 126 Q60 110 60 98Z'} fill={IVORY} stroke={LINE} strokeWidth="2" />
      <path d={g ? 'M104 92 Q114 118 108 150 Q100 122 100 96Z' : 'M104 92 Q112 110 106 126 Q100 110 100 96Z'} fill={IVORY} stroke={LINE} strokeWidth="2" />
      {/* 정수리 리본 하이라이트 그림자 */}
      <path d="M58 60 Q62 50 78 50 Q66 58 62 70Z" fill={TAUPE} opacity="0.7" />

      {/* 헤어 끝단 색 번짐 */}
      <path d={g ? 'M54 128 Q50 142 56 150 Q60 140 60 126Z' : 'M54 118 Q52 124 56 126 Q59 120 59 114Z'} fill={p.tip1} />
      <path d={g ? 'M55 142 q1 6 4 8 q2 -5 1 -9Z' : 'M55 121 q1 4 3 5 q2 -3 1 -6Z'} fill={p.tip2} />
      <path d={g ? 'M104 132 Q108 144 108 150 Q102 140 101 128Z' : 'M104 118 Q107 124 106 126 Q101 120 101 114Z'} fill={p.tip1} />
      <path d="M40 26 Q34 40 46 52 Q42 36 52 30Z" fill={p.tip1} opacity="0.9" />
      <path d="M124 22 Q132 38 120 52 Q128 34 118 28Z" fill={p.tip1} opacity="0.9" />
      <path d="M44 34 q-3 8 4 14 M122 30 q4 8 -3 15" fill="none" stroke={p.tip2} strokeWidth="2" strokeLinecap="round" />

      {/* 불씨 점 (은은한 glow) */}
      {[
        [46, 24],
        [122, 22],
        [g ? 57 : 57, g ? 150 : 126],
        [g ? 106 : 105, g ? 150 : 126],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.5" fill={p.wisp} opacity="0.28" />
          <circle cx={x} cy={y} r="1.7" fill={p.tip1} />
        </g>
      ))}

      {/* 어깨 주변 얇은 화염 위습 */}
      <path d="M30 150 q-8 -14 2 -26 q-4 12 6 18 q-8 4 -8 8" fill="none" stroke={p.wisp} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M130 148 q9 -12 0 -26 q5 12 -5 18 q8 4 5 8" fill="none" stroke={p.wisp} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M120 96 q6 -8 3 -18" fill="none" stroke={p.wisp} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />

      {/* 절제된 하이라이트 */}
      <path d="M60 52 q10 -4 22 -2" fill="none" stroke={IVORY_HI} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M96 58 q6 2 10 8" fill="none" stroke={IVORY_HI} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * 주인공 초상화.
 * public/images/portraits/hero-<element>-<gender>.png 가 있으면 사용, 없으면 벡터(HeroSvg).
 * (현재: 불/얼음은 사용자 일러스트를 반으로 잘라 넣음. 대지는 벡터.)
 */
export function HeroPortrait({
  element,
  gender,
  className,
}: {
  element: Element
  gender: Gender
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const src = `/images/portraits/hero-${element}-${gender}.png`
  return (
    <span className={className} style={{ display: 'inline-block', overflow: 'hidden', position: 'relative' }}>
      {!ready && <HeroSvg element={element} gender={gender} className="h-full w-full" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onLoad={() => setReady(true)}
        onError={() => {}}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 14%',
          display: ready ? 'block' : 'none',
        }}
      />
    </span>
  )
}
