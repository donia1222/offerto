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
import OfferCardGrid from '../../components/OfferCardGrid'
import { useTranslation } from 'react-i18next'
import SearchButton from '../../components/SearchButton'
import ListButton from '../../components/ListButton'
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
  { slug: 'snacks',     color: '#A08060' },
  { slug: 'haushalt',   color: '#2A9D8F' },
  { slug: 'hygiene',    color: '#C2185B' },
  { slug: 'tierfutter', color: '#6B5D52' },
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
  const { activeStores, cardLayout } = useSettingsStore()
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
      const params: Record<string, string> = { orden: 'descuento', pagina: '1', limite: '200' }
      if (cat.slug) params.categoria = cat.slug
      if (effectiveStore) params.tienda = effectiveStore
      const res = await api.get('/ofertas.php', { params })
      const datos: Offer[] = res.data.datos ?? []
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
        {screen === 'results' ? (
          <>
            <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
            </TouchableOpacity>
            <Animated.Text style={[styles.title, { fontSize: titleSize, flex: 1 }]} numberOfLines={1}>
              {category?.label}
            </Animated.Text>
          </>
        ) : (
          <View style={styles.titleLeft}>
            <Image source={require('../../assets/images/trasnparehte.png')} style={styles.titleLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>{t('tabs.search')}</Animated.Text>
              <Text style={styles.subtitle}>{t('search.subtitle')}</Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ListButton />
        </View>
      </Animated.View>

      {/* ── Store banners (sólo dentro de una categoría) ── */}
      {screen === 'results' && <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        style={styles.filterScroll}
      >
        {STORES.map(s => {
          const active    = store === s.slug
          const isEnabled = s.slug === 'all' || activeStores.includes(s.slug)
          return (
            <TouchableOpacity
              key={s.slug}
              style={[
                styles.filterBanner,
                active && isEnabled
                  ? { backgroundColor: s.color, borderColor: s.color }
                  : { backgroundColor: Colors.surface, borderColor: Colors.border },
                !isEnabled && { opacity: 0.4 },
              ]}
              onPress={() => isEnabled && onStorePress(s.slug)}
              activeOpacity={isEnabled ? 0.82 : 1}
            >
              {s.logo ? (
                <Image
                  source={s.logo}
                  style={[styles.bannerLogo, s.slug === 'transgourmet' && styles.bannerLogoLarge]}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="apps" size={26} color={active ? '#fff' : Colors.textLight} />
              )}
              {!isEnabled && (
                <View style={styles.baldChip}>
                  <Ionicons name="time-outline" size={11} color="#fff" />
                  <Text style={styles.baldChipText}>Bald</Text>
                </View>
              )}
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
            const grid = CATEGORIES.filter(c => c.slug !== '')
            const alle = CATEGORIES.find(c => c.slug === '')
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
            key={cardLayout}
            numColumns={cardLayout === 'grid' ? 2 : 1}
            contentContainerStyle={[styles.resultsList, cardLayout === 'grid' && { paddingHorizontal: Spacing.sm }]}
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
              cardLayout === 'grid'
                ? <View style={styles.cardWrapGrid}><OfferCardGrid offer={item} /></View>
                : <View style={[styles.cardWrap, cardLayout === 'compact' && { marginTop: 40 }]}><OfferCard offer={item} compact={cardLayout === 'compact'} /></View>
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginRight: Spacing.sm,
  },
  title:      { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  titleLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleLogo:  { width: 44, height: 44 },
  subtitle:   { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: 0 },

  filterScroll: { flexGrow: 0 },
  filterBar:    { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 10 },
  filterBanner: {
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    width:           110,
    height:          64,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       2,
  },
  bannerLogo:      { width: 68, height: 38, borderRadius: 4 },
  bannerLogoLarge: { width: 80, height: 48 },
  baldChip:        { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.textLight, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 2 },
  baldChipText:    { fontFamily: 'Inter-Medium', fontSize: 9, color: '#fff' },

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
  cardWrapGrid:  { flex: 1, margin: 6, height: 335 },
})
