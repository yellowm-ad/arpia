// PixelLab "Spritesheet (PNG + JSON)" export 를 게임용 통일 스프라이트 시트로 변환.
//
// 사용법:
//   1) PixelLab 캐릭터 상세 → Export → "Spritesheet (PNG + JSON)" 로 6종 다운로드
//   2) 각 zip 을 풀어서 아래 SRC 아래에 hero 이름 폴더로 배치:
//        <SRC>/fire-male/*.png, *.json
//        <SRC>/fire-female/... ice-male ... ice-female ... earth-male ... earth-female
//   3) node scripts/build-hero-sheets.mjs
//
// 출력: public/images/sprites/hero-<element>-<gender>.png
//   88px 셀 · 8열 × 2행
//   row 0 = 8방향 회전 (south, south-east, east, north-east, north, north-west, west, south-west)
//   row 1 = south(정면) 걷기 8프레임. 걷기 애니메이션이 없는 캐릭터는 south 대기 프레임 + 상하 바운스로 대체.

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.env.SRC || path.join(__dirname, '_pixellab')
const OUT = path.join(__dirname, '..', 'public', 'images', 'sprites')
const CELL = 88, COLS = 8, ROWS = 2
const CHARS = ['fire-male', 'fire-female', 'ice-male', 'ice-female', 'earth-male', 'earth-female']

for (const name of CHARS) {
  const dir = path.join(SRC, name)
  const png = fs.readdirSync(dir).find((f) => f.endsWith('.png'))
  const json = fs.readdirSync(dir).find((f) => f.endsWith('.json'))
  const meta = JSON.parse(fs.readFileSync(path.join(dir, json), 'utf8')).spritesheet
  const inCell = meta.cell_size.width
  const hasWalk = meta.rows.some((r) => r.type === 'animation')
  const buf = await sharp(path.join(dir, png)).toBuffer()
  const off = Math.round((CELL - inCell) / 2)
  const layers = []
  for (let c = 0; c < COLS; c++) {
    const cell = await sharp(buf).extract({ left: c * inCell, top: 0, width: inCell, height: inCell }).toBuffer()
    layers.push({ input: cell, left: c * CELL + off, top: off })
  }
  for (let c = 0; c < COLS; c++) {
    if (hasWalk) {
      const cell = await sharp(buf).extract({ left: c * inCell, top: inCell, width: inCell, height: inCell }).toBuffer()
      layers.push({ input: cell, left: c * CELL, top: CELL })
    } else {
      const cell = await sharp(buf).extract({ left: 0, top: 0, width: inCell, height: inCell }).toBuffer()
      layers.push({ input: cell, left: c * CELL + off, top: CELL + off + (c % 2 ? -2 : 0) })
    }
  }
  await sharp({ create: { width: COLS * CELL, height: ROWS * CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toFile(path.join(OUT, `hero-${name}.png`))
  console.log(`hero-${name}.png  ${COLS * CELL}x${ROWS * CELL}  ${hasWalk ? 'real walk' : 'idle + bounce'}`)
}
