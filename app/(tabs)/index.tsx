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
import SearchButton from '../../components/SearchButton'
import SettingsButton from '../../components/SettingsButton'
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

export default function HomeScreen() {
  const { t }  = useTranslation()
  const router = useRouter()

  const [featured, setFeatured]       = useState<Offer[]>([])
  const [offers, setOffers]           = useState<Offer[]>([])
  const [loading, setLoading]         = useState(true)
  const [filtering, setFiltering]     = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [activeStore, setActiveStore] = useState<string>('all')
  const [page, setPage]               = useState(1)
  const [total, setTotal]             = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const scrollY      = useRef(new Animated.Value(0)).current
  const lastScrollY  = useRef(0)
  const bannerHeight  = useRef(new Animated.Value(74)).current
  const bannersShown  = useRef(true)
  const headerOuterH  = bannerHeight.interpolate({ inputRange: [0, 74], outputRange: [106, 180] })

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

  const load = useCallback(async (store: string, pg: number, append = false) => {
    try {
      const filters = store !== 'all' ? { stores: [store] } : {}
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
    setLoading(true)
    load('all', 1).finally(() => setLoading(false))
  }, [])

  const onRefresh = async () => { setRefreshing(true); await load(activeStore, 1); setRefreshing(false) }
  const onStoreFilter = (slug: string) => { setActiveStore(slug); setFiltering(true); load(slug, 1).finally(() => setFiltering(false)) }
  const onLoadMore = async () => {
    if (loadingMore || offers.length >= total) return
    setLoadingMore(true); await load(activeStore, page + 1, true); setLoadingMore(false)
  }

  if (loading) return (
    <SafeAreaView style={styles.center} edges={['top']}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Lädt Angebote...</Text>
    </SafeAreaView>
  )

  if (error) return (
    <SafeAreaView style={styles.center} edges={['top']}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load('all', 1).finally(() => setLoading(false)) }}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={offers}
        keyExtractor={o => String(o.id)}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <OfferCard offer={item} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
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
            <View style={{ height: 190 }} />

            {/* Featured horizontal scroll */}
            {featured.length > 0 && activeStore === 'all' && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>🔥 Top</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
                  {featured.slice(0, 10).map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.featuredCard, { borderTopColor: o.tienda.color }]}
                      onPress={() => router.push(`/offer/${o.id}`)}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.featBadge, { backgroundColor: o.descuento >= 30 ? Colors.success : Colors.accent }]}>
                        <Text style={styles.featBadgeText}>-{o.descuento}%</Text>
                      </View>
                      <View style={[styles.featImgWrap, { backgroundColor: o.tienda.color + '12' }]}>
                        {o.imagen
                          ? <Image source={{ uri: o.imagen }} style={styles.featImg} resizeMode="contain" />
                          : <Text style={{ fontSize: 30 }}>🛒</Text>
                        }
                      </View>
                      <Text style={styles.featName} numberOfLines={2}>{o.nombre}</Text>
                      <Text style={[styles.featPrice, { color: o.tienda.color }]}>CHF {o.precio_oferta.toFixed(2)}</Text>
                      <Text style={styles.featStore}>{o.tienda.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Count */}
            <View style={styles.sectionRow2}>
              <Text style={styles.sectionTitle}>
                {activeStore === 'all' ? 'Alle Angebote' : STORE_LABELS[activeStore]}
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
          <Animated.Text style={[styles.title, { fontSize: titleSize }]}>{t('home.title')}</Animated.Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SearchButton />
            <SettingsButton />
          </View>
        </Animated.View>

        {/* Filter banners */}
        <Animated.View style={{ height: bannerHeight, overflow: 'hidden' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterScroll}
        >
          {/* All banner */}
          <TouchableOpacity
            style={[styles.filterBanner, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
            onPress={() => onStoreFilter('all')}
            activeOpacity={0.82}
          >
            <Ionicons name="apps" size={26} color={activeStore === 'all' ? Colors.primary : Colors.textLight} />
          </TouchableOpacity>

          {/* Store banners */}
          {STORES.map(slug => {
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
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
  listContent:  { paddingBottom: 110 },
  cardWrapper:  { paddingHorizontal: Spacing.lg },
  listHeader:   {},

  // Fixed header
  headerOuter: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerSafe:  { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title:       { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },

  // Filter bar

  filterScroll: { flexGrow: 0 },
  filterBar:    { paddingHorizontal: Spacing.lg, paddingBottom: 10, gap: 10 },
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

  // Section headers
  section:      { marginBottom: 4 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionRow2:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.textDark },
  sectionBadge: { backgroundColor: Colors.accentLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  sectionBadgeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.accent },
  countPill:    { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  countText:    { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.primary },

  // Featured cards
  featuredScroll:  { paddingLeft: Spacing.lg, paddingRight: Spacing.sm, gap: 12, paddingBottom: 4 },
  featuredCard: {
    width:           148,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    alignItems:      'center',
    borderTopWidth:  3,
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 3 },
    elevation:       3,
  },
  featBadge:       { position: 'absolute', top: 10, right: 10, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, zIndex: 1 },
  featBadgeText:   { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  featImgWrap:     { width: 84, height: 84, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 10, marginTop: 4 },
  featImg:         { width: '100%', height: '100%' },
  featName:        { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textDark, textAlign: 'center', lineHeight: 18, marginBottom: 6 },
  featPrice:       { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, marginBottom: 2 },
  featStore:       { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },

  filterOverlay: { position: 'absolute', top: 180, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  loadingText:  { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMedium },
  errorText:    { color: Colors.error, fontSize: 17, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full },
  retryText:    { color: Colors.textInverse, fontFamily: 'Inter-Medium', fontSize: 16 },
})
