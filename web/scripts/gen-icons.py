#!/usr/bin/env python3
"""플레이스홀더 SVG 아이콘 일괄 생성 스크립트.
간단한 평면(flat) 스타일 아이콘을 코드로 생성한다 (기획 12번: 임시 단순 디자인).
"""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('wrote', path)

def svg(inner, bg=None, size=64):
    bgc = f'<circle cx="32" cy="32" r="30" fill="{bg}" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>' if bg else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
{bgc}
{inner}
</svg>'''

# ── 속성 아이콘 ─────────────────────────────────────────
write('elements/fire.svg', svg(
    bg='#3a1408',
    inner='''<path d="M32 10c4 8-4 10-2 18 1 4-2 6-2 6-6-2-10-8-10-14 0-8 6-12 6-18 6 2 6 4 8 8z" fill="#f0632a"/>
<path d="M32 22c2 5-2 6-1 10 1 3-1 5-1 5-4-1-6-5-6-9 0-5 3-7 3-11 3 1 4 3 5 5z" fill="#ffb347"/>'''
))

write('elements/water.svg', svg(
    bg='#0b2a45',
    inner='''<path d="M32 10c8 12 14 20 14 27a14 14 0 0 1-28 0c0-7 6-15 14-27z" fill="#3f9fe0"/>
<ellipse cx="27" cy="38" rx="4" ry="6" fill="#bfe6fb" opacity="0.7"/>'''
))

write('elements/wind.svg', svg(
    bg='#0c3626',
    inner='''<path d="M12 24h26a6 6 0 1 0-6-6" stroke="#7fe0ac" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M12 32h34a6 6 0 1 1-6 6" stroke="#a6f0c6" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M12 40h22a6 6 0 1 0-6 6" stroke="#7fe0ac" stroke-width="4" fill="none" stroke-linecap="round"/>'''
))

write('elements/earth.svg', svg(
    bg='#3a2a12',
    inner='''<path d="M14 42l12-22 8 12 6-8 10 18z" fill="#a97c3f"/>
<circle cx="20" cy="46" r="3" fill="#7a5a2a"/>
<circle cx="40" cy="46" r="2.5" fill="#7a5a2a"/>'''
))

# ── 아이템 아이콘 ─────────────────────────────────────────
write('items/wand.svg', svg(
    bg='#2a2450',
    inner='''<rect x="28" y="14" width="6" height="32" rx="3" transform="rotate(20 31 30)" fill="#c98a3f"/>
<circle cx="24" cy="16" r="6" fill="#f0d46a"/>'''
))
write('items/wand-adv.svg', svg(
    bg='#3a1440',
    inner='''<rect x="28" y="12" width="7" height="34" rx="3.5" transform="rotate(20 31 29)" fill="#8a4fd0"/>
<circle cx="23" cy="15" r="7" fill="#e0a6ff"/>
<circle cx="23" cy="15" r="3" fill="#ffffff"/>'''
))
write('items/robe.svg', svg(
    bg='#1c2a4a',
    inner='''<path d="M32 12l8 6-2 4 6 24H20l6-24-2-4z" fill="#5b6bd6"/>
<path d="M32 12l8 6-2 4-6 4-6-4-2-4z" fill="#7c8af0"/>'''
))
write('items/ring.svg', svg(
    bg='#3a2a10',
    inner='''<circle cx="32" cy="34" r="12" fill="none" stroke="#d9a441" stroke-width="5"/>
<circle cx="32" cy="18" r="6" fill="#ff5f5f"/>'''
))
write('items/amulet.svg', svg(
    bg='#0f2a3a',
    inner='''<path d="M20 14l12 8 12-8" stroke="#3fa0d5" stroke-width="3" fill="none"/>
<circle cx="32" cy="36" r="10" fill="#3fa0d5"/>
<circle cx="32" cy="36" r="4" fill="#bfe6fb"/>'''
))
write('items/potion-red.svg', svg(
    bg='#3a1010',
    inner='''<rect x="27" y="10" width="10" height="8" rx="2" fill="#c98a3f"/>
<path d="M24 22h16l4 20a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill="#e04a4a"/>
<rect x="24" y="30" width="16" height="6" fill="#ff9a9a" opacity="0.6"/>'''
))
write('items/potion-blue.svg', svg(
    bg='#0f1a3a',
    inner='''<rect x="27" y="10" width="10" height="8" rx="2" fill="#c98a3f"/>
<path d="M24 22h16l4 20a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill="#3f7fd5"/>
<rect x="24" y="30" width="16" height="6" fill="#9ac6ff" opacity="0.6"/>'''
))
write('items/potion-gold.svg', svg(
    bg='#3a2a10',
    inner='''<rect x="27" y="10" width="10" height="8" rx="2" fill="#c98a3f"/>
<path d="M24 22h16l4 20a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill="#e8b93f"/>
<rect x="24" y="30" width="16" height="6" fill="#ffe9a6" opacity="0.7"/>'''
))
write('items/scroll.svg', svg(
    bg='#2a2410',
    inner='''<rect x="14" y="18" width="36" height="28" rx="3" fill="#ece0bd"/>
<rect x="14" y="18" width="36" height="4" rx="2" fill="#d9a441"/>
<rect x="14" y="42" width="36" height="4" rx="2" fill="#d9a441"/>
<path d="M20 28h24M20 34h24M20 40h16" stroke="#8a6a2c" stroke-width="2"/>'''
))
write('items/vial-green.svg', svg(
    bg='#0f2a18',
    inner='''<path d="M28 12h8v10l6 18a5 5 0 0 1-5 6H27a5 5 0 0 1-5-6l6-18z" fill="#4caf7d"/>
<rect x="26" y="28" width="12" height="5" fill="#bfe6cc" opacity="0.7"/>'''
))
write('items/feather.svg', svg(
    bg='#2a1a3a',
    inner='''<path d="M40 12c-14 2-22 14-22 28l6 6c10-4 18-14 18-28z" fill="#e6d6ff"/>
<path d="M22 46l14-14" stroke="#8a5fd0" stroke-width="2"/>'''
))

