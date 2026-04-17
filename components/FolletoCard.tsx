import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Modal, SafeAreaView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import { api } from '../services/api'

interface FolletoData {
  tienda:       string
  nombre:       string
  semana:       string
  pdf_url:      string | null
  valido_desde: string
  valido_hasta: string
}

export default function FolletoCard() {
  const [data, setData]       = useState<FolletoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [webLoading, setWebLoading] = useState(true)

  useEffect(() => {
    api.get('/folleto.php')
      .then(r => setData(r.data.datos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <View style={styles.card}>
      <ActivityIndicator color={Colors.primary} size="small" />
    </View>
  )

  if (!data?.pdf_url) return null

  return (
    <>
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => { setWebLoading(true); setOpen(true) }}>
        <View style={styles.left}>
          {StoreLogos['transgourmet'] && (
            <Image source={StoreLogos['transgourmet']} style={styles.logo} resizeMode="contain" />
          )}
          <View style={styles.textBlock}>
            <Text style={styles.title}>Transgourmet / Prodega</Text>
            <Text style={styles.sub}>Wochenprospekt · {data.semana}</Text>
            <Text style={styles.dates}>{data.valido_desde} – {data.valido_hasta}</Text>
          </View>
        </View>
        <View style={styles.btn}>
          <Ionicons name="document-text" size={14} color="#fff" />
          <Text style={styles.btnText}>Öffnen</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Transgourmet / Prodega</Text>
              <Text style={styles.modalSub}>{data.semana} · {data.valido_desde} – {data.valido_hasta}</Text>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          <WebView
            source={{ uri: data.pdf_url }}
            style={styles.webview}
            onLoadStart={() => setWebLoading(true)}
            onLoadEnd={() => setWebLoading(false)}
          />

          {webLoading && (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.webviewLoadingText}>Katalog wird geladen...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    marginBottom:    Spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       2,
    borderLeftWidth: 4,
    borderLeftColor: '#E2001A',
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
    flex:          1,
  },
  logo: {
    width: 52, height: 30, borderRadius: 4,
  },
  textBlock: { flex: 1 },
  title: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize:   14,
    color:      Colors.textDark,
    marginBottom: 2,
  },
  sub: {
    fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textMedium,
  },
  dates: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, marginTop: 2,
  },
  btn: {
    backgroundColor: '#E2001A',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    marginLeft:        Spacing.sm,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
  },
  btnText: {
    color: Colors.textInverse, fontFamily: 'Inter-Medium', fontSize: 12,
  },
  modalContainer: {
    flex: 1, backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor:   Colors.surface,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.textDark,
  },
  modalSub: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMedium, marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position:        'absolute',
    top: 60, left: 0, right: 0, bottom: 0,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  webviewLoadingText: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMedium,
  },
})
