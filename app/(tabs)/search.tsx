import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  ImageBackground, useWindowDimensions, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../services/api'
import OfferCard from '../../components/OfferCard'
import { useTranslation } from 'react-i18next'
import SearchButton from '../../components/SearchButton'
import SettingsButton from '../../components/SettingsButton'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import type { Offer } from '../../types'

interface Category {
  slug:  string
  img:   any
  label: string
  color: string
}

const CATEGORY_IMAGES: Record<string, any> = {
  fleisch:    require('../../assets/images/categorias/carne.png'),
  fisch:      require('../../assets/images/categorias/pescado.png'),
  gemuese:    require('../../assets/images/categorias/frutaverdura.png'),
  milch:      require('../../assets/images/categorias/leche-queso.png'),
  bakery:     require('../../assets/images/categorias/panaderia.png'),
  getraenke:  require('../../assets/images/categorias/bebidas.png'),
  snacks:     require('../../assets/images/categorias/snacks.png'),
  haushalt:   require('../../assets/images/categorias/prodeuctsocasa.png'),
  hygiene:    require('../../assets/images/categorias/korperpflege.png'),
  tierfutter: require('../../assets/images/categorias/comida-animales.png'),
}
const CATEGORY_SLUGS = [
  { slug: 'fleisch',    color: '#E05252' },
  { slug: 'fisch',      color: '#2196B0' },
  { slug: 'gemuese',    color: '#3D9970' },
  { slug: 'milch',      color: '#D4A017' },
  { slug: 'bakery',     color: '#C07038' },
  { slug: 'getraenke',  color: '#3A6CC8' },
  { slug: 'snacks',     color: '#7C6FCD' },
  { slug: 'haushalt',   color: '#2A9D8F' },
  { slug: 'hygiene',    color: '#C2185B' },
  { slug: 'tierfutter', color: '#7B5EA7' },
]

const STORES = [
  { slug: 'all',          color: Colors.primary,  logo: null },
  { slug: 'aligro',       color: '#FF6600',       logo: StoreLogos.aligro },
  { slug: 'topcc',        color: '#0050AA',       logo: StoreLogos.topcc },
  { slug: 'transgourmet', color: '#E2001A',       logo: StoreLogos.transgourmet },
]

