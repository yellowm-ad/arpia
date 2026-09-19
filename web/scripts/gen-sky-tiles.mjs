// 천공 신전(하늘 도시) 전용 평면 타일 3종 생성 — 기존 평면 타일(plaza.png)과 동일한 64x32 다이아몬드(y 0~31)
//  · sky-marble : 크림빛 대리석 슬랩(2x2 이음매)   · sky-road : 하늘빛 포석 길(path.png 리컬러)   · sky-cloud : 솜구름
// 기존 'cloud' 타일은 두꺼운 3D 블록(y 23~63)이라 평면 타일과 높이가 안 맞아 검은 틈이 생김 → 새 평면 타일로 대체.
import sharp from 'sharp'
import path from 'node:path'

const dir = path.resolve('public/images/map/tiles')
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const clamp01 = (v) => Math.max(0, Math.min(1, v))

// 결정론적 해시/노이즈
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

// 다이아몬드 로컬 좌표: u,v ∈ [0,1] (u: 위→오른쪽아래, v: 위→왼쪽아래)
const uv = (x, y) => {
  const px = (x + 0.5 - 32) / 32, py = (y + 0.5 - 16) / 16
  return [(px + py + 2) / 4, (py - px + 2) / 4]
}

// 1) 크림 대리석 슬랩
const M_BASE = hex('#f3efe4'), M_LIGHT = hex('#fbf9f1'), M_DARK = hex('#e3dccb'), M_SEAM = hex('#cfc4a6'), M_EDGE = hex('#c4b791')
await write('sky-marble.png', (x, y) => {
  const [u, v] = uv(x, y)
  const n = h2(x, y, 3)
  let c = n < 0.12 ? M_DARK : n > 0.9 ? M_LIGHT : M_BASE
  // 슬랩 이음매(2x2) — 1px
  const su = Math.abs(u - 0.5) * 32, sv = Math.abs(v - 0.5) * 32
  if (su < 0.55 || sv < 0.55) c = M_SEAM
  // 타일 외곽: 아래쪽 두 변은 진하게, 위쪽 두 변은 밝게
  if (u > 0.965 || v > 0.965) c = M_EDGE
  else if (u < 0.035 || v < 0.035) c = M_LIGHT
  // 대리석 결(옅은 푸른빛 줄)
  if (h2(Math.floor((x + y) / 3), Math.floor(y / 2), 9) > 0.965) c = hex('#dfe6ee')
  return c
})

// 2) 하늘길: path.png 를 하늘빛 포석으로 리컬러 (벽돌 패턴 유지)
const path0 = await sharp(path.join(dir, 'path.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const R_DARK = hex('#7f93b8'), R_MID = hex('#bccce4'), R_LIGHT = hex('#eef4fb')
await write('sky-road.png', (x, y) => {
  const i = (y * W + x) * 4
  const L = (0.299 * path0.data[i] + 0.587 * path0.data[i + 1] + 0.114 * path0.data[i + 2]) / 255
  const t = clamp01((L - 0.22) / 0.6)
  return t < 0.5 ? lerp(R_DARK, R_MID, t * 2) : lerp(R_MID, R_LIGHT, (t - 0.5) * 2)
})

// 3) 솜구름
const C_WHITE = hex('#ffffff'), C_BASE = hex('#f1f8ff'), C_SH1 = hex('#dbe9f7'), C_SH2 = hex('#c4d8ee')
await write('sky-cloud.png', (x, y) => {
  const n = vnoise(x, y * 2, 7, 5) * 0.6 + vnoise(x, y * 2, 3.5, 11) * 0.4
  if (n > 0.66) return C_WHITE
  if (n > 0.42) return C_BASE
  if (n > 0.26) return C_SH1
  return C_SH2
})
