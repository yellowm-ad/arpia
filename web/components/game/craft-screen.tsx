'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { npcById, itemById, RECIPES } from '@/lib/mock-data'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Portrait } from '@/components/game/portrait'
import { rarityGlowStyle } from '@/components/game/ui-motifs'
import { Hammer } from 'lucide-react'

export function CraftScreen() {
  const { state, dispatch } = useGame()
  const npc = state.activeNpcId ? npcById(state.activeNpcId) : null
  if (!npc || state.screen !== 'craft') return null

  const close = () => dispatch({ type: 'CLOSE_OVERLAY' })

  return (
    <Modal open onClose={close} title={`${npc.name}`} widthClass="max-w-2xl">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-gold/70">
          <Portrait id={npc.id} className="h-full w-full" />
        </div>
        <div className="panel-parchment flex-1 p-2.5 text-xs leading-relaxed">{npc.greeting[0]}</div>
      </div>

      {RECIPES.length === 0 ? (
        <div className="panel-parchment flex flex-col items-center gap-2 p-6 text-center text-sm opacity-70">
          <Hammer className="size-6" />
          아직 발견한 레시피가 없습니다.
          <span className="text-xs opacity-60">필드와 보스에게서 재료를 모으면 새 레시피를 만들 수 있어요.</span>
        </div>
      ) : (
        <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto scrollbar-thin pr-1 sm:grid-cols-2">
          {RECIPES.map((recipe) => {
            const output = itemById(recipe.outputItemId)
            if (!output) return null
            const canCraft = recipe.ingredients.every((ing) => {
              const owned = state.inventory.find((s) => s.itemId === ing.itemId)?.qty ?? 0
              return owned >= ing.quantity
            })
            return (
              <div key={recipe.id} className="panel-parchment flex flex-col gap-2 p-3">
                <div className="flex items-center gap-3">
                  <div
                    style={rarityGlowStyle(output.type)}
                    className="rarity-glow flex size-14 shrink-0 items-center justify-center rounded-full border-[3px] border-gold bg-white/45 shadow-[0_0_0_2px_rgba(0,0,0,0.15)]"
                  >
                    <Image src={output.icon} alt={output.name} width={34} height={34} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {output.name}
                      {recipe.outputQuantity > 1 ? ` x${recipe.outputQuantity}` : ''}
                    </div>
                    <div className="truncate text-[11px] opacity-70">{output.description}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-80">
                  {recipe.ingredients.map((ing) => {
                    const item = itemById(ing.itemId)
                    const owned = state.inventory.find((s) => s.itemId === ing.itemId)?.qty ?? 0
                    const enough = owned >= ing.quantity
                    return (
                      <span key={ing.itemId} className={enough ? '' : 'text-destructive'}>
                        {item?.name ?? ing.itemId} {owned}/{ing.quantity}
                      </span>
                    )
                  })}
                </div>

                <Button variant="default" disabled={!canCraft} onClick={() => dispatch({ type: 'CRAFT_ITEM', recipeId: recipe.id })}>
                  제작하기
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
