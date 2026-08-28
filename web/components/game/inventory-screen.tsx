'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGame } from '@/lib/game-state'
import { itemById } from '@/lib/mock-data'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { ItemType } from '@/lib/types'

const TABS: { id: ItemType | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'weapon', label: '무기' },
  { id: 'armor', label: '방어구' },
  { id: 'accessory', label: '장신구' },
  { id: 'potion', label: '물약' },
  { id: 'tool', label: '도구' },
  { id: 'feed', label: '먹이' },
]

export function InventoryScreen() {
  const { state, dispatch } = useGame()
  const [tab, setTab] = useState<ItemType | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  if (state.screen !== 'inventory') return null
  const close = () => dispatch({ type: 'SET_SCREEN', screen: 'world' })

  const slots = state.inventory.filter((s) => {
    const item = itemById(s.itemId)
    if (!item) return false
    return tab === 'all' || item.type === tab
  })

  const GRID_SIZE = 24
  const cells = Array.from({ length: GRID_SIZE }, (_, i) => slots[i] ?? null)
  const selectedItem = selected ? itemById(selected) : null
  const selectedSlot = selected ? state.inventory.find((s) => s.itemId === selected) : null

  return (
    <Modal open onClose={close} title="가방" widthClass="max-w-3xl">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? 'default' : 'outline'} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="grid grid-cols-6 gap-1.5 sm:w-2/3">
          {cells.map((slot, i) => {
            const item = slot ? itemById(slot.itemId) : null
            return (
              <button
                key={i}
                disabled={!item}
                onClick={() => item && setSelected(item.id)}
                className={`relative flex aspect-square items-center justify-center rounded-md border ${
                  selected === item?.id ? 'border-gold bg-primary-soft' : 'border-border bg-black/25'
                } ${item ? 'hover:border-gold/70' : 'opacity-40'}`}
              >
                {item && (
                  <>
                    <Image src={item.icon} alt={item.name} width={26} height={26} />
                    {slot && slot.qty > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-gold-soft">{slot.qty}</span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="panel-parchment flex-1 p-3 text-sm">
          {selectedItem ? (
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-md bg-white/40">
                  <Image src={selectedItem.icon} alt={selectedItem.name} width={24} height={24} />
                </div>
                <div>
                  <div className="font-semibold">{selectedItem.name}</div>
                  <div className="text-[11px] opacity-60">보유 {selectedSlot?.qty ?? 0}개</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-80">{selectedItem.description}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {(selectedItem.type === 'weapon' || selectedItem.type === 'armor' || selectedItem.type === 'accessory') && (
                  <Button
                    size="sm"
                    onClick={() =>
                      dispatch({
                        type: 'EQUIP_ITEM',
                        itemId: selectedItem.id,
                        slot: selectedItem.type as 'weapon' | 'armor' | 'accessory',
                      })
                    }
                  >
                    장착
                  </Button>
                )}
                {selectedItem.type === 'potion' && (
                  <Button size="sm" onClick={() => dispatch({ type: 'USE_ITEM_FIELD', itemId: selectedItem.id })}>
                    사용
                  </Button>
                )}
                {selectedItem.type === 'feed' && (
                  <Button size="sm" onClick={() => dispatch({ type: 'USE_ITEM_FIELD', itemId: selectedItem.id })}>
                    먹이 주기
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'SELL_ITEM', itemId: selectedItem.id })}>
                  판매 ({selectedItem.sellPrice}G)
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs opacity-50">아이템을 선택하세요</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  )
}
