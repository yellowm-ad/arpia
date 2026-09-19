// 버려진 신전 / 오로라 마을 / 마물 마을 전용 평면 타일 12종 (64x32 다이아몬드, y 0~31) 절차 생성.
// 기존 ash/obsidian/ice 계열은 두꺼운 블록이라 평면 타일과 높이가 안 맞아 틈이 생김(천공 신전과 같은 문제).
//   ruin-stone / ruin-road / ruin-moss / ruin-mist
//   aurora-stone / aurora-road / aurora-snow / aurora-mist
//   demon-stone / demon-road / demon-ash / demon-lava
import sharp from 'sharp'
import path from 'node:path'

const dir = path.resolve('public/images/map/tiles')
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const clamp01 = (v) => Math.max(0, Math.min(1, v))

const h2 = (x, y, s = 0) => {
  let n = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0
  n = ((n ^ (n >>> 13)) * 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}
const smooth = (t) => t * t * (3 - 2 * t)
const vnoise = (x, y, cell, s) => {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell)
  const fx = smooth(x / cell - gx), fy = smooth(y / cell - gy)
  const a = h2(gx, gy, s), b = h2(gx + 1, gy, s), c = h2(gx, gy + 1, s), d = h2(gx + 1, gy + 1, s)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

const mask = await sharp(path.join(dir, 'plaza.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = mask.info.width, H = mask.info.height
const inside = (x, y) => mask.data[(y * W + x) * 4 + 3] > 10
const src = async (n) => (await sharp(path.join(dir, n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data
const pathData = await src('path.png')
const grassData = await src('grass.png')
const lum = (buf, x, y) => {
  const i = (y * W + x) * 4
  return (0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2]) / 255
}

async function write(name, fn) {
  const out = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      const [r, g, b] = fn(x, y)
      const i = (y * W + x) * 4
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(dir, name))
  console.log('wrote', name)
}

const uv = (x, y) => {
  const px = (x + 0.5 - 32) / 32, py = (y + 0.5 - 16) / 16
  return [(px + py + 2) / 4, (py - px + 2) / 4]
}

/** 2x2 슬랩 바닥 타일 공통 생성기 */
function slab(p) {
  const base = hex(p.base), dark = hex(p.dark), light = hex(p.light), seam = hex(p.seam), edge = hex(p.edge), hi = hex(p.hi)
  return (x, y) => {
    const [u, v] = uv(x, y)
    const n = h2(x, y, p.seed)
    let c = n < 0.14 ? dark : n > 0.9 ? light : base
    const su = Math.abs(u - 0.5) * 32, sv = Math.abs(v - 0.5) * 32
    if (su < 0.55 || sv < 0.55) c = seam
    if (u > 0.965 || v > 0.965) c = edge
    else if (u < 0.035 || v < 0.035) c = hi
    if (p.speck && h2(x, y, p.seed + 7) < p.speck.p) c = hex(p.speck.c)
    if (p.speck2 && h2(x, y, p.seed + 13) < p.speck2.p) c = hex(p.speck2.c)
    return c
  }
}

/** path.png / grass.png 리컬러 */
function recolor(buf, stops) {
  const cs = stops.map(hex)
  return (x, y) => {
    const t = clamp01((lum(buf, x, y) - 0.2) / 0.62)
    const s = t * (cs.length - 1)
    const i = Math.min(cs.length - 2, Math.floor(s))
    return lerp(cs[i], cs[i + 1], s - i)
  }
}

/** 솜구름/안개/용암 같은 노이즈 타일 */
function blobs(tones, cuts, cellA = 7, cellB = 3.5, seed = 5) {
  const cs = tones.map(hex)
  return (x, y) => {
    const n = vnoise(x, y * 2, cellA, seed) * 0.6 + vnoise(x, y * 2, cellB, seed + 6) * 0.4
    for (let i = 0; i < cuts.length; i++) if (n > cuts[i]) return cs[i]
    return cs[cs.length - 1]
  }
}

// ── 버려진 신전 ──
await write('ruin-stone.png', slab({ base: '#6a6577', dark: '#575265', light: '#7c7789', seam: '#3b3647', edge: '#2f2a3a', hi: '#8a8598', seed: 21, speck: { p: 0.035, c: '#4d6b45' }, speck2: { p: 0.006, c: '#9a5fd0' } }))
await write('ruin-road.png', recolor(pathData, ['#2a2636', '#4a4560', '#7a7492']))
await write('ruin-moss.png', recolor(grassData, ['#14201c', '#2d4a34', '#587f4c']))
await write('ruin-mist.png', blobs(['#5b5182', '#483f6a', '#352e52', '#26213c'], [0.68, 0.46, 0.28]))

// ── 오로라 마을 ──
await write('aurora-stone.png', slab({ base: '#e3ecf5', dark: '#d2e0ee', light: '#f6fbff', seam: '#a7bdd4', edge: '#96adc6', hi: '#ffffff', seed: 31, speck: { p: 0.02, c: '#ffffff' }, speck2: { p: 0.006, c: '#9fe8e0' } }))
await write('aurora-road.png', recolor(pathData, ['#7f9cae', '#bdd2dc', '#eaf3f6']))
await write('aurora-snow.png', blobs(['#ffffff', '#f2f8fd', '#dbe8f4', '#c3d6e8'], [0.7, 0.45, 0.28], 6, 3, 17))
await write('aurora-mist.png', blobs(['#f4fffd', '#dcf3f4', '#bfe3ea', '#a3d0de'], [0.68, 0.45, 0.27], 7, 3.5, 23))

// ── 마물 마을 ──
await write('demon-stone.png', slab({ base: '#3b2b2e', dark: '#2d2023', light: '#4c383a', seam: '#150c0e', edge: '#100809', hi: '#5c4244', seed: 41, speck: { p: 0.012, c: '#ff6a20' }, speck2: { p: 0.03, c: '#231719' } }))
{
  const f = recolor(pathData, ['#8a3a14', '#2a1d1f', '#54393a'])
  await write('demon-road.png', (x, y) => f(x, y))
}
await write('demon-ash.png', blobs(['#5a5052', '#4a4143', '#3a3234', '#2b2426'], [0.7, 0.5, 0.3], 6, 3, 29))
await write('demon-lava.png', (x, y) => {
  const n = vnoise(x, y * 2, 8, 9) * 0.6 + vnoise(x, y * 2, 4, 15) * 0.4
  if (n > 0.7) return hex('#ffd24a')
  if (n > 0.52) return hex('#ff9a24')
  if (n > 0.36) return hex('#ff6a1a')
  if (n > 0.24) return hex('#c8380e')
  return hex('#5a1a0a')
})
