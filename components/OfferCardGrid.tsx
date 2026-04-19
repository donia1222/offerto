import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import type { Offer } from '../types'
import { useListStore } from '../store/listStore'
import { useSettingsStore } from '../store/settingsStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { getOfferName } from '../utils/getOfferName'

interface Props { offer: Offer }

const MWST = 1.077
const fmt  = (v: unknown) => parseFloat(String(v)).toFixed(2)

export default function OfferCardGrid({ offer }: Props) {
  const router = useRouter()
  const { t }  = useTranslation()
  const { add, remove, isInList } = useListStore()
  const { language, showMwst } = useSettingsStore()
  const { watchlist, addWatch, removeWatch } = useNotificationsStore()
  const inList    = isInList(offer.id)
  const name      = getOfferName(offer, language)
  const watchTerm = (offer.nombre ?? '').trim().toLowerCase()
  const watched   = watchlist.includes(watchTerm)

  const discount      = Number(offer.descuento) || 0
  const discountColor = discount >= 30 ? Colors.success : Colors.accent
  const storeColor    = offer.tienda?.color ?? Colors.primary

  const displayPrice    = showMwst ? Number(offer.precio_oferta) * MWST : Number(offer.precio_oferta)
  const displayOriginal = offer.precio_original ? Number(offer.precio_original) * (showMwst ? MWST : 1) : null

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
      style={styles.card}
      onPress={() => router.push(`/offer/${offer.id}`)}
      activeOpacity={0.88}
    >
      {/* Image */}
      <View style={[styles.imgBox, { backgroundColor: '#fff' }]}>
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

        {offer.dias_restantes <= 2 && (
          <View style={styles.urgencyBadge}>
            <Ionicons name="time" size={10} color="#fff" />
            <Text style={styles.urgencyText}>
              {offer.dias_restantes === 0 ? 'Letzter Tag' : `Noch ${offer.dias_restantes}d`}
            </Text>
          </View>
        )}

      </View>

      {/* Info */}
      <View style={styles.info}>
        {StoreLogos[offer.tienda?.slug] && (
          <Image source={StoreLogos[offer.tienda.slug]} style={styles.storeLogo} resizeMode="contain" />
        )}
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: Colors.primary }]}>CHF {fmt(displayPrice)}</Text>
          {displayOriginal && (
            <Text style={styles.priceOld}>CHF {fmt(displayOriginal)}</Text>
          )}
        </View>
        {offer.unidad ? <Text style={styles.unit}>{offer.unidad}</Text> : null}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, inList && { backgroundColor: '#FFF0F0' }]}
          onPress={() => inList ? remove(offer.id) : add(offer)}
          activeOpacity={0.75}
        >
          <Ionicons name={inList ? 'cart' : 'cart-outline'} size={inList ? 24 : 20} color={inList ? '#E2001A' : Colors.textMedium} />
        </TouchableOpacity>
        <View style={styles.footerDivider} />
        <TouchableOpacity
          style={[styles.footerBtn, watched && { backgroundColor: Colors.successLight }]}
          onPress={() => watched ? removeWatch(watchTerm) : addWatch(watchTerm)}
          activeOpacity={0.75}
        >
          <Ionicons name={watched ? 'notifications' : 'notifications-outline'} size={watched ? 22 : 19} color={watched ? Colors.success : Colors.textMedium} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     '#D8D5EE',
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 3 },
    elevation:       3,
    flex:            1,
    height:          '100%',
  },

  imgBox: {
    width:           '100%',
    height:          160,
    alignItems:      'center',
    justifyContent:  'center',
    position:        'relative',
  },
  img:         { width: '80%', height: '80%' },
  logoFallback:{ width: 60, height: 60, opacity: 0.35 },
  emoji:       { fontSize: 36 },

  badge: {
    position: 'absolute', top: 8, left: 8,
    borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },

  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  footerBtn: {
    flex: 1, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  footerDivider: {
    width: 1, backgroundColor: Colors.divider,
  },

  info:      { padding: Spacing.sm, gap: 3, flex: 1 },
  storeLogo: { width: 64, height: 24, marginBottom: 2 },
  name:      { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark, lineHeight: 20 },

  priceRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  price:     { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16 },
  priceOld:  { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, textDecorationLine: 'line-through' },
  unit:      { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMedium },
  urgencyBadge: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.warning, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  urgencyText: { fontFamily: 'Inter-Medium', fontSize: 10, color: '#fff' },
})
