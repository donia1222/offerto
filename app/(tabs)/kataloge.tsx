import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ImageBackground, ActivityIndicator, Modal, ScrollView,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { formatDate } from '../../utils/formatters'
import FavButton from '../../components/FavButton'
import SearchButton from '../../components/SearchButton'
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
const STORE_IMAGES: Record<string, any> = {
  aligro:       require('../../assets/images/prospectos/aligro.png'),
  topcc:        require('../../assets/images/prospectos/topcc.png'),
  transgourmet: require('../../assets/images/prospectos/transgousrmet.png'),
}

export default function KatalogeScreen() {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const cardSize   = width - Spacing.lg * 2

  const [items, setItems]           = useState<FolletoData[]>([])
  const [loading, setLoading]       = useState(true)
  const [active, setActive]         = useState<FolletoData | null>(null)
  const [webLoading, setWebLoading] = useState(true)

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

  const open = (item: FolletoData) => { setWebLoading(true); setActive(item) }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Prospekte</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SearchButton />
          <FavButton />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="document-text-outline" size={40} color={Colors.textLight} />
            <Text style={styles.emptyText}>Keine Kataloge verfügbar</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map(item => (
              <TouchableOpacity
                key={item.tienda}
                style={[styles.card, { width: cardSize, height: item.tienda === 'topcc' ? cardSize * 0.8 : cardSize }]}
                activeOpacity={0.88}
                onPress={() => open(item)}
              >
                <ImageBackground
                  source={STORE_IMAGES[item.tienda]}
                  style={styles.cardImg}
                  imageStyle={styles.cardImgStyle}
                  resizeMode="contain"
                >
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal viewer */}
      <Modal
        visible={!!active}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActive(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: STORE_COLORS[active?.tienda ?? ''] ?? Colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{active?.nombre}</Text>
              <Text style={styles.modalSub}>
                {active?.semana} · {formatDate(active?.valido_desde ?? '')} – {formatDate(active?.valido_hasta ?? '')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActive(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {active?.pdf_url && (
            <WebView
              source={{ uri: active.pdf_url }}
              style={styles.webview}
              onLoadStart={() => setWebLoading(true)}
              onLoadEnd={() => setWebLoading(false)}
            />
          )}

          {webLoading && (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.webviewLoadingText}>Katalog wird geladen...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { flex: 1, fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  content:  { padding: Spacing.lg, gap: Spacing.lg },
  centerBox:{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },

  card: {
    borderRadius:  Radius.xl,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOpacity: 0.12,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 5 },
    elevation:     5,
  },
  grid:         { gap: Spacing.md },
  cardImg:      { flex: 1 },
  cardImgStyle: { borderRadius: Radius.xl },
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

  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 2, backgroundColor: Colors.surface,
  },
  modalTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 18, color: Colors.textDark },
  modalSub:   { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMedium, marginTop: 2 },
  closeBtn:   { padding: Spacing.sm },
  webview:    { flex: 1 },
  webviewLoading: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, gap: 12,
  },
  webviewLoadingText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium },
})