export default function SearchScreen() {
  const { width } = useWindowDimensions()
  const { t }     = useTranslation()
  const { activeStores } = useSettingsStore()
  const GAP       = Spacing.md
  const PADDING   = Spacing.lg * 2
  const tileSize  = (width - PADDING - GAP) / 2

  const CATEGORIES: Category[] = [
    ...CATEGORY_SLUGS.map(c => ({ ...c, img: CATEGORY_IMAGES[c.slug], label: t(`categories.${c.slug}`) })),
    { slug: '', img: null, label: t('categories.all'), color: Colors.primary },
  ]

  const [screen,   setScreen]   = useState<'grid' | 'results'>('grid')
  const [store,    setStore]    = useState('all')
  const [category, setCategory] = useState<Category | null>(null)
  const [results,  setResults]  = useState<Offer[]>([])
  const [loading,  setLoading]  = useState(false)

  const scrollY   = useRef(new Animated.Value(0)).current
  const titleSize = scrollY.interpolate({ inputRange: [0, 50], outputRange: [26, 18], extrapolate: 'clamp' })
  const titlePad  = scrollY.interpolate({ inputRange: [0, 50], outputRange: [12, 4],  extrapolate: 'clamp' })

  const openCategory = useCallback(async (cat: Category, storeSlug: string) => {
    setCategory(cat)
    setScreen('results')
    setLoading(true)
    try {
      const effectiveStore = storeSlug !== 'all'
        ? storeSlug
        : activeStores.length < 3 ? activeStores.join(',') : ''
      let datos: Offer[] = []
      if (cat.searchQuery) {
        const params: Record<string, string> = { q: cat.searchQuery, limite: '200' }
        if (effectiveStore) params.tienda = effectiveStore
        const res = await api.get('/buscar.php', { params })
        datos = res.data.datos ?? []
      } else {
        const params: Record<string, string> = { orden: 'descuento', pagina: '1', limite: '200' }
        if (cat.slug) params.categoria = cat.slug
        if (effectiveStore) params.tienda = effectiveStore
        const res = await api.get('/ofertas.php', { params })
        datos = res.data.datos ?? []
      }
      setResults(datos)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [activeStores])

  const onStorePress = (slug: string) => {
    setStore(slug)
    if (screen === 'results' && category) openCategory(category, slug)
  }

  const goBack = () => { setScreen('grid'); setResults([]); scrollY.setValue(0) }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <Animated.View style={[styles.header, { paddingTop: titlePad }]}>
        {screen === 'results' && (
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
          </TouchableOpacity>
        )}
        <Animated.Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {screen === 'results' && category ? category.label : t('tabs.search')}
        </Animated.Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SearchButton />
          <SettingsButton />
        </View>
      </Animated.View>

      {/* ── Store chips — only inside a category ── */}
      {screen === 'results' && <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipBar}
        style={styles.chipScroll}
      >
        {STORES.filter(s => s.slug === 'all' || activeStores.includes(s.slug)).map(s => {
          const active = store === s.slug
          return (
            <TouchableOpacity
              key={s.slug}
              style={[styles.chip, active && { backgroundColor: s.color, borderColor: s.color }]}
              onPress={() => onStorePress(s.slug)}
              activeOpacity={0.8}
            >
              {s.logo ? (
                <Image source={s.logo} style={[styles.chipLogo, active && { opacity: 0.95 }]} resizeMode="contain" />
              ) : (
                <Ionicons name="apps" size={14} color={active ? '#fff' : Colors.textMedium} />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s.slug === 'all' ? t('common.all') : s.slug === 'aligro' ? 'Aligro' : s.slug === 'topcc' ? 'TopCC' : 'Transgourmet'}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>}

      {/* ── Category grid ── */}
      {screen === 'grid' && (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { padding: Spacing.lg, gap: GAP }]}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          {(() => {
            const grid = CATEGORIES.filter(c => c.label !== 'Alle Angebote')
            const alle = CATEGORIES.find(c => c.label === 'Alle Angebote')
            return (
              <>
                {Array.from({ length: Math.ceil(grid.length / 2) }, (_, i) => {
                  const pair = grid.slice(i * 2, i * 2 + 2)
                  return (
                    <View key={i} style={[styles.gridRow, { gap: GAP }]}>
                      {pair.map(cat => (
                        <TouchableOpacity
                          key={cat.slug + cat.label}
                          style={[styles.tile, { width: tileSize, height: tileSize }]}
                          onPress={() => openCategory(cat, store)}
                          activeOpacity={0.88}
                        >
                          <ImageBackground source={cat.img} style={styles.tileBg} imageStyle={styles.tileBgImg}>
                            <View style={styles.tileOverlay}>
                              <Text style={styles.tileLabel}>{cat.label}</Text>
                            </View>
                          </ImageBackground>
                        </TouchableOpacity>
                      ))}
                      {pair.length === 1 && <View style={{ width: tileSize }} />}
                    </View>
                  )
                })}
                {alle && (
                  <TouchableOpacity
                    style={styles.tileWide}
                    onPress={() => openCategory(alle, store)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.wideIcon, { backgroundColor: alle.color + '18' }]}>
                      <MaterialCommunityIcons name="cart-variant" size={28} color={alle.color} />
                    </View>
                    <Text style={[styles.tileLabel, { color: Colors.textDark, flex: 1, marginBottom: 0 }]}>{alle.label}</Text>
                  </TouchableOpacity>
                )}
              </>
            )
          })()}
          <View style={{ height: 90 }} />
        </Animated.ScrollView>
      )}

      {/* ── Results ── */}
      {screen === 'results' && (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="cart-off" size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>{t('search.noOffers')}</Text>
            <Text style={styles.emptySub}>{t('search.noOffersHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={o => String(o.id)}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{t('search.results', { count: results.length })}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <OfferCard offer={item} />
              </View>
            )}
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        )
      )}

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  backBtn: { marginRight: Spacing.sm },
  title:   { flex: 1, fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },

  chipScroll: { flexGrow: 0 },
  chipBar:    { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  chipLogo:       { width: 36, height: 22, borderRadius: 3 },
  chipText:       { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textMedium },
  chipTextActive: { color: '#fff' },

  grid:    { flexGrow: 1 },
  gridRow: { flexDirection: 'row' },

  wideIcon: {
    width: 48, height: 48, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  tileWide: {
    width: '100%', height: 68,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  tile: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileBg:    { flex: 1 },
  tileBgImg: { borderRadius: Radius.xl, resizeMode: 'cover' },
  tileOverlay: {
    flex: 1,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  tileLabel: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 15,
    lineHeight: 20, color: '#fff',
  },
  arrow: {
    alignSelf: 'flex-start', borderRadius: Radius.full,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  arrowCenter: { alignSelf: 'center' },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  emptyTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 20, color: Colors.textDark },
  emptySub:   { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, textAlign: 'center', lineHeight: 22 },

  resultsHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  resultsCount:  { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium },
  resultsList:   {},
  cardWrap:      { paddingHorizontal: Spacing.lg },
})
