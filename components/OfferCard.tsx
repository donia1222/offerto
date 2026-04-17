import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import type { Offer } from '../types'
import { formatDate } from '../utils/formatters'
import { useFavoritesStore } from '../store/favoritesStore'

interface Props { offer: Offer }

const fmt = (v: unknown) => parseFloat(String(v)).toFixed(2)

export default function OfferCard({ offer }: Props) {
  const router = useRouter()
  const { toggle, isFav } = useFavoritesStore()
  const fav = isFav(offer.id)

  const discount       = Number(offer.descuento) || 0
  const discountColor  = discount >= 30 ? Colors.success : Colors.accent
  const isExpiringSoon = Number(offer.dias_restantes) <= 2
  const storeColor     = offer.tienda?.color ?? Colors.primary

  const [imgError, setImgError] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setImgError(false)
    if (offer.imagen) {
      timeoutRef.current = setTimeout(() => setImgError(true), 8000)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [offer.imagen])

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: storeColor }, isExpiringSoon && styles.cardExpiring]}
      onPress={() => router.push(`/offer/${offer.id}`)}
      activeOpacity={0.88}
    >
      {/* ── Imagen ── */}
      <View style={[styles.imgBox, { backgroundColor: storeColor + '12' }]}>
        {offer.imagen && !imgError ? (
          <Image
            source={{ uri: offer.imagen }}
            style={styles.img}
            resizeMode="contain"
            onLoad={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }}
            onError={() => setImgError(true)}
          />
        ) : StoreLogos[offer.tienda?.slug] ? (
          <Image source={StoreLogos[offer.tienda.slug]} style={styles.logoFallback} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>🛒</Text>
        )}

        {discount > 0 && (
          <View style={[styles.badge, { backgroundColor: discountColor }]}>
            <Text style={styles.badgeText}>-{discount}%</Text>
          </View>
        )}
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        {/* Store pill */}
        <View style={[styles.storePill, { backgroundColor: storeColor + '15' }]}>
          {StoreLogos[offer.tienda?.slug] && (
            <Image source={StoreLogos[offer.tienda.slug]} style={styles.storeLogo} resizeMode="contain" />
          )}
          <Text style={[styles.storeText, { color: storeColor }]} numberOfLines={1}>
            {offer.tienda?.nombre ?? ''}
          </Text>
        </View>

        {/* Name + fav */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>{offer.nombre}</Text>
          <TouchableOpacity onPress={() => toggle(offer)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? Colors.error : Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Prices */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>CHF {fmt(offer.precio_oferta)}</Text>
          {offer.precio_original ? (
            <Text style={styles.priceOld}>CHF {fmt(offer.precio_original)}</Text>
          ) : null}
        </View>

        {offer.unidad ? <Text style={styles.unit}>pro {offer.unidad}</Text> : null}

        {/* Expiry */}
        <View style={styles.expiryRow}>
          <Ionicons name="time-outline" size={12} color={isExpiringSoon ? Colors.warning : Colors.textLight} />
          <Text style={[styles.expiry, isExpiringSoon && styles.expiryUrgent]}>
            {Number(offer.dias_restantes) === 0
              ? 'Heute letzter Tag!'
              : isExpiringSoon
              ? `Noch ${offer.dias_restantes} Tage`
              : `bis ${formatDate(offer.valido_hasta)}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    marginBottom:    Spacing.md,
    flexDirection:   'row',
    overflow:        'hidden',
    borderLeftWidth: 3,
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 3 },
    elevation:       3,
  },
  cardExpiring: { borderColor: Colors.warning, borderWidth: 1.5, borderLeftWidth: 3 },

  imgBox: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  img:    { width: 94, height: 94 },
  logoFallback: { width: 70, height: 70, opacity: 0.4 },
  emoji:  { fontSize: 32 },

  badge: { position: 'absolute', top: 7, left: 7, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },

  info: { flex: 1, padding: Spacing.md, justifyContent: 'center' },

  storePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    gap: 4, marginBottom: 4,
  },
  storeLogo: { width: 13, height: 13, borderRadius: 2 },
  storeText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  name: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textDark, lineHeight: 20 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  price:    { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary },
  priceOld: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textLight, textDecorationLine: 'line-through' },

  unit: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textMedium, marginBottom: 2 },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  expiry:      { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textLight },
  expiryUrgent:{ color: Colors.warning },
})
