// `npc 디자인 안.png`(루트, 922×367) 에서 NPC 25종을 잘라 게임 스프라이트로 저장.
// NPC 는 방향/걷기 불필요(제자리 대화) → 정면 1장만. PixelLab 안 씀 — 시트가 이미 완성 도트.
//   크롭 → 크림색 배경 flood-fill 제거 → 중앙 본체만 남김 → 알파 트림 → 96 정사각 캔버스.
// 출력: public/images/npc/<npc-id>.png
//
// node scripts/_pixellab/extract-npc-sprites.mjs [--contact]

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHEET = path.join(__dirname, '..', '..', '..', '..', 'npc 디자인 안.png')
const OUT = path.join(__dirname, '..', '..', 'public', 'images', 'npc')
fs.mkdirSync(OUT, { recursive: true })

const W = 68
const H = 78
// [npc-id, centerX, centerY, (H override)] (원본 922×367 좌표)
const B = [
  // 학교 본거지 row1
  ['npc-job-trainer', 44, 74], ['npc-librarian', 111, 74], ['npc-weapon', 179, 72],
  ['npc-potion', 247, 74], ['npc-tool', 315, 73], ['npc-tamer', 394, 78],
  // 학교 본거지 row2
  ['npc-elder', 44, 208], ['npc-arena', 111, 205], ['npc-guard', 179, 206],
  ['npc-priest', 247, 207], ['npc-saint', 315, 206], ['npc-farmer', 382, 207],
  // 아틀란티스
  ['npc-atlantis-elder', 494, 74], ['npc-atlantis-merchant', 562, 74], ['npc-atlantis-child', 629, 76],
  // 천공 신전
  ['npc-sky-priest', 742, 73], ['npc-sky-keeper', 826, 74],
  // 버려진 신전
  ['npc-abandoned-monk', 494, 212], ['npc-abandoned-scholar', 562, 213],
  // 오로라 마을
  ['npc-aurora-chief', 695, 218, 74], ['npc-aurora-trader', 778, 220, 74], ['npc-aurora-hunter', 860, 220, 74],
  // 마물 마을
  ['npc-demon-elder', 329, 334, 58], ['npc-demon-smith', 443, 336, 58], ['npc-demon-child', 549, 333, 55],
]

const CREAM = [239, 232, 220]
const BG_DIST = 42
const CANVAS = 96
const PAD = 4
const dist2 = (r, g, b, c) => (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2

function floodBg(data, w, h, ch) {
  const bg = new Uint8Array(w * h)
  const st = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (bg[p]) return
    const i = p * ch
    if (dist2(data[i], data[i + 1], data[i + 2], CREAM) <= BG_DIST * BG_DIST) {
      bg[p] = 1
      st.push(p)
    }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (st.length) {
    const p = st.pop()
    const x = p % w, y = (p / w) | 0
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  return bg
}

function keepMain(alpha, w, h) {
  const label = new Int32Array(w * h)
  let next = 0
  const area = [0], cxs = [0], cys = [0]
  const st = []
  for (let s = 0; s < w * h; s++) {
    if (alpha[s] || label[s]) continue
    next++; area.push(0); cxs.push(0); cys.push(0); label[s] = next; st.push(s)
    while (st.length) {
      const p = st.pop(); const x = p % w, y = (p / w) | 0
      area[next]++; cxs[next] += x; cys[next] += y
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const np = ny * w + nx
        if (alpha[np] || label[np]) continue
        label[np] = next; st.push(np)
      }
    }
  }
  if (!next) return null
  let best = 1
  for (let i = 2; i <= next; i++) if (area[i] > area[best]) best = i
  const keep = new Uint8Array(next + 1)
  keep[best] = 1
  for (let i = 1; i <= next; i++) {
    if (i === best) continue
    if (area[i] >= area[best] * 0.14) {
      const cx = cxs[i] / area[i], cy = cys[i] / area[i]
      // 본체(best)와 세로로 겹치고 화면 중앙부에 있는 큰 조각만 추가로 채택
      if (cx > w * 0.18 && cx < w * 0.82 && cy > h * 0.05 && cy < h * 0.9) keep[i] = 1
    }
  }
  const out = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) if (label[p] && keep[label[p]]) out[p] = 1
  return out
}

