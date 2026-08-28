'use client'

import { useEffect } from 'react'
import { useGame } from '@/lib/game-state'

export function Toast() {
  const { state, dispatch } = useGame()

  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2400)
    return () => clearTimeout(t)
  }, [state.toast, dispatch])

  if (!state.toast) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center">
      <div className="panel-gilded animate-in fade-in px-4 py-2 text-sm text-gold-soft">{state.toast}</div>
    </div>
  )
}
