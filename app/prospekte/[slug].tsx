import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Modal, StatusBar, Platform, Linking, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

import { api } from '../../services/api'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos, StoreColors } from '../../constants/stores'

interface ProspektItem {
  id:             number
  tienda:         string
  titulo:         string
  subtitulo:      string | null
  pdf_url:        string | null
  web_url:        string | null
  valido_desde:   string
  valido_hasta:   string
  semana:         string | null
  tipo:           string
  dias_restantes: number
}

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  aktionen:   { label: 'Aktionen',    color: '#E23744' },
  baeckerei:  { label: 'Bäckerei',    color: '#FF8C61' },
  kiosk:      { label: 'Kiosk',       color: '#7C6FCD' },
  wochenhits: { label: 'Wochen-Hits', color: '#003882' },
  guide:      { label: 'Guide',       color: '#4CAF82' },
  beilage:    { label: 'Beilage',     color: '#FFB347' },
  katalog:    { label: 'Katalog',     color: '#6B6B8A' },
}

function formatDateRange(from: string, to: string): string {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const d1 = new Date(from)
  const d2 = new Date(to)
  const d1s = `${d1.getDate()}. ${months[d1.getMonth()]}`
  const d2s = `${d2.getDate()}. ${months[d2.getMonth()]} ${d2.getFullYear()}`
  return `${d1s} – ${d2s}`
}

