// 마을 에셋 감사: ① 선언 px vs 실제 px(늘어남/줄어듦) ② 코너 알파(불투명 배경 잔존) ③ 미사용 파일 ④ 용량
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const srcFiles = ['lib/atlantis-map.ts', 'lib/skytown-map.ts', 'lib/theme-towns.ts', 'lib/maps.ts'].map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')])
const allSrc = srcFiles.map((x) => x[1]).join('\n')

// 1) 선언(px) 파싱: sk('f', w, h, ...) / at('f', w, h, ...) / spr(R + 'f', w, h ...) / spr(A + 'f' ...) / spr('atl_x.png', w, h ...)
const pref = { S_: 'skytemple', A_: 'atlantis', R: 'templeruin', U: 'aurora', D: 'demon', A: 'atlantis', SK: 'skytemple' }
const decl = []
const reFn = /\b(sk|at)\(\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)/g
let m
while ((m = reFn.exec(allSrc))) decl.push({ dir: m[1] === 'sk' ? 'skytemple' : 'atlantis', file: m[2], w: +m[3], h: +m[4] })
const reSpr = /spr\(\s*(?:([A-Z_a-z]+)\s*\+\s*)?'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)/g
while ((m = reSpr.exec(allSrc))) {
  let dir = pref[m[1]]
  let file = m[2]
  if (!dir) {
    const mm = /^\/images\/map\/props\/([^/]+)\/(.+)$/.exec(file)
    if (mm) { dir = mm[1]; file = mm[2] } else if (file.startsWith('atl_')) dir = 'atlantis'
  }
  if (dir) decl.push({ dir, file, w: +m[3], h: +m[4] })
}
const seen = new Set()
console.log('== ① 선언 px vs 실제 px (오차 3px 초과만) ==')
for (const d of decl) {
  const k = d.dir + '/' + d.file
  if (seen.has(k)) continue
  seen.add(k)
  const p = path.join(root, 'public/images/map/props', d.dir, d.file)
  if (!fs.existsSync(p)) { console.log('MISSING', k); continue }
  const meta = await sharp(p).metadata()
  if (Math.abs(meta.width - d.w) > 3 || Math.abs(meta.height - d.h) > 3) {
    const sx = (d.w / meta.width).toFixed(2), sy = (d.h / meta.height).toFixed(2)
    console.log(`STRETCH ${k}: 실제 ${meta.width}x${meta.height} → 선언 ${d.w}x${d.h} (배율 ${sx}×${sy})`)
  }
}

console.log('\n== ② 코너 불투명(배경 잔존 의심) — 새 에셋 ==')
const newPrefixes = ['atl2_', 'atl3_', 'atl4_', 'sk2_', 'rt_', 'au_', 'dm_']
const dirs = ['atlantis', 'skytemple', 'templeruin', 'aurora', 'demon']
let totalNew = 0
const sizes = []
for (const dir of dirs) {
  const d = path.join(root, 'public/images/map/props', dir)
  for (const f of fs.readdirSync(d).filter((n) => n.endsWith('.png'))) {
    const fp = path.join(d, f)
    const st = fs.statSync(fp)
    const isNew = newPrefixes.some((p) => f.startsWith(p))
    if (isNew) totalNew += st.size
    sizes.push({ k: dir + '/' + f, size: st.size, isNew })
    if (!isNew) continue
    const { data, info } = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const c = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]].filter(([x, y]) => data[(y * info.width + x) * 4 + 3] > 200)
    if (c.length >= 2) console.log(`OPAQUE-CORNERS ${dir}/${f} (${c.length}/4)`)
  }
}
console.log('\n== ③ 미사용 파일(코드 어디에도 파일명 없음) ==')
const unusedNew = []
const unusedOld = []
for (const s of sizes) {
  const base = s.k.split('/')[1]
  if (!allSrc.includes(base)) (s.isNew ? unusedNew : unusedOld).push(s)
}
const sum = (a) => a.reduce((t, x) => t + x.size, 0)
console.log('신규 미사용', unusedNew.length, '개', (sum(unusedNew) / 1024).toFixed(0) + 'KB:', unusedNew.map((x) => x.k.split('/')[1]).join(', '))
console.log('기존 미사용', unusedOld.length, '개', (sum(unusedOld) / 1024).toFixed(0) + 'KB:', unusedOld.map((x) => x.k.split('/')[1]).join(', '))

console.log('\n== ④ 용량 ==')
console.log('신규 에셋 합계', (totalNew / 1024).toFixed(0) + 'KB')
const dirTotals = {}
for (const s of sizes) dirTotals[s.k.split('/')[0]] = (dirTotals[s.k.split('/')[0]] || 0) + s.size
console.log('폴더별', Object.fromEntries(Object.entries(dirTotals).map(([k, v]) => [k, (v / 1024).toFixed(0) + 'KB'])))
console.log('상위 10개', sizes.sort((a, b) => b.size - a.size).slice(0, 10).map((x) => `${x.k} ${(x.size / 1024).toFixed(0)}KB`).join(' | '))
// 타일
const td = path.join(root, 'public/images/map/tiles')
let tt = 0
for (const f of fs.readdirSync(td)) tt += fs.statSync(path.join(td, f)).size
console.log('타일 폴더', (tt / 1024).toFixed(0) + 'KB', fs.readdirSync(td).length, '개')
