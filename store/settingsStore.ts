import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppLang    = 'de' | 'fr' | 'it' | 'en'
export type CardLayout = 'list' | 'grid' | 'compact'

interface SettingsState {
  language:          AppLang
  canton:            string
  activeStores:      string[]
  visibleCategories: string[]
  compactMode:       boolean
  showMwst:          boolean
  cardLayout:        CardLayout
  setLanguage:          (l: AppLang) => void
  setCanton:            (c: string) => void
  setActiveStores:      (s: string[]) => void
  toggleStore:          (slug: string) => void
  toggleVisibleCategory:(slug: string) => void
  setCompactMode:       (v: boolean) => void
  setShowMwst:          (v: boolean) => void
  setCardLayout:        (v: CardLayout) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language:          'de',
      canton:            'Alle',
      activeStores:      ['aligro', 'topcc'],
      visibleCategories: ['fleisch','fisch','gemuese','milch','bakery','getraenke','snacks','haushalt','hygiene','tierfutter'],
      compactMode:       false,
      showMwst:          false,
      cardLayout:        'grid',

      setLanguage:     (language)     => set({ language }),
      setCanton:       (canton)       => set({ canton }),
      setActiveStores: (activeStores) => set({ activeStores }),
      setCardLayout:   (cardLayout)   => set({ cardLayout }),
      toggleStore:     (slug)         => set({
        activeStores: get().activeStores.includes(slug)
          ? get().activeStores.filter(s => s !== slug)
          : [...get().activeStores, slug],
      }),
      toggleVisibleCategory: (slug) => set({
        visibleCategories: get().visibleCategories.includes(slug)
          ? get().visibleCategories.filter(s => s !== slug)
          : [...get().visibleCategories, slug],
      }),
      setCompactMode:  (compactMode)  => set({ compactMode }),
      setShowMwst:     (showMwst)     => set({ showMwst }),
    }),
    {
      name:    'offerto-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (state: any, version: number) => {
        if (version < 2) {
          state.activeStores = (state.activeStores ?? ['aligro', 'topcc'])
            .filter((s: string) => s !== 'transgourmet')
        }
        if (version < 3) {
          state.cardLayout = 'grid'
        }
        return state
      },
    }
  )
)