const contact = process.argv.includes('--contact')

async function run() {
  const done = []
  const previews = []
  for (const [id, cx, cy, hOverride] of B) {
    const bh0 = hOverride || H
    const L = Math.max(0, Math.round(cx - W / 2))
    const T = Math.max(0, Math.round(cy - bh0 / 2))
    const { data, info } = await sharp(SHEET).extract({ left: L, top: T, width: W, height: bh0 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const w = info.width, h = info.height, ch = info.channels
    const bg = floodBg(data, w, h, ch)
    const alpha = new Uint8Array(w * h)
    for (let p = 0; p < w * h; p++) alpha[p] = bg[p] ? 1 : 0
    const keep = keepMain(alpha, w, h)
    const rgba = Buffer.alloc(w * h * 4)
    let minX = w, minY = h, maxX = -1, maxY = -1
    for (let p = 0; p < w * h; p++) {
      const on = keep ? keep[p] : !alpha[p]
      const i = p * ch, o = p * 4
      rgba[o] = data[i]; rgba[o + 1] = data[i + 1]; rgba[o + 2] = data[i + 2]; rgba[o + 3] = on ? 255 : 0
      if (on) {
        const x = p % w, y = (p / w) | 0
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
    if (maxX < 0) { console.log(`!! ${id}: 빈 결과`); continue }
    const bx = Math.max(0, minX - PAD), by = Math.max(0, minY - PAD)
    const bw = Math.min(w - bx, maxX - minX + 1 + PAD * 2), bh = Math.min(h - by, maxY - minY + 1 + PAD * 2)
    const cropped = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({ left: bx, top: by, width: bw, height: bh }).png().toBuffer()
    const finalBuf = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await sharp(cropped).resize(CANVAS - 10, CANVAS - 10, { fit: 'inside' }).toBuffer(), gravity: 'centre' }])
      .png().toBuffer()
    fs.writeFileSync(path.join(OUT, `${id}.png`), finalBuf)
    done.push(`${id}  ${bw}x${bh}`)
    if (contact) previews.push({ id, buf: finalBuf })
  }
  console.log(done.join('\n'))
  console.log(`\n${done.length} NPC sprites → ${OUT}`)

  if (contact) {
    const cols = 6, cell = 104, parts = []
    const checker = await sharp({ create: { width: cell, height: cell, channels: 3, background: { r: 74, g: 76, b: 86 } } })
      .composite([
        { input: await sharp({ create: { width: cell / 2, height: cell / 2, channels: 3, background: { r: 100, g: 102, b: 112 } } }).png().toBuffer(), left: 0, top: 0 },
        { input: await sharp({ create: { width: cell / 2, height: cell / 2, channels: 3, background: { r: 100, g: 102, b: 112 } } }).png().toBuffer(), left: cell / 2, top: cell / 2 },
      ]).png().toBuffer()
    for (let i = 0; i < previews.length; i++) {
      const x = (i % cols) * cell, y = ((i / cols) | 0) * cell
      parts.push({ input: checker, left: x, top: y })
      parts.push({ input: await sharp(previews[i].buf).resize(cell - 8, cell - 8, { fit: 'inside' }).toBuffer(), left: x + 4, top: y + 4 })
    }
    const rows = Math.ceil(previews.length / cols)
    const dst = path.join('C:/Users/saesa/AppData/Local/Temp/claude/C--Users-saesa-OneDrive-Desktop---------/e04b4e21-a9a4-4774-9b96-53eaf46293bd/scratchpad', 'npc_contact.png')
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: { r: 15, g: 15, b: 15 } } }).composite(parts).png().toFile(dst)
    console.log('contact →', dst)
  }
}

run()
