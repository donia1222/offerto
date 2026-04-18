import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'

export default function SettingsButton() {
  const router = useRouter()
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.push('/settings')}>
      <Ionicons name="settings-outline" size={24} color={Colors.primary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { padding: 4, marginLeft: 4 },
})
