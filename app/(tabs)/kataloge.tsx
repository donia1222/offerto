import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'

import { api } from '../../services/api'
import SearchButton from '../../components/SearchButton'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos, StoreColors } from '../../constants/stores'
import { useSettingsStore } from '../../store/settingsStore'

interface ProspektItem {
  id:           number
  tienda:       string
  titulo:       string
  subtitulo:    string | null
  pdf_url:      string | null
  web_url:      string | null
  valido_desde: string
  valido_hasta: string
  semana:       string | null
  tipo:         string
  dias_restantes: number
}

interface StoreGroup {
  tienda: string
  nombre: string
  color:  string
  items:  ProspektItem[]
}

const STORE_ORDER = ['aligro', 'topcc', 'transgourmet']

export default function KatalogeScreen() {
  const { t }            = useTranslation()
  const router           = useRouter()
  const { activeStores } = useSettingsStore()

  const [groups,     setGroups]     = useState<StoreGroup[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else           setLoading(true)

    api.get('/prospekte.php')
      .then(r => {
        const raw: StoreGroup[] = Array.isArray(r.data.datos) ? r.data.datos : []
        // Mantener orden fijo y filtrar solo tiendas activas
        const ordered = STORE_ORDER
          .map(slug => raw.find(g => g.tienda === slug))
          .filter((g): g is StoreGroup => !!g && activeStores.includes(g.tienda))
        setGroups(ordered)
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [activeStores])

  useEffect(() => { load() }, [load])

  const currentSemana = (items: ProspektItem[]) => {
    // semana del prospecto más reciente / de mayor validez
    const current = items.find(i => i.dias_restantes >= 0) ?? items[0]
    return current?.semana ?? null
  }

  const typeLabel = (items: ProspektItem[]) => {
    const tipos = [...new Set(items.map(i => i.tipo))]
    return tipos.slice(0, 2).map(t => {
      const map: Record<string, string> = {
        aktionen: 'Aktionen', baeckerei: 'Bäckerei', kiosk: 'Kiosk',
        wochenhits: 'Wochen-Hits', guide: 'Guide', beilage: 'Beilage', katalog: 'Katalog',
      }
      return map[t] ?? t
    }).join(' · ')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('kataloge.title')}</Text>
          <Text style={styles.subtitle}>{t('kataloge.thisWeek')}</Text>
        </View>
        <SearchButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={44} color={Colors.textLight} />
            <Text style={styles.emptyText}>{t('kataloge.empty')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map(group => {
            const semana   = currentSemana(group.items)
            const typeStr  = typeLabel(group.items)
            const count    = group.items.length
            const color    = StoreColors[group.tienda] ?? group.color ?? Colors.primary

            return (
              <TouchableOpacity
                key={group.tienda}
                style={styles.card}
                activeOpacity={0.82}
                onPress={() => router.push(`/prospekte/${group.tienda}`)}
              >
                {/* Accent bar izquierda */}
                <View style={[styles.accent, { backgroundColor: color }]} />

                <View style={styles.cardInner}>
                  {/* Logo */}
                  <View style={styles.logoWrap}>
                    {StoreLogos[group.tienda] ? (
                      <Image
                        source={StoreLogos[group.tienda]}
                        style={styles.logo}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={[styles.storeFallback, { color }]}>{group.nombre}</Text>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.info}>
                    <Text style={styles.storeName}>{group.nombre}</Text>
                    <Text style={styles.typeText} numberOfLines={1}>{typeStr}</Text>
                  </View>

                  {/* Right side */}
                  <View style={styles.right}>
                    {semana && (
                      <View style={[styles.kwBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.kwText, { color }]}>{semana}</Text>
                      </View>
                    )}
                    <View style={styles.countRow}>
                      <Ionicons name="document-text-outline" size={13} color={Colors.textLight} />
                      <Text style={styles.countText}>{count}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textLight} style={{ marginTop: 2 }} />
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  title:    { fontFamily: 'PlusJakartaSans-Bold',   fontSize: 26, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Medium',            fontSize: 13, color: Colors.primary, marginTop: 3 },

  content: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, gap: 14,
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMedium },
  retryBtn:  {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: Radius.full,
  },
  retryText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 15 },

  card: {
    flexDirection:  'row',
    backgroundColor: Colors.surface,
    borderRadius:   Radius.xl,
    overflow:       'hidden',
    shadowColor:    '#000',
    shadowOpacity:  0.07,
    shadowRadius:   10,
    shadowOffset:   { width: 0, height: 3 },
    elevation:      3,
  },
  accent: { width: 4 },
  cardInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.md,
  },
  logoWrap: { width: 80, alignItems: 'center', justifyContent: 'center' },
  logo:     { width: 80, height: 40 },
  storeFallback: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 },

  info: { flex: 1, gap: 4 },
  storeName: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.textDark },
  typeText:  { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMedium },

  right: { alignItems: 'flex-end', gap: 6 },
  kwBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  kwText:    { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  countRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textLight },
})
