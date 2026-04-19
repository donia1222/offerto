import React from 'react'
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'
import { useListStore } from '../store/listStore'

export default function ListButton() {
  const router = useRouter()
  const count  = useListStore(s => s.items.length)
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.push('/list')} activeOpacity={0.75}>
      <Ionicons name="cart-outline" size={26} color={Colors.textDark} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute', top: 1, right: 1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E2001A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9, fontFamily: 'Inter-Medium', color: '#fff', lineHeight: 12,
  },
})
