import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppLang = 'de' | 'fr' | 'it' | 'en'

interface SettingsState {
  language:          AppLang
  canton:            string
  activeStores:      string[]
  visibleCategories: string[] // empty = all visible
  compactMode:       boolean
  showMwst:          boolean
  setLanguage:          (l: AppLang) => void
  setCanton:            (c: string) => void
  setActiveStores:      (s: string[]) => void
  toggleStore:          (slug: string) => void
  toggleVisibleCategory:(slug: string) => void
  setCompactMode:       (v: boolean) => void
  setShowMwst:          (v: boolean) => void
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

      setLanguage:     (language)     => set({ language }),
      setCanton:       (canton)       => set({ canton }),
      setActiveStores: (activeStores) => set({ activeStores }),
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
      version: 2,
      migrate: (state: any, version: number) => {
        if (version < 2) {
          // Quitar transgourmet de activeStores hasta tener imágenes
          state.activeStores = (state.activeStores ?? ['aligro', 'topcc'])
            .filter((s: string) => s !== 'transgourmet')
        }
        return state
      },
    }
  )
)
