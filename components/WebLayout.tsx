import React, { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable, Image, Platform,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'

const SIDEBAR_WIDTH = 260

const NAV_ITEMS = [
  { label: 'Angebote',        icon: 'list-outline' as const,         iconActive: 'list' as const,          href: '/(tabs)/' },
  { label: 'Kataloge',        icon: 'newspaper-outline' as const,    iconActive: 'newspaper' as const,     href: '/(tabs)/kataloge' },
  { label: 'Einkaufsliste',   icon: 'cart-outline' as const,         iconActive: 'cart' as const,          href: '/(tabs)/list' },
  { label: 'Einstellungen',   icon: 'settings-outline' as const,     iconActive: 'settings' as const,      href: '/(tabs)/settings' },
]

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const cartCount = useListStore(s => s.items.length)

  const [open, setOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current
  const overlayAnim = useRef(new Animated.Value(0)).current

  const openSidebar = () => {
    setOpen(true)
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
  }

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: -SIDEBAR_WIDTH, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setOpen(false))
  }

  const navigate = (href: string) => {
    closeSidebar()
    router.push(href as any)
  }

  const isActive = (href: string) => {
    if (href === '/(tabs)/') return pathname === '/' || pathname === ''
    return pathname.includes(href.replace('/(tabs)', ''))
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.burgerBtn} hitSlop={8}>
          <Ionicons name="menu" size={26} color={Colors.textDark} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImg} />
          <Text style={styles.logoText}>Offerto</Text>
          <Text style={styles.logoProfi}>PROFI</Text>
        </View>

        <View style={styles.headerRight}>
          {cartCount > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/list' as any)} style={styles.cartBtn}>
              <Ionicons name="cart" size={22} color={Colors.primary} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Overlay */}
      {open && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayAnim }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={require('../assets/images/icon.png')} style={styles.sidebarLogo} />
          <View>
            <Text style={styles.sidebarTitle}>Offerto</Text>
            <Text style={styles.sidebarSub}>Alle Angebote. Eine App.</Text>
          </View>
          <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textMedium} />
          </TouchableOpacity>
        </View>

        <View style={styles.navItems}>
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
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    height: 56,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 10,
  },
  burgerBtn: { padding: 4, marginRight: 12 },
  logoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 28, height: 28, borderRadius: 7 },
  logoText: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, color: Colors.textDark },
  logoProfi: { fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.primary, letterSpacing: 1.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBtn: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: '#E2001A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: { fontSize: 8, color: '#fff', fontFamily: 'Inter-Medium' },

  content: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
    top: 56,
  },

  sidebar: {
    position: 'absolute',
    top: 56,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.surface,
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sidebarLogo: { width: 40, height: 40, borderRadius: 10 },
  sidebarTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.textDark },
  sidebarSub: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMedium },
  closeBtn: { marginLeft: 'auto', padding: 4 },

  navItems: { padding: 12, gap: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: Colors.primaryLight },
  navLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium, flex: 1 },
  navLabelActive: { color: Colors.primary },
  navBadge: {
    backgroundColor: '#E2001A',
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: { fontSize: 10, color: '#fff', fontFamily: 'Inter-Medium' },

  sidebarFooter: {
    position: 'absolute',
    bottom: 20,
    left: 0, right: 0,
    alignItems: 'center',
  },
  footerText: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
})
