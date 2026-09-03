// 펫/몹 디자인 시트(`게임 개발 파일/펫 몹 디자인.png`) 에서 31종을 잘라
// PixelLab v3 reference-rotate 용 남향(south) 레퍼런스 PNG 로 저장한다.
//   - 각 창(box)을 넉넉히 크롭 → 가장자리에서 크림색 배경 flood-fill 제거
//   - 연결요소 라벨링으로 본체(가장 큰 덩어리 + 중앙 근처)만 남기고 "Lv.13" 등 글자 잔티 제거
//   - 알파 bbox 로 트림 후 128×128 정사각 캔버스 중앙 배치, RGBA PNG
// 출력: public/images/creatures/_ref/<id>.png
//
// node scripts/_pixellab/extract-creature-refs.mjs

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHEET = path.join(__dirname, '..', '..', '..', '..', '펫 몹 디자인.png')
const OUT = path.join(__dirname, '..', '..', 'public', 'images', 'creatures', '_ref')
fs.mkdirSync(OUT, { recursive: true })

// [id, left, top, w, h] — 전체 시트 픽셀 좌표
const BOXES = [
  ['emberling', 22, 92, 120, 118],
  ['magma-pup', 372, 95, 155, 112],
  ['frostkit', 14, 285, 140, 120],
  ['glacier-owl', 398, 278, 120, 132],
  ['pebblemole', 12, 486, 158, 120],
  ['golem-cub', 392, 478, 140, 132],
  ['wisp', 18, 682, 132, 124],
  ['shade', 384, 684, 140, 120],
  // forest
  ['mon-forest-raccoon', 767, 116, 116, 92],
  ['mon-thorn-vine', 894, 114, 116, 94],
  ['mon-sprite-green', 1021, 112, 110, 98],
  ['mon-grey-wolf', 1147, 116, 120, 92],
  ['mon-mush-cap', 1274, 112, 116, 96],
  ['mon-bark-golem', 1400, 108, 118, 102],
  // sea
  ['mon-bubble-spirit', 767, 320, 116, 94],
  ['mon-crab-soldier', 894, 320, 116, 94],
  ['mon-shallows-eel', 1016, 324, 124, 88],
  ['mon-siren-larva', 1150, 320, 112, 96],
  ['mon-reef-turtle', 1276, 320, 116, 94],
  ['mon-tide-elemental', 1400, 320, 120, 94],
  // ruins 1
  ['mon-ember-imp', 768, 522, 114, 94],
  ['mon-ash-hound', 890, 524, 124, 92],
  ['mon-bone-archer', 1022, 516, 106, 104],
  ['mon-cursed-armor', 1146, 518, 120, 100],
  ['mon-wraith', 1272, 514, 118, 104],
  ['mon-dark-acolyte', 1400, 518, 116, 100],
  // ruins 2 (5)
  ['mon-flame-warden', 770, 676, 116, 102],
  ['mon-frost-revenant', 908, 680, 112, 98],
  ['mon-dark-mage', 1045, 672, 116, 108],
  ['mon-stone-titan', 1178, 676, 124, 104],
  ['mon-azka-herald', 1318, 662, 128, 118],
]

const CREAM = [238, 226, 209]
const BG_DIST = 44 // flood-fill 배경 색거리 임계
const CANVAS = 128
const PAD = 6

const dist2 = (r, g, b, c) => (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2

/** 가장자리 시드로 flood-fill 하여 배경(투명) 마스크 생성 */
function floodBg(data, w, h, ch) {
  const bg = new Uint8Array(w * h) // 1 = background
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (bg[p]) return
    const i = p * ch
    if (dist2(data[i], data[i + 1], data[i + 2], CREAM) <= BG_DIST * BG_DIST) {
      bg[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const p = stack.pop()
    const x = p % w
    const y = (p / w) | 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
  return bg
}

/** 8-이웃 연결요소: 본체(최대 면적 + 중앙 근처)만 남긴 keep 마스크 반환 */
function keepMainBlob(alpha, w, h) {
  const label = new Int32Array(w * h).fill(0)
  let next = 0
  const areas = [0]
  const cxs = [0]
  const cys = [0]
  const stack = []
  for (let s = 0; s < w * h; s++) {
    if (alpha[s] || label[s]) continue
    next++
    areas.push(0)
    cxs.push(0)
    cys.push(0)
    label[s] = next
    stack.push(s)
    while (stack.length) {
      const p = stack.pop()
      const x = p % w
      const y = (p / w) | 0
      areas[next]++
      cxs[next] += x
      cys[next] += y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const np = ny * w + nx
          if (alpha[np] || label[np]) continue
          label[np] = next
          stack.push(np)
        }
      }
    }
  }
  if (next === 0) return null
  let best = 1
  for (let i = 2; i <= next; i++) if (areas[i] > areas[best]) best = i
  const maxA = areas[best]
  const keep = new Uint8Array(next + 1)
  for (let i = 1; i <= next; i++) {
    if (areas[i] >= maxA * 0.04) {
      const cx = cxs[i] / areas[i]
      const cy = cys[i] / areas[i]
      // 중앙 80% 영역 안에 무게중심이 있어야 채택 (가장자리 글자 잔티 배제)
      if (cx > w * 0.08 && cx < w * 0.92 && cy > h * 0.06 && cy < h * 0.9) keep[i] = 1
    }
  }
  keep[best] = 1
  const out = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) if (label[p] && keep[label[p]]) out[p] = 1
  return out
}

async function run() {
  const results = []
  for (const [id, L, T, W, H] of BOXES) {
    const { data, info } = await sharp(SHEET)
      .extract({ left: L, top: T, width: W, height: H })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const w = info.width
    const h = info.height
    const ch = info.channels

    const bg = floodBg(data, w, h, ch)
    // alpha[]: 1 = 투명(=배경), 0 = 불투명 후보
    const alpha = new Uint8Array(w * h)
    for (let p = 0; p < w * h; p++) alpha[p] = bg[p] ? 1 : 0
    const keep = keepMainBlob(alpha, w, h)

    // RGBA 출력 버퍼
    const rgba = Buffer.alloc(w * h * 4)
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    for (let p = 0; p < w * h; p++) {
      const keepPx = keep ? keep[p] : !alpha[p]
      const i = p * ch
      const o = p * 4
      rgba[o] = data[i]
      rgba[o + 1] = data[i + 1]
      rgba[o + 2] = data[i + 2]
      rgba[o + 3] = keepPx ? 255 : 0
      if (keepPx) {
        const x = p % w
        const y = (p / w) | 0
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (maxX < 0) {
      console.log(`!! ${id}: 빈 결과`)
      continue
    }
    const bx = Math.max(0, minX - PAD)
    const by = Math.max(0, minY - PAD)
    const bw = Math.min(w - bx, maxX - minX + 1 + PAD * 2)
    const bh = Math.min(h - by, maxY - minY + 1 + PAD * 2)

    const cropped = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: bx, top: by, width: bw, height: bh })
      .png()
      .toBuffer()

    // 128 정사각 캔버스에 contain 배치 (여백 투명)
    await sharp({
      create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: await sharp(cropped).resize(CANVAS - 12, CANVAS - 12, { fit: 'inside' }).toBuffer(), gravity: 'centre' }])
      .png()
      .toFile(path.join(OUT, `${id}.png`))
    results.push(`${id}  ${bw}x${bh}`)
  }
  console.log(results.join('\n'))
  console.log(`\n${results.length} refs → ${OUT}`)
}

run()
