import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '마법학교 울토르 · Magic School Ultor (초안)',
  description:
    '쿼터뷰 턴제 RPG 웹게임 초안 — 마법학교를 배경으로 한 파티 기반 턴제 전투 게임',
  generator: 'claude-cowork-draft',
}

export const viewport: Viewport = {
  themeColor: '#0d1024',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap"
        />
      </head>
      <body className="antialiased overflow-hidden">{children}</body>
    </html>
  )
}
