// skytemple/sk2_*.png 투명 여백 트림 → 실제 px 크기 출력 (skytown-map.ts 카탈로그용)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
const dir = path.resolve('public/images/map/props/skytemple')
for (const f of fs.readdirSync(dir).filter((n) => n.startsWith('sk2_') && n.endsWith('.png') && !n.endsWith('_f.png'))) {
  const p = path.join(dir, f)
  const buf = await sharp(p).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
  await sharp(buf.data).toFile(p + '.tmp')
  fs.renameSync(p + '.tmp', p)
  console.log(f, buf.info.width + 'x' + buf.info.height)
}
