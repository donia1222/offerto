import { useEffect } from 'react'
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
import { Colors } from '../constants/colors'

SplashScreen.preventAutoHideAsync()

const deviceLocale: string =
  (Platform.OS === 'ios'
    ? NativeModules.SettingsManager?.settings?.AppleLocale
      || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
    : NativeModules.I18nManager?.localeIdentifier) ?? 'de'

const deviceLang    = deviceLocale.substring(0, 2).toLowerCase()
const supportedLang = ['de', 'fr', 'it'].includes(deviceLang) ? deviceLang : 'de'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
    },
    lng:          supportedLang,
    fallbackLng:  'de',
    interpolation: { escapeValue: false },
  })
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Bold':     PlusJakartaSans_700Bold,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'Inter-Regular':            Inter_400Regular,
    'Inter-Medium':             Inter_500Medium,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

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
