import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useFavoritesStore } from '../store/favoritesStore'
import OfferCard from '../components/OfferCard'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

export default function FavoritesScreen() {
  const router    = useRouter()
  const { t }     = useTranslation()
  const favorites = useFavoritesStore(s => s.favorites)

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -4 }}>
              <Ionicons name="chevron-back" size={26} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{t('favorites.empty')}</Text>
          <Text style={styles.emptySub}>{t('favorites.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <OfferCard offer={item} />
            </View>
          )}
          ListHeaderComponent={
            <Text style={styles.count}>{t('favorites.count', { count: favorites.length })}</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.textDark },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  emptyTitle:  { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 20, color: Colors.textDark },
  emptySub:    { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, textAlign: 'center', lineHeight: 22 },
  list:        { paddingBottom: 32, paddingTop: Spacing.md },
  count:       { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textMedium, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  cardWrap:    { paddingHorizontal: Spacing.lg },
})
