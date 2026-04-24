import React, { useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable, Image,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'
import { useSidebarStore } from '../store/sidebarStore'

const SIDEBAR_WIDTH = 260

const NAV_ITEMS = [
  { label: 'Angebote',      icon: 'list-outline' as const,      iconActive: 'list' as const,      href: '/(tabs)/' },
  { label: 'Kataloge',      icon: 'newspaper-outline' as const, iconActive: 'newspaper' as const, href: '/(tabs)/kataloge' },
  { label: 'Einkaufsliste', icon: 'cart-outline' as const,      iconActive: 'cart' as const,      href: '/(tabs)/list' },
  { label: 'Einstellungen', icon: 'settings-outline' as const,  iconActive: 'settings' as const,  href: '/(tabs)/settings' },
]

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter()
  const pathname   = usePathname()
  const cartCount  = useListStore(s => s.items.length)
  const { open, closeSidebar } = useSidebarStore()

  const slideAnim   = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current
  const overlayAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: open ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true, damping: 20, stiffness: 200,
      }),
      Animated.timing(overlayAnim, {
        toValue: open ? 1 : 0,
        duration: 200, useNativeDriver: true,
      }),
    ]).start()
  }, [open])

  const navigate = (href: string) => {
    closeSidebar()
    router.push(href as any)
  }

  const isActive = (href: string) =>
    href === '/(tabs)/'
      ? pathname === '/' || pathname === ''
      : pathname.includes(href.replace('/(tabs)', ''))

  return (
    <View style={styles.root}>
      {children}

      {/* Overlay */}
      {open && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={require('../assets/images/icon.png')} style={styles.sidebarLogo} />
          <View style={{ flex: 1 }}>
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
  root: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },

  sidebar: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
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
    paddingTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sidebarLogo:  { width: 40, height: 40, borderRadius: 10 },
  sidebarTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.textDark },
  sidebarSub:   { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMedium },
  closeBtn:     { padding: 4 },

  navItems: { padding: 12, gap: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
  },
  navItemActive: { backgroundColor: Colors.primaryLight },
  navLabel:      { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium, flex: 1 },
  navLabelActive:{ color: Colors.primary },
  navBadge: {
    backgroundColor: '#E2001A',
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  navBadgeText: { fontSize: 10, color: '#fff', fontFamily: 'Inter-Medium' },

  sidebarFooter: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
  footerText:    { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
})
