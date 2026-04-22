import React, { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, ScrollView, Platform, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode } from 'expo-av'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Radius, Spacing } from '../constants/spacing'

const { width, height } = Dimensions.get('window')

type Lang = 'de' | 'fr' | 'it' | 'en'

const EMOJIS = ['🛒', '🔍', '📋']

const SLIDES: Record<Lang, { title: string; subtitle: string; subtitleEmoji: string; body: string }[]> = {
  de: [
    { title: 'Willkommen\nbei Offerto', subtitle: 'Alle Angebote. Eine App', subtitleEmoji: '🔥', body: 'Die wöchentlichen Aktionen von Aligro, TopCC und Transgourmet — übersichtlich, schnell und immer aktuell.' },
    { title: 'Angebote\nentdecken', subtitle: 'Suchen, filtern, sparen', subtitleEmoji: '🔎', body: 'Durchstöbere hunderte Angebote nach Kategorie und Laden. Filtere direkt auf der Startseite.' },
    { title: 'Einkaufsliste\n& Prospekte', subtitle: 'Nie wieder etwas vergessen', subtitleEmoji: '🫠', body: 'Füge Angebote zur Einkaufsliste hinzu, hake Artikel ab und spare CHF. Blättere in digitalen Prospekten.' },
  ],
  fr: [
    { title: 'Bienvenue\nsur Offerto', subtitle: 'Toutes les offres. Une app', subtitleEmoji: '🔥', body: 'Les promotions hebdomadaires d\'Aligro, TopCC et Transgourmet — clair, rapide et toujours à jour.' },
    { title: 'Découvrez\nles offres', subtitle: 'Chercher, filtrer, économiser', subtitleEmoji: '🔎', body: 'Parcourez des centaines d\'offres par catégorie et magasin. Filtrez directement sur l\'écran d\'accueil.' },
    { title: 'Liste &\nProspectus', subtitle: 'N\'oubliez plus rien', subtitleEmoji: '🫠', body: 'Ajoutez des offres à votre liste, cochez les articles et économisez des CHF. Feuilletez les prospectus numériques.' },
  ],
  it: [
    { title: 'Benvenuto\nsu Offerto', subtitle: 'Tutte le offerte. Un\'app', subtitleEmoji: '🔥', body: 'Le promozioni settimanali di Aligro, TopCC e Transgourmet — chiaro, veloce e sempre aggiornato.' },
    { title: 'Scopri\nle offerte', subtitle: 'Cerca, filtra, risparmia', subtitleEmoji: '🔎', body: 'Sfoglia centinaia di offerte per categoria e negozio. Filtra direttamente nella schermata principale.' },
    { title: 'Lista &\nVolantini', subtitle: 'Non dimenticare nulla', subtitleEmoji: '🫠', body: 'Aggiungi offerte alla lista della spesa, spunta gli articoli e risparmia CHF. Sfoglia i volantini digitali.' },
  ],
  en: [
    { title: 'Welcome\nto Offerto', subtitle: 'All offers. One app', subtitleEmoji: '🔥', body: 'Weekly promotions from Aligro, TopCC and Transgourmet — clear, fast and always up to date.' },
    { title: 'Discover\noffers', subtitle: 'Search, filter, save', subtitleEmoji: '🔎', body: 'Browse hundreds of offers by category and store. Filter directly on the home screen.' },
    { title: 'Shopping list\n& Catalogs', subtitle: 'Never forget anything', subtitleEmoji: '🫠', body: 'Add offers to your shopping list, check off items and save CHF. Browse digital catalogs.' },
  ],
}

const LABELS: Record<Lang, { next: string; done: string; skip: string }> = {
  de: { next: 'Weiter', done: 'Loslegen', skip: 'Überspringen' },
  fr: { next: 'Suivant', done: 'Commencer', skip: 'Passer' },
  it: { next: 'Avanti', done: 'Inizia', skip: 'Salta' },
  en: { next: 'Next', done: 'Get started', skip: 'Skip' },
}

interface Props { lang: string; onDone: () => void }

export default function Onboarding({ lang, onDone }: Props) {
  const l      = (['de', 'fr', 'it', 'en'].includes(lang) ? lang : 'de') as Lang
  const slides = SLIDES[l]
  const labels = LABELS[l]
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true })
    setCurrent(idx)
  }

  const finish = async () => {
    await AsyncStorage.setItem('offerto-onboarding-done', 'true')
    onDone()
  }

  const handleNext = () => current < slides.length - 1 ? goTo(current + 1) : finish()

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Video background — loops silently */}
      <Video
        source={require('../assets/video/sora-video-1776799532910.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Skip */}
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {current < slides.length - 1 && (
          <TouchableOpacity style={styles.skip} onPress={finish}>
            <Text style={styles.skipText}>{labels.skip}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Slides — text blocks */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.slides}
      >
        {slides.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.textBlock}>
              <View style={styles.logoRow}>
                <View style={styles.logoIconWrap}>
                  <Image
                    source={require('../assets/images/trasnparehte.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.logoTextRow}>
                  <Text style={styles.logoText}>Offerto</Text>
                  <Text style={styles.logoProfi}>PROFI</Text>
                </View>
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                <Text style={styles.subtitleEmoji}>{slide.subtitleEmoji}</Text>
              </View>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.safeBottom} edges={['bottom']}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[styles.dot, i === current && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={styles.btnText}>
            {current === slides.length - 1 ? labels.done : labels.next}
          </Text>
          <Ionicons
            name={current === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  video: {
    position: 'absolute', top: 0, left: 0, width, height,
  },

  overlay: {
    position: 'absolute', top: 0, left: 0, width, height,
    backgroundColor: 'rgba(245,243,255,0.05)',
  },

  safeTop: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  skip: {
    alignSelf: 'flex-end',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: 'rgba(28,27,51,0.12)',
  },
  skipText: {
    fontFamily: 'Inter-Medium', fontSize: 13, color: '#1C1B33',
  },

  slides: { flex: 1 },
  slide: {
    width,
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 140,
  },
  textBlock: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: Spacing.xl,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  slideEmoji: {
    fontSize: 48, marginBottom: 2,
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6,
  },
  logoIconWrap: {
    width: 58, height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(245,243,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,205,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: 44, height: 44 },
  logoTextRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6,
  },
  logoText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: '#1C1B33', letterSpacing: 0.5,
  },
  logoProfi: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 14,
    color: '#FF4D4D', letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 32,
    color: '#1C1B33', lineHeight: 40,
  },
  subtitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15,
    color: '#E2001A',
  },
  subtitleEmoji: {
    fontSize: 26,
  },
  body: {
    fontFamily: 'Inter-Regular', fontSize: 14,
    color: '#6B6B8A', lineHeight: 22,
  },

  safeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : 0,
    gap: 16,
  },
  dots: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  dot: {
    width: 8, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(28,27,51,0.2)',
  },
  dotActive: { width: 28, backgroundColor: '#1C1B33' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(226,0,26,0.75)',
    paddingVertical: 16, borderRadius: Radius.md,
    marginBottom: 8,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 17, color: '#fff',
  },
})
