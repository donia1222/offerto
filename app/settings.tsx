import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'
import { useSettingsStore, type AppLang } from '../store/settingsStore'

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
  { slug: 'aligro',       color: '#FF6600' },
  { slug: 'topcc',        color: '#0050AA' },
  { slug: 'transgourmet', color: '#E2001A' },
]

export default function SettingsScreen() {
  const router = useRouter()
  const { t }  = useTranslation()

  const {
    language, canton, activeStores, compactMode, showMwst,
    setLanguage, setCanton, toggleStore, setCompactMode, setShowMwst,
  } = useSettingsStore()

  const [cantonOpen, setCantonOpen] = React.useState(false)

  const onLangChange = (code: AppLang) => {
    setLanguage(code)
    i18n.changeLanguage(code)
  }

  const cantonLabel = canton === 'all' ? t('common.all') : canton

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

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
                  style={styles.storeBanner}
                  onPress={() => toggleStore(s.slug)}
                  activeOpacity={0.8}
                >
                  {StoreLogos[s.slug] && (
                    <Image source={StoreLogos[s.slug]} style={styles.storeBannerLogo} resizeMode="contain" />
                  )}
                  {active && (
                    <View style={[styles.storeBannerCheck, { backgroundColor: s.color }]}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Kanton */}
        <Text style={styles.sectionHeader}>{t('settings.cantonSection')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => setCantonOpen(!cantonOpen)}
            activeOpacity={0.8}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{t('settings.canton')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.rowValue}>{cantonLabel}</Text>
              <Ionicons name={cantonOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
          {cantonOpen && (
            <View style={styles.cantonGrid}>
              {CANTONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.cantonBtn, canton === c && styles.cantonBtnActive]}
                  onPress={() => { setCanton(c); setCantonOpen(false) }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cantonText, canton === c && styles.cantonTextActive]}>
                    {c === 'all' ? t('common.all') : c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Darstellung */}
        <Text style={styles.sectionHeader}>{t('settings.displaySection')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="grid-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{t('settings.compactMode')}</Text>
            </View>
            <Switch value={compactMode} onValueChange={setCompactMode}
              trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
          </View>
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
  title:    { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.textDark },
  closeBtn: { padding: Spacing.sm },
  scroll:   { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

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
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight,
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
  langBtnActive:   { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  langFlag:        { fontSize: 20 },
  langLabel:       { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium },
  langLabelActive: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
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
  storeBannerLogo:  { width: '80%', height: 36 },
  storeBannerCheck: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

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
