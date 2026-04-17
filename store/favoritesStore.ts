import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Offer } from '../types'

interface FavoritesState {
  favorites: Offer[]
  toggle:    (offer: Offer) => void
  isFav:     (id: number) => boolean
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggle: (offer) => {
        const exists = get().favorites.some(f => f.id === offer.id)
        set({
          favorites: exists
            ? get().favorites.filter(f => f.id !== offer.id)
            : [offer, ...get().favorites],
        })
      },

      isFav: (id) => get().favorites.some(f => f.id === id),
    }),
    {
      name:    'offerto-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
