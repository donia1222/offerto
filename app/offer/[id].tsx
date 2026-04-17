import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { useListStore } from '../../store/listStore'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import type { Offer } from '../../types'
import { formatDate } from '../../utils/formatters'

export default function OfferDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()

  const [offer, setOffer]       = useState<Offer | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [imgError, setImgError] = useState(false)
  const { add, remove, isInList } = useListStore()

  useEffect(() => {
    api.get(`/ofertas.php?id=${id}`)
      .then(r => setOffer(r.data.datos))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const onShare = async () => {
    if (!offer) return
    await Share.share({
      message: `${offer.nombre} – CHF ${offer.precio_oferta.toFixed(2)} bei ${offer.tienda.nombre} (bis ${formatDate(offer.valido_hasta)})`,
    })
  }

  if (loading) return (
    <SafeAreaView style={styles.center} edges={['bottom']}>
      <Stack.Screen options={{ headerTitle: '' }} />
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  )

  if (error || !offer) return (
    <SafeAreaView style={styles.center} edges={['bottom']}>
      <Stack.Screen options={{ headerTitle: '' }} />
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.errorText}>Angebot nicht gefunden</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Zurück</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  const discountColor   = offer.descuento >= 30 ? Colors.success : Colors.accent
  const isExpiringSoon  = offer.dias_restantes <= 2
  const savings         = offer.precio_original ? offer.precio_original - offer.precio_oferta : null

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: offer.tienda.color }}>
              {offer.tienda.nombre}
            </Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -4 }}>
              <Ionicons name="chevron-back" size={26} color={Colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={onShare} style={{ padding: 8 }}>
              <Ionicons name="share-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Imagen */}
        <View style={[styles.imageWrap, { backgroundColor: offer.tienda.color + '12', marginTop: 10 }]}>
          {offer.imagen && !imgError ? (
            <Image
              source={{ uri: offer.imagen }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={styles.imagePlaceholder}>🛒</Text>
          )}
          {/* Badge descuento */}
          {offer.descuento > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: discountColor }]}>
              <Text style={styles.discountText}>-{offer.descuento}%</Text>
            </View>
          )}
          {/* Urgencia */}
          {isExpiringSoon && (
            <View style={styles.urgencyBadge}>
              <Ionicons name="time" size={12} color={Colors.warning} />
              <Text style={styles.urgencyText}>
                {offer.dias_restantes === 0 ? 'Heute letzter Tag!' : `Noch ${offer.dias_restantes} Tage`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>

          {/* Store logo */}
          {StoreLogos[offer.tienda.slug] && (
            <Image source={StoreLogos[offer.tienda.slug]} style={styles.storeLogo} resizeMode="contain" />
          )}

          {/* Nombre */}
          <Text style={styles.name}>{offer.nombre}</Text>
          {offer.unidad && <Text style={styles.unit}>pro {offer.unidad}</Text>}

          {/* Precio */}
          <View style={styles.priceCard}>
            <View style={styles.priceMain}>
              <Text style={styles.priceLabel}>Angebotspreis</Text>
              <Text style={styles.price}>CHF {offer.precio_oferta.toFixed(2)}</Text>
            </View>
            {offer.precio_original && (
              <View style={styles.priceSide}>
                <Text style={styles.priceOldLabel}>Normalpreis</Text>
                <Text style={styles.priceOld}>CHF {offer.precio_original.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Zur Liste */}
          <TouchableOpacity
            style={[styles.listBtn, isInList(offer.id) && styles.listBtnActive]}
            onPress={() => isInList(offer.id) ? remove(offer.id) : add(offer)}
            activeOpacity={0.85}
          >
            <Ionicons name={isInList(offer.id) ? 'cart' : 'cart-outline'} size={20} color={isInList(offer.id) ? '#fff' : Colors.primary} />
            <Text style={[styles.listBtnText, isInList(offer.id) && { color: '#fff' }]}>
              {isInList(offer.id) ? 'Von Liste entfernen' : 'Zur Einkaufsliste'}
            </Text>
          </TouchableOpacity>

          {/* Ahorro */}
          {savings && savings > 0 && (
            <View style={styles.savingsBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.savingsText}>
                Sie sparen CHF {savings.toFixed(2)} ({offer.descuento}% Rabatt)
              </Text>
            </View>
          )}

          {/* Validez */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gültigkeitszeitraum</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textMedium} />
                <View>
                  <Text style={styles.dateLabel}>Von</Text>
                  <Text style={styles.dateValue}>{formatDate(offer.valido_desde)}</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color={Colors.textLight} />
              <View style={styles.dateItem}>
                <Ionicons name="calendar" size={16} color={isExpiringSoon ? Colors.warning : Colors.textMedium} />
                <View>
                  <Text style={styles.dateLabel}>Bis</Text>
                  <Text style={[styles.dateValue, isExpiringSoon && { color: Colors.warning }]}>
                    {formatDate(offer.valido_hasta)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tienda info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Laden</Text>
            <View style={[styles.storeCard, { borderLeftColor: offer.tienda.color }]}>
              {StoreLogos[offer.tienda.slug] && (
                <Image source={StoreLogos[offer.tienda.slug]} style={styles.storeCardLogo} resizeMode="contain" />
              )}
              <View>
                <Text style={styles.storeCardName}>{offer.tienda.nombre}</Text>
                <Text style={styles.storeCardType}>Cash &amp; Carry · Schweiz</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: Colors.background },
  errorText:   { fontFamily: 'Inter-Regular', fontSize: 17, color: Colors.textMedium },
  backBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full },
  backBtnText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 16 },

  imageWrap: {
    height:         280,
    alignItems:     'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius:   Radius.xl,
    overflow:       'hidden',
    position:       'relative',
  },
  image:            { width: '80%', height: '80%' },
  imagePlaceholder: { fontSize: 80 },
  favBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20, width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  discountBadge: {
    position: 'absolute', top: 14, left: 14,
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  discountText: { color: '#fff', fontFamily: 'PlusJakartaSans-Bold', fontSize: 18 },
  urgencyBadge: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  urgencyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.warning },

  body:       { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg },

  storePill: {
    alignSelf:      'flex-start',
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius:   Radius.full,
  },
  storeLogo:    { width: 72, height: 36, borderRadius: 4 },
  storeText:    { fontFamily: 'Inter-Medium', fontSize: 15 },
  categoryIcon: { fontSize: 16 },

  name:       { fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: Colors.textDark, lineHeight: 32 },
  unit:       { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium },

  priceCard: {
    backgroundColor:  Colors.surface,
    borderRadius:     Radius.lg,
    padding:          Spacing.lg,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    shadowColor:      '#000',
    shadowOpacity:    0.05,
    shadowRadius:     6,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        2,
  },
  priceMain:      { gap: 4 },
  priceLabel:     { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  price:          { fontFamily: 'PlusJakartaSans-Bold', fontSize: 34, color: Colors.primary },
  priceSide:      { alignItems: 'flex-end', gap: 4 },
  priceOldLabel:  { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  priceOld: {
    fontFamily: 'Inter-Regular', fontSize: 20, color: Colors.textLight,
    textDecorationLine: 'line-through',
  },

  listBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  listBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  listBtnText:   { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.primary },

  savingsBanner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    backgroundColor: Colors.successLight,
    borderRadius:   Radius.md,
    padding:        Spacing.md,
  },
  savingsText: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.success, flex: 1 },

  section:      { gap: Spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17, color: Colors.textDark },

  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  dateLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textLight },
  dateValue: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textDark },

  storeCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    borderLeftWidth: 4,
  },
  storeCardLogo: { width: 64, height: 40, borderRadius: 6 },
  storeCardName: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 18, color: Colors.textDark },
  storeCardType: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMedium, marginTop: 2 },
})
