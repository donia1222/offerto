import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView,
  useWindowDimensions, Platform, Modal, StatusBar, Linking,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { WebView } from 'react-native-webview'

import { api } from '../../services/api'
import SearchButton from '../../components/SearchButton'
import ListButton from '../../components/ListButton'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import { useSettingsStore } from '../../store/settingsStore'

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
  const insets     = useSafeAreaInsets()
  const isDesktop  = Platform.OS === 'web' && width >= 768
  const cardSize   = width - Spacing.lg * 2
  const { activeStores } = useSettingsStore()

  const [items, setItems]           = useState<FolletoData[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterStore, setFilter]      = useState('all')
  const [activeItem, setActiveItem]   = useState<FolletoData | null>(null)
  const [webLoading, setWebLoading]   = useState(true)
  const [downloadOpen, setDownloadOpen] = useState(false)

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

  const openItem = (item: FolletoData) => {
    if (!item.pdf_url) return
    setWebLoading(true)
    setActiveItem(item)
  }

  const getViewerUrl = (item: FolletoData) => {
    if (item.tipo === 'pdf' && Platform.OS === 'android') {
      return `https://docs.google.com/viewerng/viewer?url=${encodeURIComponent(item.pdf_url)}`
    }
    return item.pdf_url
  }

  const visibleItems = items
    .filter(item => {
      const minDate = items.reduce((a, b) => a.valido_desde < b.valido_desde ? a : b).valido_desde
      return item.valido_desde === minDate
    })
    .filter(item => activeStores.includes(item.tienda))
    .filter(item => filterStore === 'all' || item.tienda === filterStore)

  return (
    <SafeAreaView style={[styles.container, isDesktop && { maxWidth: 1280, alignSelf: 'center' as any, width: '100%' as any }]} edges={['top']}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <View>
          <Text style={styles.title}>{t('kataloge.title')}</Text>
          <Text style={styles.subtitle}>{t('kataloge.thisWeek')}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setDownloadOpen(true)}>
          <Ionicons name="download-outline" size={22} color={Colors.textMedium} />
        </TouchableOpacity>
      </View>
      {/* Modal descarga */}
      <Modal visible={downloadOpen} transparent animationType="fade" onRequestClose={() => setDownloadOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setDownloadOpen(false)}>
          <View style={styles.menuBox}>
            {visibleItems.length === 0 ? (
              <View style={styles.menuRow}>
                <Text style={styles.menuRowText}>{t('kataloge.empty')}</Text>
              </View>
            ) : visibleItems.map((item, idx) => (
              <View key={item.tienda + item.semana}>
                {idx > 0 && <View style={styles.menuDivider} />}
                <TouchableOpacity
                  style={styles.menuRow}
                  activeOpacity={0.75}
                  onPress={() => { setDownloadOpen(false); Linking.openURL(item.pdf_url) }}
                >
                  {StoreLogos[item.tienda] ? (
                    <Image
                      source={StoreLogos[item.tienda]}
                      style={[
                        styles.menuStoreLogo,
                        item.tienda === 'aligro'       && { width: 65,  height: 26 },
                        item.tienda === 'transgourmet' && { width: 160, height: 60 },
                      ]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.menuRowText}>{item.nombre}</Text>
                  )}
                  <View style={styles.downloadBtn}>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>



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
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {visibleItems.map(item => (
              <TouchableOpacity
                key={item.tienda + item.semana}
                style={[styles.card, isDesktop
                  ? { flex: 1, height: 180, backgroundColor: Colors.surface }
                  : { width: cardSize, height: cardSize * 0.5, backgroundColor: Colors.surface }]}
                activeOpacity={0.88}
                onPress={() => openItem(item)}
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

      <Modal
        visible={!!activeItem}
        animationType="slide"
        onRequestClose={() => setActiveItem(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeItem?.nombre ?? ''}
              </Text>
              {activeItem?.pdf_url ? (
                <Text style={styles.modalUrl} numberOfLines={1}>
                  {'Quelle: ' + (() => { try { return new URL(activeItem.pdf_url).hostname.replace('www.', '').replace('www-static.', '') } catch { return activeItem.pdf_url } })()}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveItem(null)}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {activeItem && (
            <WebView
              source={{ uri: getViewerUrl(activeItem) }}
              style={{ flex: 1 }}
              onLoadStart={() => setWebLoading(true)}
              onLoadEnd={() => setWebLoading(false)}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webLoader}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  headerLogo: { width: 44, height: 44 },
  title:    { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#E2001A', marginTop: 3 },

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
  grid:        { gap: Spacing.md },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },

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

  modalContainer: { flex: 1, backgroundColor: Colors.primaryDark },
  modalLogo: { width: 52, height: 32, borderRadius: 4 },
  modalUrl: { fontFamily: 'Inter-Regular', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1, textAlign: 'center' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark, gap: Spacing.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: '#fff',
  },
  webLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },

  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1, marginTop: 4,
  },
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 100, paddingRight: Spacing.lg,
  },
  menuBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    minWidth: 280,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 18, gap: 12,
  },
  menuRowText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark, flex: 1 },
  menuDivider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing.lg },
  menuStoreLogo: { width: 90, height: 34, flex: 1 },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E2001A', alignItems: 'center', justifyContent: 'center',
  },
})
