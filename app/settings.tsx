import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import { StoreLogos } from '../constants/stores'

const LANGUAGES = [
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
]

const CANTONS = [
  'Alle', 'AG', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
  'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ',
  'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH',
]

const STORES = [
  { slug: 'aligro',       label: 'Aligro',       color: '#FF6600' },
  { slug: 'topcc',        label: 'TopCC',         color: '#0050AA' },
  { slug: 'transgourmet', label: 'Transgourmet',  color: '#E2001A' },
]

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function SettingRow({ icon, label, value, onPress, last = false }: {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  last?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon as any} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
    </TouchableOpacity>
  )
}

function ToggleRow({ icon, label, value, onChange, last = false }: {
  icon: string
  label: string
  value: boolean
  onChange: (v: boolean) => void
  last?: boolean
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon as any} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#fff"
      />
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()

  const [lang,         setLang]         = useState('de')
  const [canton,       setCanton]       = useState('Alle')
  const [activeStores, setActiveStores] = useState<string[]>(['aligro', 'topcc', 'transgourmet'])
  const [compactMode,  setCompactMode]  = useState(false)
  const [showMwst,     setShowMwst]     = useState(false)
  const [cantonOpen,   setCantonOpen]   = useState(false)

  const toggleStore = (slug: string) =>
    setActiveStores(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Einstellungen</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Sprache ── */}
        <SectionHeader title="SPRACHE" />
        <View style={styles.card}>
          <View style={styles.langGrid}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
                onPress={() => setLang(l.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>{l.label}</Text>
                {lang === l.code && (
                  <View style={styles.langCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Lieblingsläden ── */}
        <SectionHeader title="LIEBLINGSLÄDEN" />
        <View style={styles.card}>
          {STORES.map((s, i) => (
            <TouchableOpacity
              key={s.slug}
              style={[styles.storeRow, i < STORES.length - 1 && styles.rowSep]}
              onPress={() => toggleStore(s.slug)}
              activeOpacity={0.8}
            >
              {StoreLogos[s.slug] && (
                <Image source={StoreLogos[s.slug]} style={styles.storeLogo} resizeMode="contain" />
              )}
              <Text style={styles.storeLabel}>{s.label}</Text>
              <View style={[
                styles.storeCheck,
                activeStores.includes(s.slug)
                  ? { backgroundColor: s.color, borderColor: s.color }
                  : { borderColor: Colors.border },
              ]}>
                {activeStores.includes(s.slug) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Kanton ── */}
        <SectionHeader title="KANTON" />
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
              <Text style={styles.rowLabel}>Kanton</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.rowValue}>{canton}</Text>
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
                >
                  <Text style={[styles.cantonText, canton === c && styles.cantonTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Darstellung ── */}
        <SectionHeader title="DARSTELLUNG" />
        <View style={styles.card}>
          <ToggleRow
            icon="grid-outline"
            label="Kompakte Ansicht"
            value={compactMode}
            onChange={setCompactMode}
          />
          <ToggleRow
            icon="pricetag-outline"
            label="Preise inkl. MwSt (7.7%)"
            value={showMwst}
            onChange={setShowMwst}
            last
          />
        </View>

        {/* ── Über die App ── */}
        <SectionHeader title="ÜBER DIE APP" />
        <View style={styles.card}>
          <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" />
          <SettingRow icon="star-outline"               label="App bewerten" onPress={() => {}} />
          <SettingRow icon="mail-outline"               label="Feedback senden" onPress={() => {}} />
          <SettingRow icon="shield-checkmark-outline"   label="Datenschutz" onPress={() => {}} last />
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

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  sectionHeader: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textLight,
    letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  rowLast:  { borderBottomWidth: 0 },
  rowSep:   { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowIcon:  {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  rowValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMedium, marginRight: 4 },

  // Language
  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md,
  },
  langBtn: {
    flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  langBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  langFlag:      { fontSize: 20 },
  langLabel:     { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMedium },
  langLabelActive: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
  langCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Stores
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  storeLogo:  { width: 52, height: 28, borderRadius: 4 },
  storeLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textDark },
  storeCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },

  // Canton
  cantonGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  cantonBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cantonBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cantonText:      { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium },
  cantonTextActive:{ color: '#fff' },
})
