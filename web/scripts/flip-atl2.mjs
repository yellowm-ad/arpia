// 좌우반전본 생성 (CSS scaleX(-1) 은 SVG <image> 에서 화면 밖으로 튀어서 미리 뒤집은 PNG를 쓴다)
import sharp from 'sharp'
import path from 'node:path'
const dir = path.resolve('public/images/map/props/atlantis')
for (const f of ['atl2_wallNE', 'atl2_bridge', 'atl_bench_new', 'atl2_stallTeal', 'atl_stall', 'atl_stallB', 'atl_stallC']) {
  await sharp(path.join(dir, f + '.png')).flop().toFile(path.join(dir, f + '_f.png'))
  console.log('flipped', f)
}
