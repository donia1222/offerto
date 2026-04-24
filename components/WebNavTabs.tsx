import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'

const NAV_ITEMS = [
  { label: 'Angebote',      icon: 'list-outline' as const,      iconActive: 'list' as const,      href: '/(tabs)/' },
  { label: 'Kataloge',      icon: 'newspaper-outline' as const, iconActive: 'newspaper' as const, href: '/(tabs)/kataloge' },
  { label: 'Einkaufsliste', icon: 'cart-outline' as const,      iconActive: 'cart' as const,      href: '/(tabs)/list' },
  { label: 'Einstellungen', icon: 'settings-outline' as const,  iconActive: 'settings' as const,  href: '/(tabs)/settings' },
]

export default function WebNavTabs() {
  const router    = useRouter()
  const pathname  = usePathname()
  const cartCount = useListStore(s => s.items.length)

  const isActive = (href: string) =>
    href === '/(tabs)/'
      ? pathname === '/' || pathname === ''
      : pathname.includes(href.replace('/(tabs)', ''))

  return (
    <View style={styles.row}>
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href)
        return (
          <TouchableOpacity
            key={item.href}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => router.push(item.href as any)}
          >
            <Ionicons
              name={active ? item.iconActive : item.icon}
              size={16}
              color={active ? Colors.primary : Colors.textMedium}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
            {item.href.includes('list') && cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  tabActive:   { backgroundColor: Colors.primaryLight },
  label:       { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },
  labelActive: { color: Colors.primary },
  badge: {
    backgroundColor: '#E2001A', minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontFamily: 'Inter-Medium' },
})