export default function ProspekteDetailScreen() {
  const { slug }  = useLocalSearchParams<{ slug: string }>()
  const router    = useRouter()
  const insets    = useSafeAreaInsets()

  const [items,        setItems]        = useState<ProspektItem[]>([])
  const [storeName,    setStoreName]    = useState('')
  const [loading,      setLoading]      = useState(true)
  const [activeItem,   setActiveItem]   = useState<ProspektItem | null>(null)
  const [webLoading,   setWebLoading]   = useState(true)
  const [downloading, setDownloading] = useState<number | null>(null)

  const storeColor = StoreColors[slug] ?? Colors.primary

  const load = useCallback(() => {
    setLoading(true)
    api.get('/prospekte.php', { params: { tienda: slug } })
      .then(r => {
        const groups = Array.isArray(r.data.datos) ? r.data.datos : []
        const group  = groups.find((g: any) => g.tienda === slug)
        if (group) {
          setStoreName(group.nombre)
          const tipoPriority: Record<string, number> = {
            aktionen: 0, wochenhits: 0,
            baeckerei: 1, kiosk: 2, guide: 3, beilage: 4, katalog: 5,
          }
          const sorted = [...group.items].sort((a: ProspektItem, b: ProspektItem) => {
            if (a.dias_restantes >= 0 && b.dias_restantes < 0) return -1
            if (a.dias_restantes < 0  && b.dias_restantes >= 0) return 1
            const kwDiff = (b.semana ?? '').localeCompare(a.semana ?? '')
            if (kwDiff !== 0) return kwDiff
            return (tipoPriority[a.tipo] ?? 9) - (tipoPriority[b.tipo] ?? 9)
          })
          setItems(sorted)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => { load() }, [load])

  const openItem = (item: ProspektItem) => {
    const url = item.pdf_url || item.web_url
    if (!url) return
    setWebLoading(true)
    setActiveItem(item)
  }

  const getViewerUrl = (item: ProspektItem): string => {
    if (item.pdf_url && Platform.OS === 'android') {
      return `https://docs.google.com/viewerng/viewer?url=${encodeURIComponent(item.pdf_url)}`
    }
    return item.pdf_url ?? item.web_url ?? ''
  }

  const handleDownload = async (item: ProspektItem) => {
    if (!item.pdf_url) return
    setDownloading(item.id)
    try {
      const safe     = item.titulo.replace(/[^a-z0-9äöüÄÖÜ\s-]/gi, '').trim().replace(/\s+/g, '_')
      const localUri = (FileSystem.cacheDirectory ?? '') + safe + '.pdf'
      const result   = await FileSystem.downloadAsync(item.pdf_url, localUri)
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: item.titulo,
        UTI: 'com.adobe.pdf',
      })
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? String(e))
    } finally {
      setDownloading(null)
    }
  }

  const renderItem = ({ item }: { item: ProspektItem }) => {
    const cfg     = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.katalog
    const expired = item.dias_restantes < 0
    const hasPdf  = !!item.pdf_url
    const isDown  = downloading === item.id

    return (
      <View style={[styles.card, expired && styles.cardExpired]}>
        {/* Colored accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        <View style={styles.cardInner}>
          {/* Tipo badge */}
          <View style={[styles.tipoBadge, { backgroundColor: cfg.color + '1A' }]}>
            <Text style={[styles.tipoText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, expired && styles.textFaded]} numberOfLines={2}>
            {item.titulo}
          </Text>

          {/* Subtitle (cities) */}
          {item.subtitulo ? (
            <Text style={styles.cardSub} numberOfLines={3}>{item.subtitulo}</Text>
          ) : null}

          {/* Date */}
          <Text style={styles.cardDate}>
            {item.valido_desde && item.valido_hasta
              ? formatDateRange(item.valido_desde, item.valido_hasta)
              : item.semana ?? ''}
          </Text>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            {hasPdf && (
              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: cfg.color }]}
                activeOpacity={0.75}
                onPress={() => handleDownload(item)}
                disabled={isDown}
              >
                {isDown
                  ? <ActivityIndicator size="small" color={cfg.color} />
                  : <Ionicons name="download-outline" size={15} color={cfg.color} />
                }
                <Text style={[styles.btnOutlineText, { color: cfg.color }]}>
                  {isDown ? 'Lädt…' : 'Speichern'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnFill, { backgroundColor: cfg.color, flex: hasPdf ? 1 : undefined, minWidth: hasPdf ? undefined : 120 }]}
              activeOpacity={0.78}
              onPress={() => openItem(item)}
            >
              <Ionicons name="eye-outline" size={15} color="#fff" />
              <Text style={styles.btnFillText}>Öffnen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: storeColor + '30' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {StoreLogos[slug]
            ? <Image
                source={StoreLogos[slug]}
                style={slug === 'transgourmet' ? styles.headerLogoLarge : styles.headerLogo}
                resizeMode="contain"
              />
            : <Text style={styles.headerTitle}>{storeName || slug}</Text>
          }
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={storeColor} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={44} color={Colors.textLight} />
          <Text style={styles.emptyText}>Keine Prospekte verfügbar</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* WebView modal */}
      <Modal
        visible={!!activeItem}
        animationType="slide"
        onRequestClose={() => setActiveItem(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#1C1B33" />
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveItem(null)}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeItem?.titulo ?? storeName}
              </Text>
              {activeItem?.valido_desde && activeItem?.valido_hasta ? (
                <Text style={styles.modalDate}>
                  {formatDateRange(activeItem.valido_desde, activeItem.valido_hasta)}
                </Text>
              ) : null}
            </View>
            {activeItem && (activeItem.pdf_url || activeItem.web_url) ? (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => Linking.openURL(activeItem.pdf_url ?? activeItem.web_url ?? '')}
              >
                <Ionicons name="open-outline" size={20} color="#fff" />
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />}
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
                  <ActivityIndicator size="large" color={storeColor} />
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm,
  },
  headerLogo:      { width: 90, height: 36 },
  headerLogoLarge: { width: 180, height: 36 },
  headerTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17, color: Colors.textDark },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMedium },

  list: { padding: Spacing.lg, gap: Spacing.md },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardExpired: { opacity: 0.5 },
  cardAccent:  { width: 5 },
  cardInner:   { flex: 1, padding: Spacing.lg, gap: Spacing.sm },

  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tipoText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },

  cardTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: Colors.textDark, marginTop: 2 },
  textFaded: { color: Colors.textLight },
  cardSub:   { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMedium },
  cardDate:  { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },

  cardActions: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm,
  },
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 9,
    borderRadius: Radius.full, borderWidth: 1.5,
    minWidth: 110, justifyContent: 'center',
  },
  btnOutlineText: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  btnFill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 9,
    borderRadius: Radius.full, justifyContent: 'center',
  },
  btnFillText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#1C1B33' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: '#1C1B33', gap: Spacing.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: '#fff', textAlign: 'center',
  },
  modalDate: {
    fontFamily: 'Inter-Regular', fontSize: 11,
    color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2,
  },
  webLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
})
