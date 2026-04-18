import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { api } from '../services/api'
import OfferCard from './OfferCard'
import { Colors } from '../constants/colors'
import { Spacing, Radius } from '../constants/spacing'
import type { Offer } from '../types'

export default function SearchButton() {
  const { t } = useTranslation()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Offer[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef    = useRef<TextInput>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await api.get('/buscar.php', { params: { q, limite: '60' } })
      setResults(res.data.datos ?? [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  const onChangeText = (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(text), 350)
  }

  const onClose = () => {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)}>
        <Ionicons name="search" size={24} color={Colors.primary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={styles.modal} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.inputWrap}>
                <Ionicons name="search" size={17} color={Colors.textLight} />
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder={t('search.placeholder')}
                  placeholderTextColor={Colors.textLight}
                  value={query}
                  onChangeText={onChangeText}
                  autoFocus
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
                    <Ionicons name="close-circle" size={17} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{t('search.cancel')}</Text>
              </TouchableOpacity>
            </View>

            {/* Results */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : query.length < 2 ? (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text style={styles.hint}>{t('search.minChars')}</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="sad-outline" size={48} color={Colors.textLight} />
                <Text style={styles.hint}>{t('search.noResults', { query })}</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={o => String(o.id)}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Text style={styles.count}>{t('search.results', { count: results.length })}</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.cardWrap}>
                    <OfferCard offer={item} />
                  </View>
                )}
                ListFooterComponent={<View style={{ height: 40 }} />}
              />
            )}

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  btn: { padding: 4, marginRight: 4 },

  modal:  { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 16,
    color: Colors.textDark, padding: 0,
  },
  cancelBtn:   { paddingHorizontal: 4 },
  cancelText:  { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.primary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  hint:   { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium },

  count:   { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMedium, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  list:    {},
  cardWrap:{ paddingHorizontal: Spacing.lg },
})
