'use client'

import { GameProvider, useGame } from '@/lib/game-state'
import { TitleScreen } from '@/components/game/title-screen'
import { CreateScreen } from '@/components/game/create-screen'
import { WorldScreen } from '@/components/game/world-screen'
import { BattleScreen } from '@/components/game/battle-screen'
import { Hud } from '@/components/game/hud'
import { DialogueScreen } from '@/components/game/dialogue-screen'
import { ShopScreen } from '@/components/game/shop-screen'
import { InventoryScreen } from '@/components/game/inventory-screen'
import { CharacterScreen } from '@/components/game/character-screen'
import { PartyScreen } from '@/components/game/party-screen'
import { TamerScreen } from '@/components/game/tamer-screen'
import { SettingsScreen } from '@/components/game/settings-screen'
import { Toast } from '@/components/game/toast'

function GameShell() {
  const { state } = useGame()

  if (state.screen === 'title') return <TitleScreen />
  if (state.screen === 'create') return <CreateScreen />
  if (state.screen === 'battle') return <BattleScreen />

  return (
    <div className="relative h-full w-full">
      <WorldScreen />
      <Hud />
      <Toast />
      <DialogueScreen />
      <ShopScreen />
      <InventoryScreen />
      <CharacterScreen />
      <PartyScreen />
      <TamerScreen />
      <SettingsScreen />
    </div>
  )
}

export function GameRoot() {
  return (
    <GameProvider>
      <div className="fixed inset-0 h-dvh w-dvw select-none overflow-hidden bg-background">
        <GameShell />
      </div>
    </GameProvider>
  )
}
