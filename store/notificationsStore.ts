import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  cancelAll, requestPermissions,
  scheduleWeekly, cancelWeekly,
  scheduleExpiringReminder, cancelExpiringReminder,
} from '../services/notificationsService'

const W_TITLE = 'Offerto 🛒'
const W_BODY  = 'Neue Angebote diese Woche — jetzt entdecken!'
const E_TITLE = 'Offerto ⏰'
const E_BODY  = 'Einige Angebote laufen morgen ab!'

interface NotifState {
  enabled:    boolean
  weekly:     boolean
  expiring:   boolean
  categories: string[]
  stores:     string[]
  watchlist:  string[]

  setEnabled:     (v: boolean) => void
  setWeekly:      (v: boolean) => void
  setExpiring:    (v: boolean) => void
  toggleCategory: (slug: string) => void
  toggleStore:    (slug: string) => void
  addWatch:       (term: string) => void
  removeWatch:    (term: string) => void
}

export const useNotificationsStore = create<NotifState>()(
  persist(
    (set, get) => ({
      enabled:    false,
      weekly:     true,
      expiring:   true,
      categories: ['fleisch', 'fisch'],
      stores:     ['aligro', 'topcc', 'transgourmet'],
      watchlist:  [],

      setEnabled: async (enabled) => {
        if (enabled) {
          set({ enabled: true })
          const granted = await requestPermissions()
          if (!granted) {
            set({ enabled: false })
            return
          }
          const { weekly, expiring } = get()
          if (weekly)   scheduleWeekly(W_TITLE, W_BODY)
          if (expiring) scheduleExpiringReminder(E_TITLE, E_BODY)
        } else {
          set({ enabled: false })
          cancelAll()
        }
      },

      setWeekly: (weekly) => {
        set({ weekly })
        if (!get().enabled) return
        if (weekly) scheduleWeekly(W_TITLE, W_BODY)
        else        cancelWeekly()
      },

      setExpiring: (expiring) => {
        set({ expiring })
        if (!get().enabled) return
        if (expiring) scheduleExpiringReminder(E_TITLE, E_BODY)
        else          cancelExpiringReminder()
      },

      toggleCategory: (slug) => set({
        categories: get().categories.includes(slug)
          ? get().categories.filter(c => c !== slug)
          : [...get().categories, slug],
      }),

      toggleStore: (slug) => set({
        stores: get().stores.includes(slug)
          ? get().stores.filter(s => s !== slug)
          : [...get().stores, slug],
      }),

      addWatch: (term) => {
        const t = term.trim().toLowerCase()
        if (!t || get().watchlist.includes(t)) return
        set({ watchlist: [...get().watchlist, t] })
      },

      removeWatch: (term) => set({
        watchlist: get().watchlist.filter(w => w !== term),
      }),
    }),
    {
      name:    'offerto-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
