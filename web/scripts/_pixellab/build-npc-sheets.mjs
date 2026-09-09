// NPC PixelLab 캐릭터(회전+걷기)의 스프라이트시트를 내려받아 게임용 시트로 조립.
// build-creature-sheets.mjs 와 동일 로직 — 대상만 NPC로 교체.
//
// 중요: 출력 파일명은 `<id>-walk.png` (원본 `<id>.png` 정지 전신 크롭과 별도 보존).
//   `<id>.png` 는 대화창 초상화(world-screen.tsx NPC 말풍선, Portrait 등)에 계속 쓰이므로
//   걷기 시트로 덮어쓰면 안 됨. NpcSprite(creature-sprite.tsx) 는 spriteId="<id>-walk" 로 호출.
//
// 입력: scripts/_pixellab/npc-charids.txt  ("<id>\t<charId>" 줄들)
// 출력: public/images/npc/<id>-walk.png  (64px 셀 · 8열 × 4행)
//
// node scripts/_pixellab/build-npc-sheets.mjs [--force] [--refetch] [id ...]

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IDS_FILE = path.join(__dirname, 'npc-charids.txt')
const CACHE = path.join(__dirname, 'npc-sheets')
const OUT = path.join(__dirname, '..', '..', 'public', 'images', 'npc')
const TOKEN = process.env.PIXELLAB_TOKEN || 'b8429f49-152d-480c-afc7-451eb5033691'
const API = 'https://api.pixellab.ai/mcp/characters'
const CELL = 64
const COLS = 8
const ROWS = 4
const WALK_FRAMES = 8
const STABILIZE_MAX = 6
const ROT_SRC_COL = { south: 0, east: 2, north: 4, west: 6 }

const args = process.argv.slice(2)
const force = args.includes('--force')
const refetch = args.includes('--refetch')
const only = args.filter((a) => !a.startsWith('--'))

fs.mkdirSync(CACHE, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

const entries = fs
  .readFileSync(IDS_FILE, 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.split('\t'))
  .filter(([id]) => !only.length || only.includes(id))

async function frameAnchor(buf, w, h) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, channels } = info
  let top = h, left = w, right = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * width + x) * channels + 3] > 24) {
        if (y < top) top = y
        if (x < left) left = x
        if (x > right) right = x
      }
  if (right < 0) return { top: h / 2, cx: w / 2 }
  return { top, cx: (left + right) / 2 }
}
async function shiftFrame(buf, w, h, dx, dy) {
  dx = Math.round(dx); dy = Math.round(dy)
  if (!dx && !dy) return buf
  const extended = await sharp(buf)
    .extend({ top: dy > 0 ? dy : 0, bottom: dy < 0 ? -dy : 0, left: dx > 0 ? dx : 0, right: dx < 0 ? -dx : 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  return sharp(extended).extract({ left: dx < 0 ? -dx : 0, top: dy < 0 ? -dy : 0, width: w, height: h }).toBuffer()
}
const median = (n) => [...n].sort((a, b) => a - b)[Math.floor(n.length / 2)]
async function stabilizeRow(frames, w, h) {
  const anchors = await Promise.all(frames.map((f) => frameAnchor(f, w, h)))
  const tTop = median(anchors.map((a) => a.top))
  const tCx = median(anchors.map((a) => a.cx))
  return Promise.all(frames.map((buf, i) => {
    const dy = Math.max(-STABILIZE_MAX, Math.min(STABILIZE_MAX, tTop - anchors[i].top))
    const dx = Math.max(-STABILIZE_MAX, Math.min(STABILIZE_MAX, tCx - anchors[i].cx))
    return shiftFrame(buf, w, h, dx, dy)
  }))
}
async function fit(buf) {
  const m = await sharp(buf).metadata()
  if (m.width === CELL && m.height === CELL) return buf
  return sharp({ create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(buf).resize(CELL, CELL, { fit: 'inside' }).toBuffer(), gravity: 'centre' }])
    .png().toBuffer()
}

function fetchSheet(id, charId) {
  const zip = path.join(CACHE, `${id}.zip`)
  const png = path.join(CACHE, `${id}.png`)
  const json = path.join(CACHE, `${id}.json`)
  if (!refetch && fs.existsSync(png) && fs.existsSync(json)) return { png, json }
  execFileSync('curl', ['-sS', '-f', '-L', '--max-time', '60', '-H', `Authorization: Bearer ${TOKEN}`, '-o', zip, `${API}/${charId}/spritesheet`], { stdio: ['ignore', 'ignore', 'inherit'] })
  const tmp = path.join(CACHE, `_tmp_${id}`)
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp)
  execFileSync('unzip', ['-o', zip, '-d', tmp], { stdio: ['ignore', 'ignore', 'inherit'] })
  const files = fs.readdirSync(tmp)
  fs.copyFileSync(path.join(tmp, files.find((f) => f.endsWith('.png'))), png)
  fs.copyFileSync(path.join(tmp, files.find((f) => f.endsWith('.json'))), json)
  fs.rmSync(tmp, { recursive: true, force: true })
  return { png, json }
}

for (const [id, charId] of entries) {
  const outFile = path.join(OUT, `${id}-walk.png`)
  if (!force && fs.existsSync(outFile)) { console.log(`= ${id}`); continue }

  let png, json
  try {
    ({ png, json } = fetchSheet(id, charId))
  } catch (e) {
    console.log(`! ${id}: export 다운로드 실패 (${e.message.split('\n')[0]})`)
    continue
  }
  const meta = JSON.parse(fs.readFileSync(json, 'utf8')).spritesheet
  const inCell = meta.cell_size.width
  const src = await sharp(png).toBuffer()
  const grab = (r, c) => sharp(src).extract({ left: c * inCell, top: r * inCell, width: inCell, height: inCell }).toBuffer()

  const rotRow = meta.rows.find((r) => r.type === 'rotations')
  const walkByDir = {}
  for (const r of meta.rows) if (r.type === 'animation' && /walk/i.test(r.animation || '') && r.direction) walkByDir[r.direction] = r

  const layers = []
  for (const [d, col] of Object.entries({ south: 0, east: 1, north: 2, west: 3 })) {
    layers.push({ input: await fit(await grab(rotRow.row, ROT_SRC_COL[d])), left: col * CELL, top: 0 })
  }
  const outRows = { south: 1, east: 2, north: 3 }
  for (const [d, row] of Object.entries(outRows)) {
    const wr = walkByDir[d]
    if (wr) {
      const fc = wr.frame_count || WALK_FRAMES
      const start = fc > WALK_FRAMES ? 1 : 0
      const raw = []
      for (let i = 0; i < WALK_FRAMES; i++) raw.push(await fit(await grab(wr.row, Math.min(start + i, fc - 1))))
      const stable = await stabilizeRow(raw, CELL, CELL)
      for (let i = 0; i < WALK_FRAMES; i++) layers.push({ input: stable[i], left: i * CELL, top: row * CELL })
    } else {
      const base = await fit(await grab(rotRow.row, ROT_SRC_COL[d]))
      for (let i = 0; i < WALK_FRAMES; i++) layers.push({ input: base, left: i * CELL, top: row * CELL })
    }
  }

  await sharp({ create: { width: COLS * CELL, height: ROWS * CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers).png().toFile(outFile)
  const dirs = Object.keys(walkByDir).join('/') || 'none'
  console.log(`✓ ${id}-walk.png  walk[${dirs}]`)
}

console.log('\ndone →', OUT)
