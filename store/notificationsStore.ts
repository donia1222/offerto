import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface NotifState {
  enabled:    boolean
  weekly:     boolean
  expiring:   boolean
  categories: string[]
  stores:     string[]
  watchlist:  string[]

  setEnabled:      (v: boolean) => void
  setWeekly:       (v: boolean) => void
  setExpiring:     (v: boolean) => void
  toggleCategory:  (slug: string) => void
  toggleStore:     (slug: string) => void
  addWatch:        (term: string) => void
  removeWatch:     (term: string) => void
}

export const useNotificationsStore = create<NotifState>()(
  persist(
    (set, get) => ({
      enabled:    true,
      weekly:     true,
      expiring:   true,
      categories: ['fleisch', 'fisch', 'gemuese', 'milch', 'bakery', 'getraenke', 'snacks', 'haushalt', 'hygiene', 'tierfutter'],
      stores:     ['aligro', 'topcc', 'transgourmet'],
      watchlist:  [],

      setEnabled:     (enabled)    => set({ enabled }),
      setWeekly:      (weekly)     => set({ weekly }),
      setExpiring:    (expiring)   => set({ expiring }),
      toggleCategory: (slug)       => set({
        categories: get().categories.includes(slug)
          ? get().categories.filter(c => c !== slug)
          : [...get().categories, slug],
      }),
      toggleStore: (slug) => set({
        stores: get().stores.includes(slug)
          ? get().stores.filter(s => s !== slug)
          : [...get().stores, slug],
      }),
      addWatch:    (term) => {
        const t = term.trim().toLowerCase()
        if (!t || get().watchlist.includes(t)) return
        set({ watchlist: [...get().watchlist, t] })
      },
      removeWatch: (term) => set({ watchlist: get().watchlist.filter(w => w !== term) }),
    }),
    {
      name:    'offerto-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
