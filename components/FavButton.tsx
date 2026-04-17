import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useFavoritesStore } from '../store/favoritesStore'
import { Colors } from '../constants/colors'

export default function FavButton() {
  const router = useRouter()
  const count  = useFavoritesStore(s => s.favorites.length)

  return (
    <TouchableOpacity onPress={() => router.push('/favorites')} style={styles.btn}>
      <Ionicons name={count > 0 ? 'heart' : 'heart-outline'} size={24} color={Colors.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn:       { padding: 4, marginRight: 4 },
  badge: {
    position:        'absolute',
    top:             -2,
    right:           -2,
    backgroundColor: Colors.error,
    borderRadius:    9999,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter-Medium' },
})
