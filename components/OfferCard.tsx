import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import type { Offer } from '../types'
import { formatDate } from '../utils/formatters'
import { useListStore } from '../store/listStore'
import { useSettingsStore } from '../store/settingsStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { getOfferName } from '../utils/getOfferName'

interface Props { offer: Offer }

const MWST = 1.077
const fmt  = (v: unknown) => parseFloat(String(v)).toFixed(2)

export default function OfferCard({ offer }: Props) {
  const router = useRouter()
  const { t }  = useTranslation()
  const { add, remove, isInList } = useListStore()
  const { language, compactMode, showMwst } = useSettingsStore()
  const { watchlist, addWatch, removeWatch } = useNotificationsStore()
  const inList    = isInList(offer.id)
  const name      = getOfferName(offer, language)
  const watchTerm = (offer.nombre ?? '').trim().toLowerCase()
  const watched   = watchlist.includes(watchTerm)

  const discount       = Number(offer.descuento) || 0
  const discountColor  = discount >= 30 ? Colors.success : Colors.accent
  const isExpiringSoon = Number(offer.dias_restantes) <= 2
  const storeColor     = offer.tienda?.color ?? Colors.primary

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

  const imgSize   = compactMode ? 76  : 110
  const innerSize = compactMode ? 60  : 94
  const pad       = compactMode ? Spacing.sm : Spacing.md

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: storeColor }, isExpiringSoon && styles.cardExpiring]}
      onPress={() => router.push(`/offer/${offer.id}`)}
      activeOpacity={0.88}
    >
      {/* ── Imagen ── */}
      <View style={[styles.imgBox, { width: imgSize, backgroundColor: storeColor + '12' }]}>
        {offer.imagen && !imgError ? (
          <Image
            source={{ uri: offer.imagen }}
            style={{ width: innerSize, height: innerSize }}
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
      <View style={[styles.info, { padding: pad }, compactMode && { justifyContent: 'flex-start' }]}>
        {/* Store pill */}
        {!compactMode && (
          <View style={[styles.storePill, { backgroundColor: storeColor + '15' }]}>
            {StoreLogos[offer.tienda?.slug] && (
              <Image source={StoreLogos[offer.tienda.slug]} style={styles.storeLogo} resizeMode="contain" />
            )}
            <Text style={[styles.storeText, { color: storeColor }]} numberOfLines={1}>
              {offer.tienda?.nombre ?? ''}
            </Text>
          </View>
        )}

        {/* Name + acciones */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, compactMode && styles.nameCompact]} numberOfLines={compactMode ? 1 : 2}>{name}</Text>
          <View style={styles.actionIcons}>
            <TouchableOpacity onPress={() => inList ? remove(offer.id) : add(offer)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={inList ? 'cart' : 'cart-outline'} size={26} color={inList ? Colors.primary : Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => watched ? removeWatch(watchTerm) : addWatch(watchTerm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={watched ? 'notifications' : 'notifications-outline'} size={24} color={watched ? Colors.primary : Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Prices */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, compactMode && styles.priceCompact]}>CHF {fmt(displayPrice)}</Text>
          {displayOriginal ? (
            <Text style={styles.priceOld}>CHF {fmt(displayOriginal)}</Text>
          ) : null}
          {showMwst && <Text style={styles.mwstLabel}>inkl. MwSt</Text>}
        </View>

        {offer.unidad && !compactMode ? <Text style={styles.unit}>{t('offer.unit', { unit: offer.unidad })}</Text> : null}

        {/* Expiry */}
        {(!compactMode || isExpiringSoon) && <View style={styles.expiryRow}>
          <Ionicons name="time-outline" size={12} color={isExpiringSoon ? Colors.warning : Colors.textLight} />
          <Text style={[styles.expiry, isExpiringSoon && styles.expiryUrgent]}>
            {Number(offer.dias_restantes) === 0
              ? t('offer.lastDay')
              : isExpiringSoon
              ? t('offer.daysLeft', { days: offer.dias_restantes })
              : formatDate(offer.valido_hasta)}
          </Text>
        </View>}
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

  imgBox: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
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

  nameRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  actionIcons: { flexDirection: 'column', alignItems: 'center', gap: 8 },
  name:        { flex: 1, fontSize: 18, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textDark, lineHeight: 24 },
  nameCompact: { fontSize: 15, lineHeight: 20 },

  priceRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  price:        { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary },
  priceCompact: { fontSize: 16 },
  priceOld:     { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textLight, textDecorationLine: 'line-through' },
  mwstLabel:    { fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textLight },

  unit: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textMedium, marginBottom: 2 },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  expiry:      { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textLight },
  expiryUrgent:{ color: Colors.warning },
})
