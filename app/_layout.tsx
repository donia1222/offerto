import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { NativeModules, Platform } from 'react-native'

import de from '../locales/de.json'
import fr from '../locales/fr.json'
import it from '../locales/it.json'
import en from '../locales/en.json'
import { Colors } from '../constants/colors'
import AppLoader from '../components/AppLoader'
import Onboarding from '../components/Onboarding'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { requestPermissions, registerToken, scheduleWeekly, scheduleExpiringReminder, checkWatchlist, checkStores } from '../services/notificationsService'
import * as Updates from 'expo-updates'

SplashScreen.preventAutoHideAsync()

const deviceLocale: string =
  (Platform.OS === 'ios'
    ? NativeModules.SettingsManager?.settings?.AppleLocale
      || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
    : NativeModules.I18nManager?.localeIdentifier) ?? 'de'

const deviceLang    = deviceLocale.substring(0, 2).toLowerCase()
const supportedLang = ['de', 'fr', 'it', 'en'].includes(deviceLang) ? deviceLang : 'de'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      en: { translation: en },
    },
    lng:          supportedLang,
    fallbackLng:  'de',
    interpolation: { escapeValue: false },
  })
}

export default function RootLayout() {
  const [loaderDone, setLoaderDone]           = useState(false)
  const [onboardingDone, setOnboardingDone]   = useState<boolean | null>(null)
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Bold':     PlusJakartaSans_700Bold,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'Inter-Regular':            Inter_400Regular,
    'Inter-Medium':             Inter_500Medium,
  })

  useEffect(() => {
    AsyncStorage.getItem('offerto-onboarding-done').then(v => setOnboardingDone(v === 'true'))
  }, [])

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch {}
    }
    if (!__DEV__) checkForUpdates()
  }, [])

  useEffect(() => {
    AsyncStorage.getItem('offerto-settings').then(raw => {
      if (!raw) return
      try {
        const stored = JSON.parse(raw)
        const lang = stored?.state?.language
        if (lang && ['de','fr','it','en'].includes(lang)) i18n.changeLanguage(lang)
      } catch {}
    })

    if (!loaderDone) return
    AsyncStorage.getItem('offerto-notifications').then(async raw => {
      try {
        const state = JSON.parse(raw ?? '{}')?.state ?? {}

        if (!state.enabled) return

        const granted = await requestPermissions()

        if (granted) {
          registerToken(
            state.stores     ?? [],
            state.categories ?? [],
            state.watchlist  ?? [],
          )
        }

        if (!granted) return
        if (state.weekly   !== false) scheduleWeekly('Offerto 🛒', 'Neue Angebote diese Woche — jetzt entdecken!')
        if (state.expiring !== false) scheduleExpiringReminder('Offerto ⏰', 'Einige Angebote laufen morgen ab!')

        const today = new Date().toISOString().slice(0, 10)
        const notifiedRaw = await AsyncStorage.getItem('offerto-notified-' + today)
        const notifiedToday: string[] = notifiedRaw ? JSON.parse(notifiedRaw) : []

        // Solo notificar tiendas que no hayan sido notificadas hoy
        const pendingStores = (state.stores ?? []).filter((s: string) => !notifiedToday.includes(s))
        if (pendingStores.length) {
          await AsyncStorage.setItem('offerto-notified-' + today, JSON.stringify([...notifiedToday, ...pendingStores]))
          checkStores(
            pendingStores,
            'Offerto 🏪',
            (s) => `Neue Angebote bei ${s.map((slug: string) =>
              slug === 'aligro' ? 'Aligro' : slug === 'topcc' ? 'TopCC' : 'Transgourmet'
            ).join(', ')}!`,
          )
        }

        // Solo notificar términos watchlist no notificados hoy
        const pendingWatch = (state.watchlist ?? []).filter((w: string) => !notifiedToday.includes('w:' + w))
        if (pendingWatch.length) {
          await AsyncStorage.setItem('offerto-notified-' + today, JSON.stringify([...notifiedToday, ...pendingStores, ...pendingWatch.map((w: string) => 'w:' + w)]))
          checkWatchlist(
            pendingWatch,
            'Offerto 👀',
            (m) => `${m.join(', ')} ${m.length === 1 ? 'ist' : 'sind'} gerade im Angebot!`,
          )
        }
      } catch {}
    })
  }, [loaderDone])

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  // Loader: fuentes listas pero loader animado aún, o estado de onboarding desconocido
  if (!loaderDone || onboardingDone === null) {
    return (
      <>
        <StatusBar style="light" />
        <AppLoader onDone={() => setLoaderDone(true)} />
      </>
    )
  }

  // Onboarding: primera vez — nunca se ve Home
  if (!onboardingDone) {
    return (
      <>
        <StatusBar style="light" />
        <Onboarding lang={supportedLang} onDone={() => setOnboardingDone(true)} />
      </>
    )
  }

  // App normal
  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="settings"
          options={{
            headerShown:  false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            headerShown:      true,
            headerTitle:      'Favoriten',
            headerStyle:      { backgroundColor: Colors.background },
            headerTintColor:  Colors.primary,
            presentation:     'modal',
            headerBackVisible: false,
            headerLeft:       () => null,
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: '#1C1B33' },
          }}
        />
        <Stack.Screen
          name="offer/[id]"
          options={{
            headerShown:       true,
            headerTitle:       '',
            headerStyle:       { backgroundColor: Colors.background },
            headerTintColor:   Colors.primary,
            presentation:      'card',
            headerBackVisible: false,
            headerLeft:        () => null,
            headerTitleAlign:  'left',
            headerTitleStyle:  {
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize:   22,
              color:      '#1C1B33',
            },
          }}
        />
      </Stack>
    </>
  )
}
