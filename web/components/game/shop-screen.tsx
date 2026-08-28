'use client'

import Image from 'next/image'
import { useGame } from '@/lib/game-state'
import { npcById, itemById } from '@/lib/mock-data'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins } from 'lucide-react'

export function ShopScreen() {
  const { state, dispatch } = useGame()
  const npc = state.activeShopId ? npcById(state.activeShopId) : null
  if (!npc || !npc.shopItemIds) return null

  const close = () => dispatch({ type: 'CLOSE_OVERLAY' })

  return (
    <Modal open onClose={close} title={`${npc.name}의 상점`} widthClass="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">보유 골드</div>
        <Badge className="text-sm">
          <Coins className="size-3.5" /> {state.player.gold.toLocaleString()} G
        </Badge>
      </div>

      <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto scrollbar-thin pr-1 sm:grid-cols-2">
        {npc.shopItemIds.map((id) => {
          const item = itemById(id)
          if (!item) return null
          const owned = state.inventory.find((s) => s.itemId === id)?.qty ?? 0
          return (
            <div key={id} className="panel-parchment flex items-center gap-2.5 p-2.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-black/20 bg-white/40">
                <Image src={item.icon} alt={item.name} width={26} height={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{item.name}</div>
                <div className="truncate text-[11px] opacity-70">{item.description}</div>
                {owned > 0 && <div className="text-[10px] opacity-60">보유: {owned}개</div>}
              </div>
              <Button
                size="sm"
                variant="default"
                disabled={state.player.gold < item.price}
                onClick={() => dispatch({ type: 'BUY_ITEM', itemId: id })}
              >
                {item.price}G
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
