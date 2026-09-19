// atl2_*.png 투명 여백 트림 → 실제 px 크기 출력 (maps.ts ATLANTIS_SPRITE px 용)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
const dir = path.resolve('public/images/map/props/atlantis')
for (const f of fs.readdirSync(dir).filter((n) => n.startsWith('atl2_') && n.endsWith('.png'))) {
  const p = path.join(dir, f)
  const buf = await sharp(p).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
  await sharp(buf.data).toFile(p + '.tmp')
  fs.renameSync(p + '.tmp', p)
  console.log(f, buf.info.width + 'x' + buf.info.height)
}
