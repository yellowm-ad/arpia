// 사용법: node scripts/trim-props.mjs <props 하위 폴더> <파일 접두어>  → 투명 여백 트림 + 실제 px 크기 출력
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
const [, , sub, prefix] = process.argv
const dir = path.resolve('public/images/map/props', sub)
for (const f of fs.readdirSync(dir).filter((n) => n.startsWith(prefix) && n.endsWith('.png') && !n.endsWith('_f.png'))) {
  const p = path.join(dir, f)
  const buf = await sharp(p).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
  await sharp(buf.data).toFile(p + '.tmp')
  fs.renameSync(p + '.tmp', p)
  console.log(f, buf.info.width + 'x' + buf.info.height)
}
