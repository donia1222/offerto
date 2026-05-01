import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Image, useWindowDimensions,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'
import { useNotificationsStore } from '../store/notificationsStore'

const ACCESS_CODE = process.env.EXPO_PUBLIC_WEB_ACCESS_CODE ?? ''
const STORAGE_KEY = 'offerto_web_access'

function WebGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode]   = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (code.trim() === ACCESS_CODE) {
      try {
        localStorage.setItem(STORAGE_KEY, 'granted')
        window.location.reload()
      } catch { onUnlock() }
    } else {
      setError(true)
      setCode('')
    }
  }

  return (
    <View style={gate.root}>
      <View style={gate.card}>
        <Image source={require('../assets/images/icon.png')} style={gate.logo} />
        <Text style={gate.appName}>Offerto</Text>
        <Text style={gate.tagline}>Alle Angebote. Eine App.</Text>
        <View style={gate.divider} />
        <Text style={gate.heading}>🔒 Web-Version – In Entwicklung</Text>
        <Text style={gate.body}>
          Diese Web-Version befindet sich derzeit in der Entwicklung und ist noch
          nicht öffentlich zugänglich.{'\n\n'}
          Der Inhalt ist aus rechtlichen Gründen – insbesondere wegen der
          Bildrechte und der Kooperationsvereinbarungen mit den Anbietern –
          ausschliesslich für autorisierte Entwickler und Partner einsehbar.{'\n\n'}
          Wenn Sie einen Zugangscode besitzen, sind Sie ein Anbieter-Partner und
          können auf die Inhalte zugreifen.
        </Text>
        <TextInput
          style={[gate.input, error && gate.inputError]}
          placeholder="Zugangscode eingeben…"
          placeholderTextColor={Colors.textLight}
          value={code}
          onChangeText={t => { setCode(t); setError(false) }}
          onSubmitEditing={submit}
          secureTextEntry
          autoCapitalize="none"
        />
        {error && <Text style={gate.errorText}>Ungültiger Code. Bitte erneut versuchen.</Text>}
        <TouchableOpacity style={gate.btn} onPress={submit} activeOpacity={0.85}>
          <Text style={gate.btnText}>Bestätigen</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Nav items shared by mobile bottom tabs + desktop top nav ───────────────
const NAV_ITEMS = [
  { label: 'Angebote',      icon: 'list-outline' as const,         iconActive: 'list' as const,         href: '/(tabs)/' },
  { label: 'Kataloge',      icon: 'newspaper-outline' as const,    iconActive: 'newspaper' as const,    href: '/(tabs)/kataloge' },
  { label: 'Einkaufsliste', icon: 'cart-outline' as const,         iconActive: 'cart' as const,         href: '/(tabs)/list' },
  { label: 'Einstellungen', icon: 'settings-outline' as const,     iconActive: 'settings' as const,     href: '/(tabs)/settings' },
]

const DESKTOP_BREAKPOINT = 768
const WEBSITE_HEADER_H   = 64
const MOBILE_TAB_H       = 64

// ─── Desktop: full website header ────────────────────────────────────────────
function WebsiteHeader() {
  const router   = useRouter()
  const pathname = usePathname()
  const cartCount  = useListStore(s => s.items.length)
  const notifCount = useNotificationsStore(s => s.watchlist.length)

  const isActive = (href: string) =>
    href === '/(tabs)/'
      ? pathname === '/' || pathname === '' || pathname === '/index'
      : pathname.includes(href.replace('/(tabs)', ''))

  return (
    <View style={deskHeader.wrap}>
      <View style={deskHeader.inner}>
        {/* Logo + brand */}
        <TouchableOpacity style={deskHeader.brand} onPress={() => router.push('/(tabs)/' as any)} activeOpacity={0.8}>
          <Image source={require('../assets/images/icon.png')} style={deskHeader.logo} />
          <View>
            <Text style={deskHeader.brandName}>Offerto</Text>
            <Text style={deskHeader.brandSub}>Alle Angebote. Eine App.</Text>
          </View>
        </TouchableOpacity>

        {/* Nav links */}
        <View style={deskHeader.nav}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const badge =
              item.href.includes('list')  ? cartCount  :
              item.href.includes('notif') ? notifCount : 0
            return (
              <TouchableOpacity
                key={item.href}
                style={[deskHeader.navItem, active && deskHeader.navItemActive]}
                onPress={() => router.push(item.href as any)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={16}
                  color={active ? Colors.primary : Colors.textMedium}
                />
                <Text style={[deskHeader.navLabel, active && deskHeader.navLabelActive]}>
                  {item.label}
                </Text>
                {badge > 0 && (
                  <View style={deskHeader.badge}>
                    <Text style={deskHeader.badgeText}>{badge > 99 ? '99' : badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ─── Mobile web: bottom tab bar identical to native app ───────────────────────
function MobileBottomTabs() {
  const router     = useRouter()
  const pathname   = usePathname()
  const insets     = useSafeAreaInsets()
  const cartCount  = useListStore(s => s.items.length)
  const notifCount = useNotificationsStore(s => s.watchlist.length)
  const notifsEnabled = useNotificationsStore(s => s.enabled)

  const isActive = (href: string) =>
    href === '/(tabs)/'
      ? pathname === '/' || pathname === '' || pathname === '/index'
      : pathname.includes(href.replace('/(tabs)', ''))

  const tabs = [
    ...NAV_ITEMS,
    ...(notifsEnabled ? [{ label: 'Alarm', icon: 'notifications-outline' as const, iconActive: 'notifications' as const, href: '/(tabs)/notifications' }] : []),
  ]

  return (
    <View style={[mobileTab.wrap, { paddingBottom: insets.bottom }]}>
      {tabs.map(item => {
        const active = isActive(item.href)
        const badge =
          item.href.includes('list')  ? cartCount  :
          item.href.includes('notif') ? notifCount : 0
        return (
          <TouchableOpacity
            key={item.href}
            style={mobileTab.tab}
            onPress={() => router.push(item.href as any)}
            activeOpacity={0.75}
          >
            <View style={[mobileTab.iconWrap, active && mobileTab.iconWrapActive]}>
              <Ionicons
                name={active ? item.iconActive : item.icon}
                size={24}
                color={active ? '#fff' : Colors.textLight}
              />
              {badge > 0 && (
                <View style={mobileTab.badge}>
                  <Text style={mobileTab.badgeText}>{badge > 99 ? '99' : badge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Main layout export ───────────────────────────────────────────────────────
export default function WebLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions()
  const isDesktop = width >= DESKTOP_BREAKPOINT

  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'granted' } catch { return false }
  })

  if (!unlocked) return <WebGate onUnlock={() => setUnlocked(true)} />

  // Desktop: sticky website header on top, 80% centered content below
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <WebsiteHeader />
        <View style={{ flex: 1, marginTop: WEBSITE_HEADER_H, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '80%' }}>
            {children}
          </View>
        </View>
      </View>
    )
  }

  // Mobile web: content + bottom tab bar (identical to native app)
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
      <MobileBottomTabs />
    </View>
  )
}

// ─── Styles: desktop header ──────────────────────────────────────────────────
const deskHeader = StyleSheet.create({
  wrap: {
    position:        'absolute',
    top:             0, left: 0, right: 0,
    height:          WEBSITE_HEADER_H,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex:          100,
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  inner: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 24,
    maxWidth:        1280,
    alignSelf:       'center',
    width:           '100%',
  },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logo: { width: 36, height: 36, borderRadius: 9 },
  brandName: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 17, color: Colors.textDark,
  },
  brandSub: {
    fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textMedium,
  },
  nav: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  navLabel: {
    fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium,
  },
  navLabelActive: {
    color: Colors.primary, fontFamily: 'Inter-SemiBold',
  },
  badge: {
    backgroundColor: '#E2001A', minWidth: 17, height: 17, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: 'Inter-Medium' },
})

// ─── Styles: mobile bottom tabs ──────────────────────────────────────────────
const mobileTab = StyleSheet.create({
  wrap: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    shadowColor:     '#000',
    shadowOpacity:   0.08,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: -4 },
    elevation:       8,
  },
  tab: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingTop:      14,
    paddingBottom:   6,
    height:          MOBILE_TAB_H,
  },
  iconWrap: {
    width:           44,
    height:          44,
    borderRadius:    22,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
  badge: {
    position: 'absolute', top: 1, right: 1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E2001A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontFamily: 'Inter-Medium', color: '#fff', lineHeight: 12 },
})

// ─── Styles: gate screen ─────────────────────────────────────────────────────
const gate = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: 24,
  },
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  logo:     { width: 64, height: 64, borderRadius: 16, marginBottom: 10 },
  appName:  { fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, color: Colors.textDark },
  tagline:  { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMedium, marginBottom: 20 },
  divider:  { height: 1, backgroundColor: Colors.border, width: '100%', marginBottom: 20 },
  heading:  { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: Colors.textDark, marginBottom: 12, textAlign: 'center' },
  body: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMedium,
    lineHeight: 20, textAlign: 'center', marginBottom: 24,
  },
  input: {
    width: '100%', height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, backgroundColor: Colors.background,
    fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark,
    marginBottom: 8,
  },
  inputError:  { borderColor: Colors.error },
  errorText:   { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.error, marginBottom: 12, alignSelf: 'flex-start' },
  btn: {
    width: '100%', height: 46, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
})
