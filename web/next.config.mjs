/** @type {import('next').NextConfig} */
const nextConfig = {
  // 초안(draft) 단계: 타입 경고로 빌드가 막히지 않도록 함
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 더블클릭 실행/정적 호스팅이 모두 가능하도록 정적 export 사용
  output: 'export',
  trailingSlash: true,
}

export default nextConfig
