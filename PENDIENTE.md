# PENDIENTE — Cambios a implementar

---

## A) Adaptaciones legales (mostrar ofertas sin acuerdo con tiendas)

### ~~A1. Kataloge — eliminar WebView embebido como vista principal~~ ✅
**Qué cambiar:** La pantalla Kataloge muestra el PDF directamente en un WebView.
Esto redistribuye contenido protegido (diseño, imágenes, layout del folleto).
**Cómo:** Convertir el modal WebView en un simple botón "Ver folleto original →" que abre el PDF en el navegador del sistema (`Linking.openURL`). La vista principal debe mostrar solo los datos estructurados del backend.

### ~~A2. Kataloge — añadir atribución de fuente~~ ✅
**Qué cambiar:** Cada card de tienda debe mostrar "Quelle: [Tienda]" o "Fuente: [Tienda]" debajo del título.
**Cómo:** Añadir un `<Text>` con el campo `item.tienda` + estilo `textLight` en cada card.

### ~~A3. OfferCard / OfferDetail — nunca mostrar imágenes de la tienda~~ ✅
**Qué cambiar:** Cuando `offer.imagen` falla, el fallback actual usa el logo de la tienda (`StoreLogos`). Esto puede incluir assets con copyright.
**Cómo:** Cambiar el fallback en `OfferCard.tsx` (línea 73) y `OfferCardGrid.tsx` (línea 65) para usar la imagen de la categoría (`CATEGORY_IMAGES[offer.categoria?.slug]`) en lugar del logo de tienda. El logo de tienda solo aparece en la sección `info`, no como imagen de producto.

### ~~A4. OfferDetail — añadir botón "Ver oferta original"~~ ✅
**Qué cambiar:** La pantalla de detalle no tiene ningún link a la fuente original.
**Cómo:** Añadir al final del scroll un botón secundario "Originalangebot ansehen →" que llame a `Linking.openURL(offer.fuente_url)` si el campo existe.

---

## B) Bugs y mejoras detectadas en el análisis

### ~~B1. Settings — selector de cantón no renderizado~~ ✅
**Archivo:** `app/(tabs)/settings.tsx`
**Problema:** El array `CANTONS` y los estilos `cantonGrid/cantonBtn` están definidos pero nunca se renderizan. No hay selector de cantón en la UI.
**Qué hacer:** Añadir sección "Kanton" en el ScrollView, entre Lieblingsläden y Ansicht, con el grid de botones de cantón que actualice `settingsStore.setCanton()`.

### ~~B2. Home — empty state faltante~~ ✅
**Archivo:** `app/(tabs)/index.tsx`
**Problema:** Si `offers.length === 0` después de cargar (filtro muy restrictivo o sin datos), la pantalla queda en blanco — solo el header fijo.
**Qué hacer:** Añadir un `ListEmptyComponent` en el `Animated.FlatList` con icono + texto "Keine Angebote gefunden" + botón para resetear filtros.

### ~~B3. Kataloge — store chips definidos pero no renderizados~~ ✅
**Archivo:** `app/(tabs)/kataloge.tsx`
**Problema:** `STORE_CHIPS` y los estilos `chipScroll/chipBar/chip` están definidos pero no hay JSX que los muestre.
**Qué hacer:** Añadir el `ScrollView` horizontal con los chips entre el header y el contenido, para filtrar folletos por tienda.

### ~~B4. Settings — langBtnActive sin estilo visual diferente~~ ✅
**Archivo:** `app/(tabs)/settings.tsx` línea 266
**Problema:** `langBtnActive` tiene `borderColor: Colors.border, backgroundColor: Colors.surface` — exactamente igual que el estado inactivo. El botón activo solo se distingue por el badge de checkmark, sin cambio de fondo.
**Qué hacer:** Cambiar `langBtnActive` a `{ borderColor: Colors.primary, backgroundColor: Colors.primaryLight }`.

### ~~B5. Favorites — sin i18n~~ ✅
**Archivo:** `app/favorites.tsx`
**Problema:** Todo el texto está hardcodeado en alemán: "Noch keine Favoriten", "Tippe auf das Herz bei einem Angebot", "Angebote gespeichert". No usa `t()`.
**Qué hacer:** Añadir claves en `locales/de.json` (y fr/it/en) y reemplazar los strings con `t('favorites.*')`.

### ~~B6. Home — marginTop: 40 en compact mode~~ ✅
**Archivo:** `app/(tabs)/index.tsx` línea 192
**Problema:** `cardLayout === 'compact'` aplica `marginTop: 40` a cada card, creando un espacio extraño.
**Qué hacer:** Eliminar `cardLayout === 'compact' && { marginTop: 40 }`. El modo compact ya está manejado por `OfferCard` internamente vía prop `compact`.

### ~~B7. Offer Detail — watchProduct usa nombre sin traducir~~ ✅
**Archivo:** `app/offer/[id].tsx` línea 189 y `components/OfferCard.tsx` línea 30
**Problema:** `watchTerm` se forma con `offer.nombre` (siempre alemán del backend). Si el usuario tiene FR/IT, el término guardado no coincide con su idioma.
**Qué hacer:** Usar `getOfferName(offer, language).trim().toLowerCase()` para `watchTerm` en ambos archivos, en lugar de `offer.nombre`.
