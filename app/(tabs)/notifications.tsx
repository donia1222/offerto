import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Image, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'

const CATEGORY_ICONS: Record<string, string> = {
  fleisch:    '🥩',
  fisch:      '🐟',
  gemuese:    '🥦',
  milch:      '🧀',
  bakery:     '🥖',
  getraenke:  '🥤',
  snacks:     '🍫',
  haushalt:   '🧹',
  hygiene:    '🧴',
  tierfutter: '🐾',
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

  const [input, setInput] = useState('')

  const visibleStores = ['aligro', 'topcc', 'transgourmet'].filter(s => activeStores.includes(s))

  const onAddWatch = () => {
    if (input.trim().length < 2) return
    addWatch(input.trim())
    setInput('')
  }

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={styles.sectionHeader}>{label}</Text>
  )

  const Row = ({
    icon, label, value, onChange, last = false, disabled = false,
  }: {
    icon: string; label: string; value: boolean
    onChange: (v: boolean) => void; last?: boolean; disabled?: boolean
  }) => (
    <View style={[styles.row, last && styles.rowLast, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon as any} size={18} color={disabled ? Colors.textLight : Colors.primary} />
        </View>
        <Text style={[styles.rowLabel, disabled && { color: Colors.textLight }]}>{label}</Text>
      </View>
      <Switch
        value={value && enabled}
        onValueChange={onChange}
        disabled={disabled || !enabled}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#fff"
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notif.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Master toggle */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <View style={[styles.masterIcon, { backgroundColor: enabled ? Colors.primary : Colors.border }]}>
              <Ionicons name="notifications" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.masterLabel}>{t('notif.masterLabel')}</Text>
              <Text style={styles.masterSub}>{enabled ? t('notif.masterOn') : t('notif.masterOff')}</Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Automático */}
        <SectionHeader label={t('notif.sectionAuto')} />
        <View style={[styles.card, !enabled && styles.cardDisabled]}>
          <Row
            icon="calendar-outline"
            label={t('notif.weekly')}
            value={weekly}
            onChange={setWeekly}
            disabled={!enabled}
          />
          <Row
            icon="time-outline"
            label={t('notif.expiring')}
            value={expiring}
            onChange={setExpiring}
            last
            disabled={!enabled}
          />
        </View>

        {/* Por categoría — chips horizontales */}
        <SectionHeader label={t('notif.sectionCategories')} />
        <View style={[styles.card, styles.chipCard, !enabled && styles.cardDisabled]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {Object.entries(CATEGORY_ICONS).map(([slug, emoji]) => {
              const active = categories.includes(slug) && enabled
              return (
                <TouchableOpacity
                  key={slug}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => enabled && toggleCategory(slug)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.catChipEmoji}>{emoji}</Text>
                  <Text style={[styles.catChipLabel, active && styles.catChipLabelActive]} numberOfLines={1}>
                    {t(`categories.${slug}`)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Por tienda */}
        <SectionHeader label={t('notif.sectionStores')} />
        <View style={[styles.card, !enabled && styles.cardDisabled]}>
          {visibleStores.map((slug, idx) => (
            <View
              key={slug}
              style={[styles.row, idx === visibleStores.length - 1 && styles.rowLast, !enabled && styles.rowDisabled]}
            >
              <View style={styles.rowLeft}>
                {StoreLogos[slug] ? (
                  <Image source={StoreLogos[slug]} style={[styles.storeLogo, { tintColor: undefined }]} resizeMode="contain" />
                ) : (
                  <View style={[styles.rowIcon, { backgroundColor: STORE_COLORS[slug] + '20' }]}>
                    <Ionicons name="storefront-outline" size={18} color={STORE_COLORS[slug]} />
                  </View>
                )}
                <Text style={[styles.rowLabel, !enabled && { color: Colors.textLight }]}>
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

        {/* Watchlist de productos */}
        <SectionHeader label={t('notif.sectionWatch')} />
        <View style={[styles.card, !enabled && styles.cardDisabled]}>
          {/* Input */}
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

          {/* Chips */}
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

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  masterCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
    marginBottom: Spacing.sm,
  },
  masterLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  masterIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  masterLabel: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.textDark },
  masterSub:   { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMedium, marginTop: 2 },

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

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  rowLast:     { borderBottomWidth: 0 },
  rowDisabled: { opacity: 0.6 },
  rowLeft:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel:      { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  categoryEmoji: { fontSize: 20, width: 32, textAlign: 'center' },
  storeLogo:     { width: 48, height: 28, borderRadius: 3 },
  emptyHint:     { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, paddingVertical: 4 },

  watchInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  watchInput: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 15,
    color: Colors.textDark, paddingVertical: 6,
  },
  watchAddBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  watchAddBtnDisabled: { backgroundColor: Colors.border },

  watchChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: Spacing.md,
  },
  watchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  watchChipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary },
  watchEmpty:    { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, padding: Spacing.md },

  chipCard: { overflow: 'visible' },
  chipRow:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 8 },
  catChip: {
    alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    minWidth: 72,
  },
  catChipActive:      { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catChipEmoji:       { fontSize: 22 },
  catChipLabel:       { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textMedium, textAlign: 'center' },
  catChipLabelActive: { color: Colors.primary },
})
