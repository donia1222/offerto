import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, ScrollView, Image, ActivityIndicator,
  StyleSheet, RefreshControl, TouchableOpacity, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { offersService } from '../../services/offersService'
import OfferCard from '../../components/OfferCard'
import OfferCardGrid from '../../components/OfferCardGrid'
import ListButton from '../../components/ListButton'
import { useSettingsStore } from '../../store/settingsStore'
import { getOfferName } from '../../utils/getOfferName'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import type { Offer } from '../../types'

const STORES = ['aligro', 'topcc', 'transgourmet']
const STORE_LABELS: Record<string, string> = {
  aligro: 'Aligro', topcc: 'TopCC', transgourmet: 'Transgourmet',
}
const STORE_COLORS: Record<string, string> = {
  aligro: '#FF6600', topcc: '#0050AA', transgourmet: '#E2001A',
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

const CATEGORIES = [
  { slug: 'all',        labelKey: 'common.all' },
  { slug: 'fleisch',    labelKey: 'categories.fleisch' },
  { slug: 'fisch',      labelKey: 'categories.fisch' },
  { slug: 'gemuese',    labelKey: 'categories.gemuese' },
  { slug: 'milch',      labelKey: 'categories.milch' },
  { slug: 'bakery',     labelKey: 'categories.bakery' },
  { slug: 'getraenke',  labelKey: 'categories.getraenke' },
  { slug: 'snacks',     labelKey: 'categories.snacks' },
  { slug: 'haushalt',   labelKey: 'categories.haushalt' },
  { slug: 'hygiene',    labelKey: 'categories.hygiene' },
  { slug: 'tierfutter', labelKey: 'categories.tierfutter' },
]

export default function HomeScreen() {
  const { t }  = useTranslation()
  const router = useRouter()
  const { language, activeStores, visibleCategories, cardLayout } = useSettingsStore()

  const [featured, setFeatured]       = useState<Offer[]>([])
  const [offers, setOffers]           = useState<Offer[]>([])
  const [loading, setLoading]         = useState(true)
  const [filtering, setFiltering]     = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [activeStore, setActiveStore]       = useState<string>('all')
  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [page, setPage]                     = useState(1)
  const [total, setTotal]                   = useState(0)
  const [loadingMore, setLoadingMore]       = useState(false)

  const scrollY      = useRef(new Animated.Value(0)).current
  const lastScrollY  = useRef(0)
  const bannerHeight  = useRef(new Animated.Value(74)).current
  const bannersShown  = useRef(true)
  const headerOuterH  = bannerHeight.interpolate({ inputRange: [0, 74], outputRange: [148, 222] })

  const headerBlur  = scrollY.interpolate({ inputRange: [0, 40],  outputRange: [0, 1],  extrapolate: 'clamp' })
  const titleSize   = scrollY.interpolate({ inputRange: [0, 50],  outputRange: [26, 18], extrapolate: 'clamp' })
  const titlePadTop = scrollY.interpolate({ inputRange: [0, 50],  outputRange: [12, 4],  extrapolate: 'clamp' })

  const onScrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const y    = e.nativeEvent.contentOffset.y
        const diff = y - lastScrollY.current
        if (diff > 3 && y > 20 && bannersShown.current) {
          bannersShown.current = false
          Animated.timing(bannerHeight, { toValue: 0, duration: 130, useNativeDriver: false }).start()
        } else if (diff < -3 && !bannersShown.current) {
          bannersShown.current = true
          Animated.timing(bannerHeight, { toValue: 74, duration: 130, useNativeDriver: false }).start()
        }
        lastScrollY.current = y
      },
    }
  )

  const load = useCallback(async (store: string, cats: string[], pg: number, append = false) => {
    try {
      let storeFilter: string[]
      if (store !== 'all') {
        storeFilter = [store]
      } else if (activeStores.length < 3) {
        storeFilter = activeStores
      } else {
        storeFilter = []
      }
      const filters: Record<string, any> = {}
      if (storeFilter.length) filters.stores     = storeFilter
      if (cats.length)        filters.categories = cats
      const [feat, result] = await Promise.all([
        pg === 1 ? offersService.getFeatured() : Promise.resolve(featured),
        offersService.getOffers(filters, pg),
      ])
      if (pg === 1) setFeatured(feat)
      setOffers(prev => append ? [...prev, ...result.offers] : result.offers)
      setTotal(result.total)
      setPage(pg)
      setError(null)
    } catch (e: any) { setError(e.message) }
  }, [featured])

  useEffect(() => {
    setActiveStore('all')
    setActiveCategories([])
    setLoading(true)
    load('all', [], 1).finally(() => setLoading(false))
  }, [activeStores.join(',')])

  const onRefresh = async () => { setRefreshing(true); await load(activeStore, activeCategories, 1); setRefreshing(false) }
  const onStoreFilter = (slug: string) => {
    setActiveStore(slug)
    setFiltering(true)
    load(slug, activeCategories, 1).finally(() => setFiltering(false))
  }
  const onCategoryFilter = (cat: string) => {
    const next = activeCategories.includes(cat)
      ? activeCategories.filter(c => c !== cat)
      : [...activeCategories, cat]
    setActiveCategories(next)
    setFiltering(true)
    load(activeStore, next, 1).finally(() => setFiltering(false))
  }
  const onLoadMore = async () => {
    if (loadingMore || offers.length >= total) return
    setLoadingMore(true); await load(activeStore, activeCategories, page + 1, true); setLoadingMore(false)
  }

  if (loading) return (
    <SafeAreaView style={styles.center} edges={['top']}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>{t('common.loading')}</Text>
    </SafeAreaView>
  )

  if (error) return (
    <SafeAreaView style={styles.center} edges={['top']}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load('all', 'all', 1).finally(() => setLoading(false)) }}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )


  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={offers}
        keyExtractor={o => String(o.id)}
        key={cardLayout}
        numColumns={cardLayout === 'grid' ? 2 : 1}
        renderItem={({ item }) => (
          cardLayout === 'grid'
            ? <View style={styles.cardWrapperGrid}><OfferCardGrid offer={item} /></View>
            : <View style={[styles.cardWrapper, cardLayout === 'compact' && { marginTop: 40 }]}><OfferCard offer={item} compact={cardLayout === 'compact'} /></View>
        )}
        extraData={cardLayout}
        contentContainerStyle={[styles.listContent, cardLayout === 'grid' && { paddingHorizontal: Spacing.sm }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        removeClippedSubviews={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        onScroll={onScrollHandler}
        scrollEventThrottle={16}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Spacer for fixed header */}
            <View style={{ height: 260 }} />

            {/* Featured horizontal scroll */}
            {featured.length > 0 && activeStore === 'all' && activeStores.length > 0 && (
              <View style={[styles.section, { marginTop: 30 }]}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>🔥 Top</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
                  {featured.filter(o => activeStores.includes(o.tienda?.slug)).slice(0, 10).map(o => (
                    cardLayout === 'grid' ? (
                      <TouchableOpacity
                        key={o.id}
                        style={styles.featuredCard}
                        onPress={() => router.push(`/offer/${o.id}`)}
                        activeOpacity={0.88}
                      >
                        <View style={[styles.featImg, { backgroundColor: '#fff' }]}>
                          {o.imagen
                            ? <Image source={{ uri: o.imagen }} style={{ width: 160, height: 210 }} resizeMode="contain" />
                            : <Text style={{ fontSize: 40 }}>🛒</Text>
                          }
                        </View>
                        <View style={styles.featOverlay} />
                        <View style={[styles.featBadge, { backgroundColor: o.descuento >= 30 ? Colors.success : Colors.accent }]}>
                          <Text style={styles.featBadgeText}>-{o.descuento}%</Text>
                        </View>
                        <View style={styles.featBottom}>
                          <Text style={styles.featName} numberOfLines={2}>{getOfferName(o, language)}</Text>
                          <Text style={styles.featPrice}>CHF {o.precio_oferta.toFixed(2)}</Text>
                          <Text style={styles.featStore}>{o.tienda.nombre}</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View key={o.id} style={styles.featuredListCard} pointerEvents="box-none">
                        <OfferCard offer={o} compact={cardLayout === 'compact'} fixedHeight hideFooter hideExpiry />
                      </View>
                    )
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Count */}
            <View style={styles.sectionRow2}>
              <Text style={styles.sectionTitle}>
                {activeStore === 'all' ? t('home.allOffers') : STORE_LABELS[activeStore]}
              </Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{total}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Subtle filter loading overlay */}
      {filtering && (
        <View style={styles.filterOverlay} pointerEvents="none">
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      )}

      {/* Fixed header overlay */}
      <Animated.View style={[styles.headerOuter, { opacity: headerBlur, height: headerOuterH }]} pointerEvents="none">
        <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        {/* Title row */}
        <Animated.View style={[styles.titleRow, { paddingTop: titlePadTop }]}>
          <View style={styles.titleLeft}>
            <Image source={require('../../assets/images/trasnparehte.png')} style={styles.titleLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.title, { fontSize: titleSize }]}>{t('home.title')}</Animated.Text>
              <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} />
        </Animated.View>

        {/* Filter banners */}
        <Animated.View style={{ height: bannerHeight, overflow: 'hidden', marginTop: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterScroll}
        >
          {/* All banner */}
          <TouchableOpacity
            style={[styles.filterBanner, { backgroundColor: Colors.surface, borderColor: Colors.border, gap: 2 }]}
            onPress={() => onStoreFilter('all')}
            activeOpacity={0.82}
          >
            <Ionicons
              name={activeStores.length > 0 ? 'flame' : 'storefront-outline'}
              size={26}
              color={activeStore === 'all' ? Colors.primary : Colors.textLight}
            />
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 10, color: activeStore === 'all' ? Colors.primary : Colors.textLight }}>
              {activeStores.length > 0 ? 'Top Angebote' : t('home.allOffers')}
            </Text>
          </TouchableOpacity>

          {/* Store banners */}
          {STORES.filter(slug => activeStores.includes(slug)).map(slug => {
            const isActive = activeStore === slug
            const color    = STORE_COLORS[slug] ?? Colors.primary
            return (
              <TouchableOpacity
                key={slug}
                style={[
                  styles.filterBanner,
                  isActive
                    ? { backgroundColor: color, borderColor: color }
                    : { backgroundColor: Colors.surface, borderColor: Colors.border },
                ]}
                onPress={() => onStoreFilter(slug)}
                activeOpacity={0.82}
              >
                {StoreLogos[slug] && (
                  <Image
                    source={StoreLogos[slug]}
                    style={[styles.bannerLogo, slug === 'transgourmet' && styles.bannerLogoLarge]}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        </Animated.View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBar}
          style={styles.catScroll}
        >
          <TouchableOpacity
            style={[styles.catChip, { paddingLeft: 0, paddingRight: 0, width: 54, justifyContent: 'center' }, activeCategories.length === 0 && styles.catChipActiveAll]}
            onPress={() => { setActiveCategories([]); setFiltering(true); load(activeStore, [], 1).finally(() => setFiltering(false)) }}
            activeOpacity={0.8}
          >
            <Ionicons name="apps" size={20} color={activeCategories.length === 0 ? '#E2001A' : Colors.textMedium} />
          </TouchableOpacity>

          {CATEGORIES.filter(cat =>
            cat.slug !== 'all' && visibleCategories.includes(cat.slug)
          ).map(cat => {
            const isActive = activeCategories.includes(cat.slug)
            return (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => onCategoryFilter(cat.slug)}
                activeOpacity={0.8}
              >
                {CATEGORY_IMAGES[cat.slug] && (
                  <Image
                    source={CATEGORY_IMAGES[cat.slug]}
                    style={styles.catAvatar}
                    resizeMode="cover"
                  />
                )}
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]} numberOfLines={2}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
  listContent:  { paddingBottom: 110 },
  cardWrapper:      { paddingHorizontal: Spacing.lg },
  cardWrapperGrid:  { flex: 1, margin: 6, height: 335 },
  listHeader:   {},

  // Fixed header
  headerOuter: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerSafe:  { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  titleLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleLogo:   { width: 44, height: 44 },
  title:       { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle:    { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: -2 },

  // Filter bar

  filterScroll: { flexGrow: 0 },
  filterBar:    { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 10 , marginTop: 10 },
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
  filterBannerText:       { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textMedium, textAlign: 'center' },
  filterBannerTextActive: { color: '#fff' },
  bannerLogo:             { width: 68, height: 38, borderRadius: 4 },
  bannerLogoLarge:        { width: 80, height: 48 },
  baldLabel:              { fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.textLight, marginTop: 2 },
  baldChip:               { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.textLight, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 2 },
  baldChipText:           { fontFamily: 'Inter-Medium', fontSize: 9, color: '#fff' },

  // Section headers
  section:      { marginBottom: 4 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionRow2:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.textDark, marginTop: 20 },
  sectionBadge: { backgroundColor: Colors.accentLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  sectionBadgeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.accent },
  countPill:    { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  countText:    { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.primary },

  // Featured cards
  featuredScroll:  { paddingLeft: Spacing.lg, paddingRight: Spacing.sm, gap: 12, paddingBottom: 4 },
  featuredListCard:{ width: 290, overflow: 'hidden', borderRadius: Radius.lg },
  featuredCard: {
    width:        160,
    height:       210,
    borderRadius: Radius.lg,
    overflow:     'hidden',
    borderWidth:  1,
    borderColor:  '#D8D5EE',
    shadowColor:  '#000',
    shadowOpacity: 0.14,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 3 },
    elevation:     4,
  },
  featImg:     { position: 'absolute', top: 0, left: 0, width: 160, height: 210 },
  featOverlay: { position: 'absolute', bottom: 0, left: 0, width: 160, height: 90, backgroundColor: 'rgba(0,0,0,0.55)' },
  featBadge:   { position: 'absolute', top: 10, right: 10, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, zIndex: 1 },
  featBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  featBottom:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.sm },
  featName:    { fontFamily: 'Inter-Medium', fontSize: 13, color: '#fff', lineHeight: 18, marginBottom: 3 },
  featPrice:   { fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, color: '#fff', marginBottom: 2 },
  featStore:   { fontFamily: 'Inter-Regular', fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  // Category chips
  catScroll:      { flexGrow: 0, backgroundColor: 'rgba(245,243,255,0.92)' },
  catBar:         { paddingHorizontal: Spacing.lg, paddingTop: 16, paddingBottom: 12, gap: 8,  },
  catChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    height:            48,
    paddingLeft:       6,
    paddingRight:      14,
    borderRadius:      Radius.md,
    backgroundColor:   Colors.surface,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    shadowColor:       '#000',
    shadowOpacity:     0.06,
    shadowRadius:      6,
    shadowOffset:      { width: 0, height: 2 },
    elevation:         2,
  },
  catChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor:     Colors.primary,
  },
  catChipActiveAll: {
    backgroundColor: '#fff',
    borderColor:     Colors.border,
  },
  catAvatar:     { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  catAvatarAll:  { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  catLabel:      { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textDark },
  catLabelActive:{ color: Colors.primary, fontFamily: 'Inter-SemiBold' },

  filterOverlay: { position: 'absolute', top: 222, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  loadingText:  { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMedium },
  errorText:    { color: Colors.error, fontSize: 17, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full },
  retryText:    { color: Colors.textInverse, fontFamily: 'Inter-Medium', fontSize: 16 },
  emptyTitle:   { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.textDark, marginTop: 16 },
  emptySub:     { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
})