# ── 몬스터 아이콘 ─────────────────────────────────────────
write('monsters/raccoon.svg', svg(
    bg='#1c2a18',
    inner='''<circle cx="22" cy="18" r="6" fill="#6b5a45"/>
<circle cx="42" cy="18" r="6" fill="#6b5a45"/>
<circle cx="32" cy="32" r="16" fill="#8a7860"/>
<path d="M20 30a8 5 0 0 0 24 0" fill="#3a3228"/>
<circle cx="26" cy="30" r="3" fill="#111"/>
<circle cx="38" cy="30" r="3" fill="#111"/>'''
))
write('monsters/vine.svg', svg(
    bg='#0f2a14',
    inner='''<path d="M20 50c0-20 24-8 24-28" stroke="#2f6b3a" stroke-width="6" fill="none" stroke-linecap="round"/>
<circle cx="44" cy="18" r="6" fill="#5cb86a"/>
<circle cx="18" cy="34" r="5" fill="#5cb86a"/>
<circle cx="30" cy="46" r="5" fill="#5cb86a"/>'''
))
write('monsters/wolf.svg', svg(
    bg='#1a1a2a',
    inner='''<path d="M18 40l4-18 8 6 4-8 4 8 8-6 4 18z" fill="#8a8f9c"/>
<circle cx="26" cy="34" r="2.5" fill="#e04a4a"/>
<circle cx="38" cy="34" r="2.5" fill="#e04a4a"/>
<path d="M28 42h8l-4 6z" fill="#3a3a45"/>'''
))
write('monsters/crab.svg', svg(
    bg='#0f2a3a',
    inner='''<ellipse cx="32" cy="34" rx="16" ry="10" fill="#d5643f"/>
<circle cx="24" cy="26" r="4" fill="#d5643f"/>
<circle cx="40" cy="26" r="4" fill="#d5643f"/>
<path d="M10 30l8 4M54 30l-8 4" stroke="#d5643f" stroke-width="4" stroke-linecap="round"/>
<circle cx="26" cy="33" r="2" fill="#111"/>
<circle cx="38" cy="33" r="2" fill="#111"/>'''
))
write('monsters/bubble.svg', svg(
    bg='#0a1e33',
    inner='''<circle cx="32" cy="32" r="16" fill="#6fc6f0" opacity="0.85"/>
<circle cx="26" cy="26" r="4" fill="#ffffff" opacity="0.7"/>
<circle cx="44" cy="20" r="5" fill="#6fc6f0" opacity="0.6"/>
<circle cx="18" cy="44" r="4" fill="#6fc6f0" opacity="0.6"/>'''
))
write('monsters/eel.svg', svg(
    bg='#0a2a2a',
    inner='''<path d="M12 24c8-8 12 8 20 0s12 8 20 0" stroke="#4fae9a" stroke-width="6" fill="none" stroke-linecap="round"/>
<circle cx="50" cy="22" r="3" fill="#111"/>'''
))
write('monsters/dummy.svg', svg(
    bg='#142a14',
    inner='''<rect x="29" y="10" width="6" height="30" fill="#8a6a3f"/>
<rect x="16" y="18" width="32" height="6" fill="#8a6a3f"/>
<circle cx="32" cy="20" r="8" fill="#c9a86a"/>
<path d="M26 20h12M32 14v12" stroke="#e04a4a" stroke-width="2"/>
<path d="M24 40l8 10 8-10" stroke="#6b5a3a" stroke-width="4" fill="none"/>'''
))

# ── NPC 아이콘 ─────────────────────────────────────────
def npc(name, hair, robe):
    write(f'npc/{name}.svg', svg(
        bg='#1c1f42',
        inner=f'''<circle cx="32" cy="24" r="10" fill="#e8c39a"/>
<path d="M20 24a12 10 0 0 1 24 0" fill="{hair}"/>
<path d="M18 52c2-12 8-18 14-18s12 6 14 18z" fill="{robe}"/>'''
    ))

npc('professor', '#cfd6e6', '#5b6bd6')
npc('librarian', '#8a5a3a', '#4caf7d')
npc('blacksmith', '#3a3a3a', '#a97c3f')
npc('alchemist', '#8a3f8a', '#2b8fd6')
npc('tinker', '#d9a441', '#c9622b')
npc('elder', '#e6e6e6', '#6fae5d')
npc('arena-master', '#5a1a1a', '#c9622b')
npc('guard', '#2a2a2a', '#8a8f9c')

print('done')
