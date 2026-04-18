import React, { useEffect, useRef } from 'react'
import { View, Image, Text, Animated, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { StoreLogos } from '../constants/stores'

const STORES = ['aligro', 'topcc', 'transgourmet']

interface Props { onDone: () => void }

export default function AppLoader({ onDone }: Props) {
  const logoScale    = useRef(new Animated.Value(0.7)).current
  const logoOpacity  = useRef(new Animated.Value(0)).current
  const textOpacity  = useRef(new Animated.Value(0)).current
  const storeOpacity = useRef(new Animated.Value(0)).current
  const fadeOut      = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity,  { toValue: 1, duration: 300, delay: 80,  useNativeDriver: true }),
      Animated.timing(storeOpacity, { toValue: 1, duration: 300, delay: 100, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone())
  }, [])

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: textOpacity }]}>
        <View style={styles.titleRow}>
          <Text style={styles.appName}>Offerto</Text>
          <Text style={styles.profi}>Profi</Text>
        </View>
        <Text style={styles.tagline}>Alle Angebote. Eine App.</Text>
      </Animated.View>

      <Animated.View style={[styles.storeRow, { opacity: storeOpacity }]}>
        {STORES.map(slug => (
          <View key={slug} style={styles.storeLogoWrap}>
            <Image source={StoreLogos[slug]} style={styles.storeLogo} resizeMode="contain" />
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          999,
  },
  logo: {
    width:  110,
    height: 110,
    borderRadius: 26,
  },
  textWrap: {
    alignItems: 'center',
    marginTop:  20,
    gap:        6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           8,
  },
  appName: {
    fontFamily:    'PlusJakartaSans-Bold',
    fontSize:      32,
    color:         Colors.textDark,
    letterSpacing: -0.5,
  },
  profi: {
    fontFamily:      'Inter-Medium',
    fontSize:        16,
    color:           Colors.primary,
    letterSpacing:   2,
    textTransform:   'uppercase',
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize:   15,
    color:      Colors.textMedium,
  },
  storeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            16,
    marginTop:      32,
  },
  storeLogoWrap: {
    width:           64,
    height:          40,
    backgroundColor: '#fff',
    borderRadius:    10,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       2,
    padding:         6,
  },
  storeLogo: {
    width:  52,
    height: 28,
  },
})
