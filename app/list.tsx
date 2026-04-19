import React from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Share, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useListStore } from '../store/listStore'
import { useSettingsStore } from '../store/settingsStore'
import { getOfferName } from '../utils/getOfferName'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import type { ListItem } from '../store/listStore'

const fmt = (v: number) => v.toFixed(2)

export default function ListScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { language } = useSettingsStore()
  const { items, remove, toggleComprado, setCantidad, clearAll, clearComprado } = useListStore()

  const totalCost    = items.reduce((s, i) => s + i.offer.precio_oferta * i.cantidad, 0)
  const totalSavings = items.reduce((s, i) => {
    const orig = i.offer.precio_original ?? i.offer.precio_oferta
    return s + (orig - i.offer.precio_oferta) * i.cantidad
  }, 0)
  const doneCount = items.filter(i => i.comprado).length

  const onShare = async () => {
    if (items.length === 0) return
    const lines = items.map(i =>
      `${i.comprado ? '✓' : '○'} ${getOfferName(i.offer, language)} x${i.cantidad} — CHF ${fmt(i.offer.precio_oferta * i.cantidad)} (${i.offer.tienda.nombre})`
    )
    lines.push(`\n${t('list.totalCost', { amount: fmt(totalCost) })}`)
    if (totalSavings > 0) lines.push(t('list.totalSaving', { amount: fmt(totalSavings) }))
    await Share.share({ message: lines.join('\n') })
  }

  const onClearAll = () =>
    Alert.alert(t('list.confirmClear'), t('list.confirmClearMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('list.clearAll'), style: 'destructive', onPress: clearAll },
    ])

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.75}>
        <Ionicons name="close" size={22} color={Colors.textDark} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('list.title')}</Text>
        <Text style={styles.subtitle}>{t('list.subtitle')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {doneCount > 0 && (
          <TouchableOpacity style={styles.headerBtn} onPress={clearComprado}>
            <Ionicons name="checkmark-done" size={18} color={Colors.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={onClearAll}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (items.length === 0) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="close" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('list.title')}</Text>
          <Text style={styles.subtitle}>{t('list.subtitle')}</Text>
        </View>
      </View>
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={64} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>{t('list.empty')}</Text>
        <Text style={styles.emptySub}>{t('list.emptyHint')}</Text>
      </View>
    </SafeAreaView>
  )

  const renderItem = ({ item }: { item: ListItem }) => {
    const { offer, cantidad, comprado } = item
    const storeColor = offer.tienda?.color ?? Colors.primary
    return (
      <View style={[styles.item, comprado && styles.itemDone]}>
        <TouchableOpacity style={styles.check} onPress={() => toggleComprado(offer.id)}>
          <View style={[styles.checkBox, comprado && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
            {comprado && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <View style={[styles.imgBox, { backgroundColor: storeColor + '12' }]}>
          {offer.imagen ? (
            <Image source={{ uri: offer.imagen }} style={styles.img} resizeMode="contain" />
          ) : StoreLogos[offer.tienda?.slug] ? (
            <Image source={StoreLogos[offer.tienda.slug]} style={styles.imgFallback} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 22 }}>🛒</Text>
          )}
        </View>

        <View style={styles.info}>
          <View style={[styles.storePill, { backgroundColor: storeColor + '15' }]}>
            <Text style={[styles.storeText, { color: storeColor }]}>{offer.tienda.nombre}</Text>
          </View>
          <Text style={[styles.name, comprado && styles.nameStrike]} numberOfLines={2}>{getOfferName(offer, language)}</Text>
          <Text style={styles.price}>CHF {fmt(offer.precio_oferta * cantidad)}</Text>
        </View>

        <View style={styles.right}>
          <TouchableOpacity onPress={() => remove(offer.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setCantidad(offer.id, cantidad - 1)}>
              <Ionicons name="remove" size={14} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.stepNum}>{cantidad}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setCantidad(offer.id, cantidad + 1)}>
              <Ionicons name="add" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Header}
      <FlatList
        data={items}
        keyExtractor={i => String(i.offer.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.footer}>
            {totalSavings > 0 && (
              <View style={styles.savingsRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.savingsText}>{t('list.totalSaving', { amount: fmt(totalSavings) })}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('list.items', { count: items.length })}</Text>
              <Text style={styles.totalPrice}>{t('list.totalCost', { amount: fmt(totalCost) })}</Text>
            </View>
            <View style={{ height: 100 }} />
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  title:    { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: -2 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 20, color: Colors.textDark },
  emptySub:   { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, textAlign: 'center', lineHeight: 22 },

  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  itemDone: { opacity: 0.6 },

  check:   { paddingHorizontal: Spacing.sm },
  checkBox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  imgBox:     { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  img:        { width: 58, height: 58 },
  imgFallback:{ width: 44, height: 44, opacity: 0.4 },

  info: { flex: 1, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm },
  storePill: {
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full, marginBottom: 3,
  },
  storeText:  { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  name:       { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textDark, lineHeight: 18, marginBottom: 3 },
  nameStrike: { textDecorationLine: 'line-through', color: Colors.textLight },
  price:      { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary },

  right: { alignItems: 'center', gap: 8, paddingRight: Spacing.sm, paddingVertical: Spacing.sm },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  stepBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, color: Colors.textDark, minWidth: 18, textAlign: 'center' },

  footer: { marginTop: Spacing.lg, paddingHorizontal: Spacing.sm },
  savingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  savingsText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.success },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  totalLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textMedium },
  totalPrice: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: Colors.textDark },
})
