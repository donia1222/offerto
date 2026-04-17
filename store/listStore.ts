import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Offer } from '../types'

export interface ListItem {
  offer:     Offer
  cantidad:  number
  comprado:  boolean
}

interface ListState {
  items:          ListItem[]
  add:            (offer: Offer) => void
  remove:         (id: number) => void
  toggleComprado: (id: number) => void
  setCantidad:    (id: number, n: number) => void
  clearAll:       () => void
  clearComprado:  () => void
  isInList:       (id: number) => boolean
}

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (offer) => {
        if (get().items.some(i => i.offer.id === offer.id)) return
        set({ items: [{ offer, cantidad: 1, comprado: false }, ...get().items] })
      },

      remove: (id) => set({ items: get().items.filter(i => i.offer.id !== id) }),

      toggleComprado: (id) => set({
        items: get().items.map(i => i.offer.id === id ? { ...i, comprado: !i.comprado } : i),
      }),

      setCantidad: (id, n) => set({
        items: get().items.map(i => i.offer.id === id ? { ...i, cantidad: Math.max(1, n) } : i),
      }),

      clearAll:      () => set({ items: [] }),
      clearComprado: () => set({ items: get().items.filter(i => !i.comprado) }),
      isInList:      (id) => get().items.some(i => i.offer.id === id),
    }),
    {
      name:    'offerto-list',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
