import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppLang = 'de' | 'fr' | 'it' | 'en'

interface SettingsState {
  language:     AppLang
  canton:       string
  activeStores: string[]
  compactMode:  boolean
  showMwst:     boolean
  setLanguage:     (l: AppLang) => void
  setCanton:       (c: string) => void
  setActiveStores: (s: string[]) => void
  toggleStore:     (slug: string) => void
  setCompactMode:  (v: boolean) => void
  setShowMwst:     (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language:     'de',
      canton:       'Alle',
      activeStores: ['aligro', 'topcc', 'transgourmet'],
      compactMode:  false,
      showMwst:     false,

      setLanguage:     (language)     => set({ language }),
      setCanton:       (canton)       => set({ canton }),
      setActiveStores: (activeStores) => set({ activeStores }),
      toggleStore:     (slug)         => set({
        activeStores: get().activeStores.includes(slug)
          ? get().activeStores.filter(s => s !== slug)
          : [...get().activeStores, slug],
      }),
      setCompactMode:  (compactMode)  => set({ compactMode }),
      setShowMwst:     (showMwst)     => set({ showMwst }),
    }),
    {
      name:    'offerto-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
