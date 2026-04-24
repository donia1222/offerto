import React, { useRef, useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Animated, Pressable, Image, useWindowDimensions,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'
import { useSidebarStore } from '../store/sidebarStore'

const ACCESS_CODE = process.env.EXPO_PUBLIC_WEB_ACCESS_CODE ?? ''
const STORAGE_KEY = 'offerto_web_access'

function WebGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode]     = useState('')
  const [error, setError]   = useState(false)

  const submit = () => {
    if (code.trim() === ACCESS_CODE) {
      try { localStorage.setItem(STORAGE_KEY, 'granted') } catch {}
      onUnlock()
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
          können auf die Inhalte zugreifen. Nur Personen mit einem gültigen Code
          haben Zugang.
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

const SIDEBAR_WIDTH = 240
const DESKTOP_BREAKPOINT = 768

const NAV_ITEMS = [
  { label: 'Angebote',      icon: 'list-outline' as const,      iconActive: 'list' as const,      href: '/(tabs)/' },
  { label: 'Kataloge',      icon: 'newspaper-outline' as const, iconActive: 'newspaper' as const, href: '/(tabs)/kataloge' },
  { label: 'Einkaufsliste', icon: 'cart-outline' as const,      iconActive: 'cart' as const,      href: '/(tabs)/list' },
  { label: 'Einstellungen', icon: 'settings-outline' as const,  iconActive: 'settings' as const,  href: '/(tabs)/settings' },
]

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const { width }  = useWindowDimensions()
  const isDesktop  = width >= DESKTOP_BREAKPOINT
  const router     = useRouter()
  const pathname   = usePathname()
  const cartCount  = useListStore(s => s.items.length)
  const insets     = useSafeAreaInsets()
  const { open, openSidebar, closeSidebar } = useSidebarStore()

  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'granted' } catch { return false }
  })

  if (!unlocked) return <WebGate onUnlock={() => setUnlocked(true)} />

  const slideAnim   = useRef(new Animated.Value(SIDEBAR_WIDTH)).current
  const overlayAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isDesktop) { closeSidebar(); return }
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: open ? 0 : SIDEBAR_WIDTH,
        useNativeDriver: true, damping: 20, stiffness: 200,
      }),
      Animated.timing(overlayAnim, {
        toValue: open ? 1 : 0,
        duration: 200, useNativeDriver: true,
      }),
    ]).start()
  }, [open, isDesktop])

  const navigate = (href: string) => {
    closeSidebar()
    router.push(href as any)
  }

  const isActive = (href: string) =>
    href === '/(tabs)/'
      ? pathname === '/' || pathname === ''
      : pathname.includes(href.replace('/(tabs)', ''))

  // Desktop: no extra header — each screen has its own with WebNavTabs inside
  if (isDesktop) {
    return <View style={{ flex: 1 }}>{children}</View>
  }

  // Mobile web: floating burger top-right + slide-in sidebar from right
  return (
    <View style={styles.root}>
      {children}

      {/* Burger/close — aligned with titleRow content via insets + paddingTop */}
      <View style={[styles.burgerWrap, { paddingTop: insets.top + 15 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.burgerBtn}
          onPress={open ? closeSidebar : openSidebar}
          activeOpacity={0.8}
        >
          <Ionicons name={open ? 'close' : 'menu'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Overlay */}
      {open && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar from right */}
      <Animated.View style={[styles.mobileSidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={require('../assets/images/icon.png')} style={styles.sidebarLogo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sidebarTitle}>Offerto</Text>
            <Text style={styles.sidebarSub}>Alle Angebote. Eine App.</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <TouchableOpacity
                key={item.href}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => navigate(item.href)}
              >
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={20}
                  color={active ? Colors.primary : Colors.textMedium}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {item.href.includes('list') && cartCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.sidebarFooter}>
          <Text style={styles.footerText}>© 2026 Offerto · CHF 4.99</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Burger button
  burgerWrap: {
    position: 'absolute', top: 0, right: 0,
    zIndex: 50,
    paddingTop: 10, paddingRight: 12,
  },
  burgerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E2001A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },

  // Sidebar
  mobileSidebar: {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.surface,
    zIndex: 30,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 }, elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, paddingTop: 28,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sidebarLogo:  { width: 36, height: 36, borderRadius: 9 },
  sidebarTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, color: Colors.textDark },
  sidebarSub:   { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textMedium },

  // Nav
  navSection: { paddingHorizontal: 10, paddingTop: 8, gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  navItemActive: { backgroundColor: Colors.primaryLight },
  navLabel:      { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, flex: 1 },
  navLabelActive: { color: Colors.primary },
  navBadge: {
    backgroundColor: '#E2001A', minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  navBadgeText: { fontSize: 10, color: '#fff', fontFamily: 'Inter-Medium' },

  // Footer
  sidebarFooter: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  footerText:    { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textLight },
})

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
