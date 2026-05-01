import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Image, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useSettingsStore } from '../../store/settingsStore'
import * as Notifications from 'expo-notifications'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import { offersService } from '../../services/offersService'
import type { Offer } from '../../types'

const CATEGORY_ICONS: Record<string, string> = {
  fleisch:    'restaurant-outline',
  fisch:      'fish-outline',
  gemuese:    'leaf-outline',
  milch:      'cafe-outline',
  bakery:     'pizza-outline',
  getraenke:  'wine-outline',
  snacks:     'ice-cream-outline',
  haushalt:   'home-outline',
  hygiene:    'water-outline',
  tierfutter: 'paw-outline',
}


export default function NotificationsScreen() {
  const { t } = useTranslation()
  const { activeStores } = useSettingsStore()
  const {
    enabled, weekly, expiring,
    categories, stores, watchlist,
    setEnabled, setWeekly, setExpiring,
    toggleCategory, toggleStore,
    addWatch, removeWatch,
  } = useNotificationsStore()

  const [input,        setInput]       = useState('')
  const [sending,      setSending]     = useState(false)
  const [expanded,     setExpanded]    = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [watchMatches, setWatchMatches] = useState<Record<string, Offer | null>>({})

  const visibleStores = ['aligro', 'topcc', 'transgourmet'].filter(s => activeStores.includes(s))

  useEffect(() => {
    if (watchlist.length === 0) { setWatchMatches({}); return }
    let cancelled = false
    ;(async () => {
      const next: Record<string, Offer | null> = {}
      for (const term of watchlist) {
        try {
          const results = await offersService.search(term) as unknown as Offer[]
          next[term] = Array.isArray(results) ? (results[0] ?? null) : null
        } catch {
          next[term] = null
        }
      }
      if (!cancelled) setWatchMatches(next)
    })()
    return () => { cancelled = true }
  }, [watchlist])

  const sendTest = async () => {
    setSending(true)
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Offerto 🛒', body: t('notif.testBody'), sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
      })
    } catch {}
    setSending(false)
  }

  const onAddWatch = () => {
    if (input.trim().length < 2) return
    addWatch(input.trim())
    setInput('')
  }

  const Row = ({
    icon, label, value, onChange, last = false,
  }: {
    icon: string; label: string; value: boolean
    onChange: (v: boolean) => void; last?: boolean
  }) => (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon as any} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value && enabled}
        onValueChange={onChange}
        disabled={!enabled}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#fff"
      />
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { maxWidth: 760, alignSelf: 'center' as any, width: '100%' as any }]} edges={['top']}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <View>
          <Text style={styles.title}>{t('notif.title')}</Text>
          <Text style={styles.subtitle}>{t('notif.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setSettingsOpen(true)}>
          <Ionicons name="options-outline" size={22} color={Colors.textMedium} />
        </TouchableOpacity>
      </View>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setSettingsOpen(false)}>
          <View style={styles.menuBox}>
            {/* AUTOMATISCH */}
            <Text style={styles.menuSection}>AUTOMATISCH</Text>
            <View style={styles.menuSettingRow}>
              <Text style={styles.menuRowText}>{t('notif.weekly')}</Text>
              <Switch value={weekly && enabled} onValueChange={setWeekly} disabled={!enabled}
                trackColor={{ false: Colors.border, true: '#E2001A' }} thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }} />
            </View>
            <View style={styles.menuDivider} />
            <View style={styles.menuSettingRow}>
              <Text style={styles.menuRowText}>{t('notif.expiring')}</Text>
              <Switch value={expiring && enabled} onValueChange={setExpiring} disabled={!enabled}
                trackColor={{ false: Colors.border, true: '#E2001A' }} thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }} />
            </View>

            <View style={styles.menuSectionDivider} />

            {/* NACH LADEN */}
            <Text style={styles.menuSection}>NACH LADEN</Text>
            {visibleStores.map((slug, idx) => (
              <View key={slug}>
                {idx > 0 && <View style={styles.menuDivider} />}
                <View style={styles.menuSettingRow}>
                  {StoreLogos[slug] ? (
                    <Image source={StoreLogos[slug]}
                      style={[styles.menuStoreLogo, slug === 'transgourmet' && { width: 100, height: 26 }]}
                      resizeMode="contain" />
                  ) : (
                    <Text style={styles.menuRowText}>{slug}</Text>
                  )}
                  <Switch value={stores.includes(slug) && enabled} onValueChange={() => toggleStore(slug)}
                    disabled={!enabled}
                    trackColor={{ false: Colors.border, true: '#E2001A' }} thumbColor="#fff"
                    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }} />
                </View>
              </View>
            ))}

            <View style={styles.menuSectionDivider} />

            {/* Test */}
            <TouchableOpacity style={styles.menuRow} onPress={() => { setSettingsOpen(false); sendTest() }} activeOpacity={0.75}>
              <Ionicons name="paper-plane-outline" size={16} color={Colors.textMedium} />
              <Text style={styles.menuRowText}>{sending ? t('notif.testSending') : t('notif.testBtn')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {enabled && (
          <>
          {/* Watchlist */}
        <Text style={styles.sectionHeader}>{t('notif.sectionWatch')}</Text>
        <View style={[styles.card, !enabled && styles.cardDisabled]}>
          <View style={styles.watchInputRow}>
            <TextInput
              style={[styles.watchInput, !enabled && { color: Colors.textLight }]}
              placeholder={t('notif.watchPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={onAddWatch}
              returnKeyType="done"
              editable={enabled}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.watchAddBtn, (!enabled || input.trim().length < 2) && styles.watchAddBtnDisabled]}
              onPress={onAddWatch}
              disabled={!enabled || input.trim().length < 2}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {watchlist.length > 0 ? (
          <View style={styles.watchList}>
            {watchlist.map(term => {
              const offer = watchMatches[term]
              const storeSlug = offer?.tienda?.slug
              const storeColor = offer?.tienda?.color ?? Colors.primary
              return (
                <View key={term} style={styles.watchItem}>
                  <View style={styles.watchItemImg}>
                    {offer?.imagen ? (
                      <Image source={{ uri: offer.imagen }} style={styles.watchItemImgInner} resizeMode="contain" />
                    ) : storeSlug && StoreLogos[storeSlug] ? (
                      <Image source={StoreLogos[storeSlug]} style={styles.watchItemImgFallback} resizeMode="contain" />
                    ) : (
                      <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.watchItemInfo}>
                    {storeSlug && StoreLogos[storeSlug] ? (
                      <Image
                        source={StoreLogos[storeSlug]}
                        style={[styles.watchStoreLogo, storeSlug === 'transgourmet' && styles.watchStoreLogoLarge]}
                        resizeMode="contain"
                      />
                    ) : offer?.tienda?.nombre ? (
                      <View style={[styles.watchStorePill, { backgroundColor: storeColor + '15' }]}>
                        <Text style={[styles.watchStoreText, { color: storeColor }]}>{offer.tienda.nombre}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.watchItemName} numberOfLines={2}>{term}</Text>
                    <Text style={styles.watchItemPrice}>
                      {offer
                        ? `CHF ${Number(offer.precio_oferta).toFixed(2)}`
                        : t('notif.watchingProductHint', { defaultValue: 'Wir benachrichtigen dich' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.watchItemRemove}
                    onPress={() => removeWatch(term)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        ) : null}

          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  headerLogo: { width: 44, height: 44 },
  title:      { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle:   { fontFamily: 'Inter-Medium', fontSize: 13, color: '#E2001A', marginTop: 3 },
  scroll:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, marginTop: 8 },

  masterCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: Spacing.sm,
  },
  masterLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  masterIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  masterLabel: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.textDark },
  masterSub:   { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMedium, marginTop: 2 },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 20,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  testBtnText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },

  sectionHeader: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textLight,
    letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardDisabled: { opacity: 0.55 },

  accordionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.lg, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  accordionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  rowLast:  { borderBottomWidth: 0 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowIcon:  { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  storeLogo:  { width: 48, height: 28, borderRadius: 3 },
  emptyHint:  { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, paddingVertical: 4 },

  watchInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  watchInput:         { flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textDark, paddingVertical: 6 },
  watchAddBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  watchAddBtnDisabled:{ backgroundColor: Colors.border },
  watchList: { marginTop: Spacing.sm },
  watchItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  watchItemImg: {
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  watchItemImgInner:    { width: 58, height: 58 },
  watchItemImgFallback: { width: 44, height: 44, opacity: 0.4 },
  watchItemInfo: {
    flex: 1, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm,
  },
  watchStoreLogo:      { width: 60, height: 22, marginBottom: 4 },
  watchStoreLogoLarge: { width: 120, height: 44 },
  watchStorePill: {
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full, marginBottom: 3,
  },
  watchStoreText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  watchItemName: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textDark, lineHeight: 18, marginBottom: 3,
    textTransform: 'capitalize',
  },
  watchItemPrice: {
    fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary,
  },
  watchItemRemove: {
    paddingRight: Spacing.md, paddingLeft: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  watchEmpty: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },

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
    minWidth: 300,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
    overflow: 'hidden',
  },
  menuSection: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textLight,
    letterSpacing: 0.8, paddingHorizontal: Spacing.lg, paddingTop: 14, paddingBottom: 6,
  },
  menuSectionDivider: { height: 8, backgroundColor: Colors.background },
  menuSettingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  menuStoreLogo: { width: 75, height: 28 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  menuRowText: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textDark, flex: 1 },
  menuDivider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing.lg },

  chipCard: { overflow: 'visible' },
  chipRow:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 8 },
  catChip: {
    alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.lg, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border, minWidth: 72,
  },
  catChipActive:      { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catChipLabel:       { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textMedium, textAlign: 'center' },
  catChipLabelActive: { color: Colors.primary },
})
