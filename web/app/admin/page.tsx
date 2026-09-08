import type { Metadata } from 'next'
import { AdminRoot } from '@/components/game/admin-root'

export const metadata: Metadata = {
  title: '관리자 테스트 · 마법학교 울토르',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminRoot />
}
