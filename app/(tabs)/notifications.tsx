import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Image, KeyboardAvoidingView, Platform,
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

const STORE_COLORS: Record<string, string> = {
  aligro:       '#FF6600',
  topcc:        '#0050AA',
  transgourmet: '#E2001A',
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

  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [expanded, setExpanded] = useState(false)

  const visibleStores = ['aligro', 'topcc', 'transgourmet'].filter(s => activeStores.includes(s))

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image source={require('../../assets/images/trasnparehte.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('notif.title')}</Text>
          <Text style={styles.subtitle}>{t('notif.subtitle')}</Text>
        </View>
      </View>

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
          {watchlist.length > 0 ? (
            <View style={styles.watchChips}>
              {watchlist.map(term => (
                <View key={term} style={styles.watchChip}>
                  <Text style={styles.watchChipText}>{term}</Text>
                  <TouchableOpacity onPress={() => removeWatch(term)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.watchEmpty}>{t('notif.watchEmpty')}</Text>
          )}
        </View>

        {/* Acordeón más opciones */}
        {/* Automático */}
        <Text style={styles.sectionHeader}>{t('notif.sectionAuto')}</Text>
        <View style={[styles.card, !enabled && styles.cardDisabled]}>
          <Row icon="calendar-outline" label={t('notif.weekly')}   value={weekly}   onChange={setWeekly} />
          <Row icon="time-outline"     label={t('notif.expiring')} value={expiring} onChange={setExpiring} last />
        </View>

        {/* Por tienda */}
        <Text style={styles.sectionHeader}>{t('notif.sectionStores')}</Text>
            <View style={[styles.card, !enabled && styles.cardDisabled]}>
              {visibleStores.map((slug, idx) => (
                <View key={slug} style={[styles.row, idx === visibleStores.length - 1 && styles.rowLast]}>
                  <View style={styles.rowLeft}>
                    {StoreLogos[slug] ? (
                      <Image source={StoreLogos[slug]} style={styles.storeLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.rowIcon, { backgroundColor: STORE_COLORS[slug] + '20' }]}>
                        <Ionicons name="storefront-outline" size={18} color={STORE_COLORS[slug]} />
                      </View>
                    )}
                    <Text style={styles.rowLabel}>
                      {slug === 'aligro' ? 'Aligro' : slug === 'topcc' ? 'TopCC' : 'Transgourmet'}
                    </Text>
                  </View>
                  <Switch
                    value={stores.includes(slug) && enabled}
                    onValueChange={() => toggleStore(slug)}
                    disabled={!enabled}
                    trackColor={{ false: Colors.border, true: STORE_COLORS[slug] }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
              {visibleStores.length === 0 && (
                <View style={[styles.row, styles.rowLast]}>
                  <Text style={styles.emptyHint}>{t('notif.noStores')}</Text>
                </View>
              )}
        </View>

          <TouchableOpacity onPress={sendTest} disabled={sending} activeOpacity={0.75} style={styles.testBtn}>
            <Ionicons name="paper-plane-outline" size={16} color={Colors.textMedium} />
            <Text style={styles.testBtnText}>{sending ? t('notif.testSending') : t('notif.testBtn')}</Text>
          </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  headerLogo: { width: 44, height: 44 },
  title:      { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  subtitle:   { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: -2 },
  scroll:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, marginTop:40 },

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
  watchChips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: Spacing.md },
  watchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: Radius.full,
  },
  watchChipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary },
  watchEmpty:    { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, padding: Spacing.md },

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
