// 기존 public/images/npc/<id>.png(96px, 완성 도트) 를 PixelLab v3 reference-rotate 용
// 64px·저채널(팔레트 축소) 레퍼런스로 리사이즈. base64 크기를 줄여 MCP 클라이언트 truncate 회피.
// 출력: public/images/npc/_ref/<id>.png + scripts/_pixellab/npc-b64/<id>.txt (base64 텍스트)
//
// node scripts/_pixellab/extract-npc-refs.mjs

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..', 'public', 'images', 'npc')
const OUT = path.join(SRC, '_ref')
const B64 = path.join(__dirname, 'npc-b64')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(B64, { recursive: true })

const ids = fs.readdirSync(SRC).filter((f) => f.startsWith('npc-') && f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''))

async function run() {
  for (const id of ids) {
    const src = path.join(SRC, `${id}.png`)
    const outPng = path.join(OUT, `${id}.png`)
    // 64px 축소 + 팔레트 16색으로 png8 양자화 → base64 크게 줄임
    const buf = await sharp(src)
      .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, colors: 8, compressionLevel: 9 })
      .toBuffer()
    fs.writeFileSync(outPng, buf)
    const b64 = buf.toString('base64')
    fs.writeFileSync(path.join(B64, `${id}.txt`), b64)
    console.log(`${id}  ${buf.length}B  b64=${b64.length}`)
  }
  console.log(`\n${ids.length} NPC refs → ${OUT}`)
}

run()
