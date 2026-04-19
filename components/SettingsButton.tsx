import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'

export default function SettingsButton() {
  const router = useRouter()
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.push('/settings')} activeOpacity={0.75}>
      <Ionicons name="settings-outline" size={22} color={Colors.textDark} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginLeft: 4,
  },
})
