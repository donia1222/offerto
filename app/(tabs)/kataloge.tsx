import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView,
  useWindowDimensions, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

import { api } from '../../services/api'
import SearchButton from '../../components/SearchButton'
import ListButton from '../../components/ListButton'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'

interface FolletoData {
  tienda:       string
  nombre:       string
  semana:       string
  pdf_url:      string
  tipo:         'pdf' | 'web'
  valido_desde: string
  valido_hasta: string
}

const STORE_COLORS: Record<string, string> = {
  transgourmet: '#E2001A',
  topcc:        '#0050AA',
  aligro:       '#FF6600',
}
const STORE_CHIPS = [
  { slug: 'all',          logo: null },
  { slug: 'aligro',       logo: StoreLogos.aligro },
  { slug: 'topcc',        logo: StoreLogos.topcc },
  { slug: 'transgourmet', logo: StoreLogos.transgourmet },
]

export default function KatalogeScreen() {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const cardSize   = width - Spacing.lg * 2

  const [items, setItems]         = useState<FolletoData[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterStore, setFilter]  = useState('all')

  const load = () => {
    setLoading(true)
    api.get('/folleto.php')
      .then(r => {
        const data = r.data.datos
        setItems(Array.isArray(data) ? data : [data])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openInBrowser = (item: FolletoData) => {
    if (item.pdf_url) Linking.openURL(item.pdf_url)
  }

  const visibleItems = items
    .filter(item => {
      const minDate = items.reduce((a, b) => a.valido_desde < b.valido_desde ? a : b).valido_desde
      return item.valido_desde === minDate
    })
    .filter(item => filterStore === 'all' || item.tienda === filterStore)

  const storeChips = ['all', ...Array.from(new Set(items.map(i => i.tienda)))]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image source={require('../../assets/images/trasnparehte.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('kataloge.title')}</Text>
          <Text style={styles.subtitle}>{t('kataloge.thisWeek')}</Text>
        </View>
        {/* <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ListButton />
        </View> */}
      </View>

      {/* Store chips */}
      {items.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipBar} style={styles.chipScroll}>
          {storeChips.map(slug => {
            const active = filterStore === slug
            const color  = STORE_COLORS[slug] ?? Colors.primary
            return (
              <TouchableOpacity
                key={slug}
                style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setFilter(slug)}
                activeOpacity={0.8}
              >
                {slug === 'all'
                  ? <Ionicons name="apps" size={18} color={active ? '#fff' : Colors.textMedium} />
                  : StoreLogos[slug] && <Image source={StoreLogos[slug]} style={[styles.chipLogo, active && { tintColor: undefined }]} resizeMode="contain" />
                }
                <Text style={[styles.chipText, active && { color: '#fff' }]}>
                  {slug === 'all' ? t('common.all') : STORE_CHIPS.find(s => s.slug === slug)?.slug ?? slug}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="document-text-outline" size={40} color={Colors.textLight} />
            <Text style={styles.emptyText}>{t('kataloge.empty')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {visibleItems.map(item => (
              <TouchableOpacity
                key={item.tienda + item.semana}
                style={[styles.card, { width: cardSize, height: cardSize * 0.5, backgroundColor: Colors.surface }]}
                activeOpacity={0.88}
                onPress={() => openInBrowser(item)}
              >
                <View style={styles.nextCard}>
                  <Image source={StoreLogos[item.tienda]} style={styles.nextCardLogo} resizeMode="contain" />
                  <View style={styles.nextCardBody}>
                    <Text style={styles.nextCardText}>{t('kataloge.nextWeekLabel', { store: item.nombre, kw: item.semana })}</Text>
                    <Text style={styles.sourceText}>{t('kataloge.source')}: {item.nombre}</Text>
                    <View style={styles.nextCardCta}>
                      <Text style={styles.nextCardCtaText}>{t('kataloge.open')}</Text>
                      <Ionicons name="open-outline" size={14} color={Colors.primary} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  headerLogo: { width: 44, height: 44 },
  title:    { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: -2 },

  chipScroll: { flexGrow: 0 },
  chipBar:    { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.sm, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  chipLogo:   { width: 36, height: 22, borderRadius: 3 },
  chipText:   { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textMedium },
  sourceText: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, marginBottom: 2 },

  content:   { flexGrow: 1, padding: Spacing.lg, gap: Spacing.lg, justifyContent: 'center' },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  grid:      { gap: Spacing.md },

  card: {
    borderRadius:  Radius.xl,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOpacity: 0.12,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 5 },
    elevation:     5,
  },
  nextCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
  },
  nextCardLogo: { width: 80, height: 48 },
  nextCardBody: { flex: 1, gap: 6 },
  nextCardText: {
    fontFamily: 'Inter-Medium', fontSize: 14,
    color: Colors.textMedium,
  },
  nextCardCta: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  nextCardCtaText: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.primary,
  },
  cardFooter:   {},
  cardLogo:     {},
  cardStoreName:{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: '#fff' },
  cardDate:     { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  openBtn:      {},
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding:  Spacing.lg, gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
  },
  storeName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, color: '#fff' },
  dateText:  { fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  btn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    marginTop:       4,
    paddingVertical: 10,
    borderRadius:    Radius.md,
    borderWidth:     1,
  },
  btnText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: '#fff' },

  emptyText: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMedium },
  retryBtn:  { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 16 },

})
