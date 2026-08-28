'use client'

// ============================================================================
// NPC / 주인공 초상화 — 전부 코드로 그린 오리지널 플레이스홀더.
// (원작·나무위키 삽화는 저작권상 사용하지 않음)
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
  'hero-fire': { bg: ['#4a1e12', '#2a0d08'], skin: '#ecd0b0', hair: '#3a2a18', robe: '#e0542b', accent: '#ffb347', hat: 'pointed', prop: 'wand' },
  'hero-ice': { bg: ['#14384a', '#0a2030'], skin: '#ecd0b0', hair: '#2a3f4a', robe: '#3aa6d6', accent: '#d8f2fb', hat: 'pointed', prop: 'wand' },
  'hero-earth': { bg: ['#3a2e18', '#20180c'], skin: '#e0be96', hair: '#3a2a18', robe: '#8a6a3c', accent: '#e6c79a', hat: 'pointed', prop: 'wand' },
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
    case 'wand':
      return <><rect x="110" y="96" width="4" height="52" rx="2" fill="#6b4a2a" transform="rotate(18 112 120)" /><circle cx="122" cy="98" r="5" fill={c} /></>
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
      {/* 어깨/로브 */}
      <path d="M18 180 Q22 128 70 122 Q118 128 122 180 Z" fill={s.robe} stroke={s.accent} strokeWidth="2" />
      <path d="M62 120 h16 v14 h-16 Z" fill={s.skin} />
      {/* 머리 */}
      <circle cx="70" cy="88" r="30" fill={s.skin} />
      {/* 머리카락 */}
      <path d="M40 88 Q40 52 70 50 Q100 52 100 88 Q100 70 88 64 Q78 74 70 72 Q62 74 52 64 Q40 70 40 88 Z" fill={s.hair} />
      {s.elder && <path d="M60 108 q10 12 20 0 q-2 16 -10 18 q-8 -2 -10 -18 Z" fill="#e8e8ee" />}
      {/* 눈 */}
      <circle cx="60" cy="90" r="3" fill="#2a2333" />
      <circle cx="80" cy="90" r="3" fill="#2a2333" />
      <HatShape hat={s.hat} robe={s.robe} accent={s.accent} />
      <PropShape prop={s.prop} accent={s.accent} />
    </svg>
  )
}

export function portraitIdForHero(element: string) {
  return `hero-${element}`
}
