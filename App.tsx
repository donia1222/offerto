import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

const API_URL = 'https://web.lweb.ch/oferto/api';

interface Tienda {
  id: number;
  slug: string;
  nombre: string;
  color: string;
}

interface Oferta {
  id: number;
  nombre: string;
  precio_oferta: number;
  descuento: number;
  tienda: { nombre: string; color: string };
  valido_hasta: string;
}

export default function App() {
  const [tiendas, setTiendas]   = useState<Tienda[]>([]);
  const [ofertas, setOfertas]   = useState<Oferta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/tiendas.php`).then(r => r.json()),
      fetch(`${API_URL}/destacadas.php`).then(r => r.json()),
    ])
      .then(([t, o]) => {
        setTiendas(t.datos);
        setOfertas(o.datos);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7C6FCD" />
      <Text style={styles.hint}>Conectando a la API...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Error: {error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Tiendas */}
      <Text style={styles.section}>Tiendas ({tiendas.length})</Text>
      <View style={styles.row}>
        {tiendas.map(t => (
          <View key={t.id} style={[styles.badge, { backgroundColor: t.color }]}>
            <Text style={styles.badgeText}>{t.nombre}</Text>
          </View>
        ))}
      </View>

      {/* Ofertas */}
      <Text style={styles.section}>Top ofertas ({ofertas.length})</Text>
      <FlatList
        data={ofertas}
        keyExtractor={o => String(o.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.discBadge, { backgroundColor: item.descuento >= 30 ? '#4CAF82' : '#FF8C61' }]}>
              <Text style={styles.discText}>-{item.descuento}%</Text>
            </View>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.precio}>CHF {item.precio_oferta.toFixed(2)}</Text>
            <Text style={styles.meta}>{item.tienda.nombre} · hasta {item.valido_hasta}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F5F3FF', paddingTop: 60, paddingHorizontal: 16 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  hint:       { marginTop: 12, color: '#6B6B8A', fontSize: 14 },
  errorText:  { color: '#FF6B6B', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  section:    { fontSize: 18, fontWeight: '700', color: '#1C1B33', marginBottom: 10, marginTop: 16 },
  row:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2,
                shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  discBadge:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 6 },
  discText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  nombre:     { fontSize: 15, fontWeight: '600', color: '#1C1B33', marginBottom: 4 },
  precio:     { fontSize: 18, fontWeight: '800', color: '#7C6FCD', marginBottom: 4 },
  meta:       { fontSize: 12, color: '#6B6B8A' },
});
