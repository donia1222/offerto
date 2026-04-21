import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Colors } from '../../constants/colors'
import { Spacing, Radius } from '../../constants/spacing'
import { StoreLogos } from '../../constants/stores'
import { useSettingsStore, type AppLang, type CardLayout } from '../../store/settingsStore'
import { useNotificationsStore } from '../../store/notificationsStore'

const LANGUAGES = [
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
]

const CANTONS = [
  'all', 'AG', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
  'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ',
  'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH',
]

const STORES = [
  { slug: 'aligro',       color: '#FF6600', enabled: true },
  { slug: 'topcc',        color: '#0050AA', enabled: true },
  // TODO: activar cuando Transgourmet proporcione API de imágenes — cambiar enabled: false → true
  { slug: 'transgourmet', color: '#E2001A', enabled: false },
]

export default function SettingsScreen() {
  const router = useRouter()
  const { t }  = useTranslation()

  const {
    language, canton, activeStores, compactMode, showMwst, cardLayout,
    setLanguage, setCanton, toggleStore, setCompactMode, setShowMwst, setCardLayout,
  } = useSettingsStore()

  const { enabled: notifsEnabled, setEnabled: setNotifsEnabled } = useNotificationsStore()
  const [cantonOpen, setCantonOpen] = React.useState(false)

  const onLangChange = (code: AppLang) => {
    setLanguage(code)
    i18n.changeLanguage(code)
  }

  const cantonLabel = canton === 'all' ? t('common.all') : canton

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleLeft}>
          <Image source={require('../../assets/images/trasnparehte.png')} style={styles.headerLogo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Notificaciones master toggle */}
        <View style={styles.notifCard}>
          <View style={styles.notifLeft}>
            <View style={styles.notifIcon}>
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.notifLabel}>{t('notif.masterLabel')}</Text>
              <Text style={styles.notifSub}>{notifsEnabled ? t('notif.masterOn') : t('notif.masterOff')}</Text>
            </View>
          </View>
          <Switch
            value={notifsEnabled}
            onValueChange={setNotifsEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Sprache */}
        <Text style={styles.sectionHeader}>{t('settings.languageSection')}</Text>
        <View style={styles.card}>
          <View style={styles.langGrid}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, language === l.code && styles.langBtnActive]}
                onPress={() => onLangChange(l.code as AppLang)}
                activeOpacity={0.8}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, language === l.code && styles.langLabelActive]}>{l.label}</Text>
                {language === l.code && (
                  <View style={styles.langCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lieblingsläden */}
        <Text style={styles.sectionHeader}>{t('settings.storesSection')}</Text>
        <View style={styles.card}>
          <View style={styles.storeBanners}>
            {STORES.map(s => {
              const active = activeStores.includes(s.slug)
              return (
                <TouchableOpacity
                  key={s.slug}
                  style={[styles.storeBanner, !s.enabled && styles.storeBannerDisabled]}
                  onPress={() => s.enabled && toggleStore(s.slug)}
                  activeOpacity={s.enabled ? 0.8 : 1}
                >
                  {StoreLogos[s.slug] && (
                    <Image source={StoreLogos[s.slug]} style={[styles.storeBannerLogo, !s.enabled && { opacity: 0.3 }]} resizeMode="contain" />
                  )}
                  {!s.enabled && (
                    <View style={styles.baldChip}>
                      <Ionicons name="time-outline" size={11} color="#fff" />
                      <Text style={styles.baldChipText}>Bald</Text>
                    </View>
                  )}
                  {active && s.enabled && (
                    <View style={[styles.storeBannerCheck, { backgroundColor: s.color }]}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Ansicht */}
        <Text style={styles.sectionHeader}>{t('settings.layoutSection')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layoutRow}>
          {([
            { mode: 'list', icon: 'list', label: t('settings.layoutList') },
            { mode: 'grid', icon: 'grid', label: t('settings.layoutGrid') },
          ] as { mode: CardLayout; icon: any; label: string }[]).map(({ mode, icon, label }) => (
            <TouchableOpacity
              key={mode}
              style={[styles.layoutBtn, cardLayout === mode && styles.layoutBtnActive]}
              onPress={() => setCardLayout(mode)}
              activeOpacity={0.8}
            >
              <Ionicons name={icon} size={26} color={cardLayout === mode ? Colors.primary : Colors.textMedium} />
              <Text style={[styles.layoutLabel, cardLayout === mode && styles.layoutLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Darstellung */}
        <Text style={styles.sectionHeader}>{t('settings.displaySection')}</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{t('settings.showMwst')}</Text>
            </View>
            <Switch value={showMwst} onValueChange={setShowMwst}
              trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
          </View>
        </View>

        {/* Über */}
        <Text style={styles.sectionHeader}>{t('settings.aboutSection')}</Text>
        <View style={styles.card}>
          {[
            { icon: 'information-circle-outline', key: 'version',  value: '1.0.0', onPress: undefined },
            { icon: 'star-outline',               key: 'rateApp',  value: undefined, onPress: () => {} },
            { icon: 'mail-outline',               key: 'feedback', value: undefined, onPress: () => {} },
            { icon: 'shield-checkmark-outline',   key: 'privacy',  value: undefined, onPress: () => {}, last: true },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, idx === arr.length - 1 && styles.rowLast]}
              onPress={item.onPress}
              activeOpacity={item.onPress ? 0.7 : 1}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.rowLabel}>{t(`settings.${item.key}`)}</Text>
              </View>
              {item.value && <Text style={styles.rowValue}>{item.value}</Text>}
              {item.onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
  title:      { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  titleLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 44, height: 44 },
  subtitle:   { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, marginTop: -2 },
  closeBtn:   { padding: Spacing.sm },
  scroll:   { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  notifCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12, marginTop: Spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  notifLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  notifIcon:  {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  notifLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  notifSub:   { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, marginTop: 1 },

  sectionHeader: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textLight,
    letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  rowLast:  { borderBottomWidth: 0 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowIcon:  {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  rowValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMedium, marginRight: 4 },

  langGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  langBtn: {
    flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, position: 'relative',
  },
  langBtnActive:   { borderColor: Colors.border, backgroundColor: Colors.surface },
  langFlag:        { fontSize: 20 },
  langLabel:       { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium },
  langLabelActive: { color: Colors.textDark, fontFamily: 'Inter-SemiBold' },
  langCheck: {
    position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  storeBanners: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  storeBanner: {
    flex: 1, height: 60, borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  storeBannerDisabled: { backgroundColor: Colors.divider },
  storeBannerLogo:  { width: '80%', height: 36 },
  baldChip:         { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.textLight, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 2 },
  baldChipText:     { fontFamily: 'Inter-Medium', fontSize: 9, color: '#fff' },
  storeBannerCheck: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: Spacing.md },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background, position: 'relative',
  },
  catBtnActive:      { borderColor: Colors.border, backgroundColor: Colors.surface },
  catBtnImg:         { width: 24, height: 24, borderRadius: 12 },
  catBtnLabel:       { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },
  catBtnLabelActive: { color: Colors.textDark, fontFamily: 'Inter-SemiBold' },
  catCheck: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  layoutRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  layoutBtn: {
    width: 120, alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  layoutBtnActive:  { borderColor: Colors.border, backgroundColor: Colors.primaryLight },
  layoutLabel:      { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },
  layoutLabelActive:{ color: Colors.primary, fontFamily: 'Inter-SemiBold' },

  resetCats: {
    paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  resetCatsText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textLight },

  cantonGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  cantonBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  cantonBtnActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cantonText:       { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },
  cantonTextActive: { color: '#fff' },
})
