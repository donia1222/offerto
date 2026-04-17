# OFFERTO — Master Project Document
> Swiss Weekly Offers Aggregator App
> Version: 1.0 | Started: 2026-04-15 | Language default: Deutsch

---

## WHAT IS OFFERTO

A paid Swiss mobile app (4.99 CHF one-time) that aggregates weekly promotional offers
from all major Swiss supermarkets (Migros, Coop, Lidl, Aldi, Denner, Spar) in one
beautiful, fast, ultra-modern interface. No ads. No subscription. Pay once, save every week.

**Tagline DE:** Alle Angebote. Eine App.
**Tagline FR:** Toutes les offres. Une app.
**Tagline IT:** Tutte le offerte. Un'app.

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Mobile App | Expo SDK 52 + React Native + TypeScript — **Bare Workflow** |
| Native iOS | Xcode / Swift / Objective-C (carpeta `ios/`) |
| Native Android | Gradle / Kotlin (carpeta `android/`) |
| Navigation | Expo Router v4 (file-based) |
| State | Zustand 5 |
| HTTP Client | Axios |
| Translations | i18next + react-i18next |
| Local Storage | expo-sqlite (shopping list offline) |
| Notifications | expo-notifications |
| Build & Deploy | EAS Build (eas.json) |
| Backend | PHP 8.2 |
| Database | MySQL 8.0 |
| API Style | REST JSON |
| Fonts | Plus Jakarta Sans + Inter (via expo-font) |

### Por qué Bare Workflow (no Managed)

- Carpetas `ios/` y `android/` reales — control total del código nativo
- Permite añadir SDKs nativos (Stripe, analytics, mapas) sin restricciones
- Builds locales con Xcode y Android Studio cuando quieras
- EAS Build sigue funcionando exactamente igual
- `expo prebuild` regenera las carpetas nativas desde `app.json` si hace falta

---

## DESIGN SYSTEM

### Color Palette

```ts
// constants/colors.ts
export const Colors = {
  // Backgrounds
  background:     '#F5F3FF',   // Very light lavender — main bg
  surface:        '#FFFFFF',   // Cards, modals
  surfaceAlt:     '#EDE9FF',   // Subtle section bg

  // Brand
  primary:        '#7C6FCD',   // Soft violet — buttons, links
  primaryLight:   '#EDE9FF',   // Primary tint
  primaryDark:    '#5A4FA8',   // Primary pressed state

  // Accent (deals, savings)
  accent:         '#FF8C61',   // Warm peach — discount badges
  accentLight:    '#FFF0E9',   // Accent tint

  // Semantic
  success:        '#4CAF82',   // Green — big discounts > 30%
  successLight:   '#E8F8F1',
  warning:        '#FFB347',   // Orange — expiring today
  warningLight:   '#FFF5E0',
  error:          '#FF6B6B',   // Red — errors

  // Text
  textDark:       '#1C1B33',   // Headings, primary text
  textMedium:     '#6B6B8A',   // Secondary text, labels
  textLight:      '#A8A8C0',   // Placeholders, disabled
  textInverse:    '#FFFFFF',   // Text on dark bg

  // Borders & Dividers
  border:         '#EAE8F5',
  divider:        '#F0EEF8',

  // Store brand colors
  stores: {
    migros:   '#FF6600',
    coop:     '#E3000B',
    lidl:     '#0050AA',
    aldi:     '#00005F',
    denner:   '#CC0000',
    spar:     '#007A3D',
  }
}
```

### Typography

```ts
// constants/typography.ts
// Fonts: Plus Jakarta Sans (headings) + Inter (body)
// Load both in app/_layout.tsx with useFonts()

export const Typography = {
  // Display
  h1: { fontFamily: 'PlusJakartaSans-Bold',    fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: 'PlusJakartaSans-Bold',    fontSize: 22, lineHeight: 30 },
  h3: { fontFamily: 'PlusJakartaSans-SemiBold',fontSize: 18, lineHeight: 26 },
  h4: { fontFamily: 'PlusJakartaSans-SemiBold',fontSize: 15, lineHeight: 22 },

  // Body
  bodyL:  { fontFamily: 'Inter-Regular',  fontSize: 16, lineHeight: 24 },
  bodyM:  { fontFamily: 'Inter-Regular',  fontSize: 14, lineHeight: 21 },
  bodyS:  { fontFamily: 'Inter-Regular',  fontSize: 12, lineHeight: 18 },

  // Labels
  labelL: { fontFamily: 'Inter-Medium',   fontSize: 14, lineHeight: 20 },
  labelM: { fontFamily: 'Inter-Medium',   fontSize: 12, lineHeight: 16 },
  labelS: { fontFamily: 'Inter-Medium',   fontSize: 10, lineHeight: 14 },

  // Special
  price:    { fontFamily: 'PlusJakartaSans-Bold',    fontSize: 20, lineHeight: 26 },
  discount: { fontFamily: 'PlusJakartaSans-Bold',    fontSize: 13, lineHeight: 18 },
}
```

### Spacing & Radius

```ts
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48
}

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999
}
```

### Visual Style Rules

- Cards: white, shadow `elevation:2`, radius 16, padding 14
- Bottom tabs: white bg, primary icon when active, textLight when inactive
- Badges: rounded full, compact padding, bold text
- No heavy gradients — clean flat + subtle shadows only
- Images: always rounded 12, aspect ratio 1:1, white bg
- Discount badge: accent color (#FF8C61) top-right corner of card
- Big discount (>30%): success color (#4CAF82)
- Expired today: warning color (#FFB347) pulsing border

---

## PROJECT STRUCTURE

```
offerto/
├── CLAUDE.md                        ← THIS FILE
├── app.json                         ← Expo config
├── package.json
├── tsconfig.json
├── .env                             ← API_BASE_URL etc (never commit)
├── .env.example
│
├── app/                             ← Expo Router pages
│   ├── _layout.tsx                  ← Root layout (fonts, i18n, zustand)
│   ├── index.tsx                    ← Redirect to (tabs)
│   ├── (tabs)/
│   │   ├── _layout.tsx              ← Tab bar config
│   │   ├── index.tsx                ← Home (featured + expiring soon)
│   │   ├── search.tsx               ← Search + filters
│   │   ├── stores.tsx               ← Browse by store
│   │   ├── list.tsx                 ← My shopping list
│   │   └── settings.tsx             ← Language, canton, notifications
│   └── offer/
│       └── [id].tsx                 ← Offer detail page
│
├── components/
│   ├── ui/                          ← Reusable base components
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Chip.tsx
│   │   ├── Skeleton.tsx             ← Loading placeholder
│   │   ├── EmptyState.tsx
│   │   └── ScreenHeader.tsx
│   ├── OfferCard.tsx                ← Main offer card (used everywhere)
│   ├── OfferCardSmall.tsx           ← Compact version for lists
│   ├── StoreFilterBar.tsx           ← Horizontal store chips
│   ├── CategoryGrid.tsx             ← Category icon grid
│   ├── SearchBar.tsx
│   ├── Savingsbanner.tsx            ← "This week save up to X CHF"
│   └── ShoppingListItem.tsx
│
├── hooks/
│   ├── useOffers.ts                 ← Fetch + filter offers
│   ├── useStores.ts                 ← Fetch store list
│   ├── useSearch.ts                 ← Debounced search
│   ├── useShoppingList.ts           ← Add/remove/persist list
│   └── useNotifications.ts
│
├── store/                           ← Zustand global state
│   ├── offersStore.ts
│   ├── listStore.ts
│   └── settingsStore.ts
│
├── services/
│   ├── api.ts                       ← Axios instance with base URL + interceptors
│   ├── offersService.ts
│   ├── storesService.ts
│   └── notificationsService.ts
│
├── locales/
│   ├── de.json                      ← German (DEFAULT — complete)
│   ├── fr.json                      ← French
│   └── it.json                      ← Italian
│
├── constants/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── stores.ts                    ← Store names, logos, colors
│
├── types/
│   └── index.ts                     ← All TypeScript interfaces
│
├── utils/
│   ├── formatters.ts                ← Price, date, percentage formatters
│   └── categories.ts               ← Category icons + translations keys
│
└── assets/
    ├── fonts/                       ← Plus Jakarta Sans + Inter TTF files
    ├── images/
    │   ├── splash.png
    │   └── icon.png
    └── icons/                       ← Store logos (SVG/PNG)

ios/                                 ← Native iOS (generated by expo prebuild)
├── Offerto/
│   ├── AppDelegate.mm               ← iOS app entry point
│   ├── AppDelegate.h
│   ├── Info.plist                   ← Permissions, bundle ID, config
│   └── Images.xcassets/
│       ├── AppIcon.appiconset/      ← App icon all sizes
│       └── SplashScreen.imageset/
├── Offerto.xcodeproj/
│   └── project.pbxproj             ← Xcode project config
├── Offerto.xcworkspace/             ← Open THIS in Xcode (not .xcodeproj)
└── Podfile                          ← CocoaPods dependencies

android/                             ← Native Android (generated by expo prebuild)
├── app/
│   ├── src/main/
│   │   ├── java/ch/offerto/app/
│   │   │   ├── MainActivity.kt      ← Android entry point
│   │   │   └── MainApplication.kt
│   │   ├── res/
│   │   │   ├── drawable/            ← Splash screen assets
│   │   │   ├── mipmap-*/            ← App icon all densities
│   │   │   └── values/
│   │   │       ├── strings.xml      ← App name etc
│   │   │       └── styles.xml
│   │   └── AndroidManifest.xml     ← Permissions, config
│   └── build.gradle                 ← App-level Gradle config
├── build.gradle                     ← Project-level Gradle config
├── settings.gradle
└── gradle.properties

backend/
├── config/
│   ├── db.php                       ← MySQL connection (PDO)
│   └── constants.php                ← API keys, scraper URLs
├── api/
│   ├── ofertas.php                  ← GET /api/ofertas
│   ├── tiendas.php                  ← GET /api/tiendas
│   ├── buscar.php                   ← GET /api/buscar?q=
│   ├── destacadas.php               ← GET /api/destacadas
│   └── lista.php                    ← POST/GET /api/lista
├── scrapers/
│   ├── BaseScraper.php              ← Abstract base class
│   ├── MigrosScraper.php
│   ├── CoopScraper.php
│   ├── LidlScraper.php
│   ├── AldiScraper.php
│   └── DennerScraper.php
├── cron/
│   ├── scrape_weekly.php            ← Run every Monday 06:00
│   └── cleanup_expired.php         ← Run every day 00:00
└── sql/
    ├── schema.sql                   ← Full DB creation script
    └── seeds.sql                    ← Test data for dev
```

---

## DATABASE SCHEMA

```sql
-- sql/schema.sql

CREATE TABLE tiendas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(50) UNIQUE NOT NULL,   -- 'migros', 'coop', etc
  nombre        VARCHAR(100) NOT NULL,
  logo_url      VARCHAR(255),
  color_hex     VARCHAR(7),
  activa        TINYINT DEFAULT 1,
  orden         TINYINT DEFAULT 0
);

CREATE TABLE categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(100) UNIQUE NOT NULL,  -- 'fleisch', 'gemuese', etc
  icon          VARCHAR(50),                   -- emoji or icon name
  orden         TINYINT DEFAULT 0
);

CREATE TABLE ofertas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id         INT NOT NULL,
  categoria_id      INT,
  nombre_de         VARCHAR(255) NOT NULL,     -- German name (always present)
  nombre_fr         VARCHAR(255),              -- French name (optional)
  nombre_it         VARCHAR(255),              -- Italian name (optional)
  precio_original   DECIMAL(8,2),
  precio_oferta     DECIMAL(8,2) NOT NULL,
  descuento_pct     TINYINT DEFAULT 0,
  unidad            VARCHAR(50),               -- '100g', '1 Stk', '1L'
  imagen_url        VARCHAR(500),
  imagen_local      VARCHAR(500),              -- cached on our server
  valido_desde      DATE NOT NULL,
  valido_hasta      DATE NOT NULL,
  canton            VARCHAR(10) DEFAULT 'all', -- 'all', 'ZH', 'BE', etc
  fuente_url        VARCHAR(500),              -- original source
  activa            TINYINT DEFAULT 1,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tienda_id)    REFERENCES tiendas(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_valido    (valido_hasta, activa),
  INDEX idx_tienda    (tienda_id, valido_hasta),
  INDEX idx_categoria (categoria_id, valido_hasta),
  INDEX idx_descuento (descuento_pct DESC),
  FULLTEXT idx_search (nombre_de, nombre_fr, nombre_it)
);

CREATE TABLE listas_compra (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_token    VARCHAR(64) NOT NULL,
  oferta_id     INT NOT NULL,
  cantidad      TINYINT DEFAULT 1,
  comprado      TINYINT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_token)
);
```

---

## API ENDPOINTS

### Base URL
```
Production:  https://api.offerto.ch/v1
Development: http://localhost/offerto/backend/api
```

### All Endpoints

```
GET  /ofertas
     ?tienda=migros,coop
     ?categoria=fleisch
     ?min_descuento=20
     ?canton=ZH
     ?pagina=1&limite=30
     ?orden=descuento|fecha|precio

GET  /destacadas
     → Top 20 best discounts this week

GET  /tiendas
     → All active stores with logo + color

GET  /categorias
     → All categories with icon

GET  /buscar?q={term}&lang=de
     → Full-text search, grouped by store

POST /lista
     Body: { user_token, oferta_id, cantidad }

GET  /lista/{user_token}
     → Shopping list with full offer data

DELETE /lista/{user_token}/{oferta_id}
```

### Standard JSON Response

```json
{
  "status": "ok",
  "total": 142,
  "pagina": 1,
  "limite": 30,
  "datos": [
    {
      "id": 881,
      "tienda": { "slug": "migros", "nombre": "Migros", "color": "#FF6600" },
      "categoria": { "slug": "fleisch", "icon": "🥩" },
      "nombre": "Schweizer Rindsfilet",
      "precio_original": 42.90,
      "precio_oferta": 29.90,
      "descuento": 30,
      "unidad": "pro 100g",
      "imagen": "https://api.offerto.ch/images/881.jpg",
      "valido_desde": "2026-04-14",
      "valido_hasta": "2026-04-19",
      "dias_restantes": 4
    }
  ]
}
```

---

## TRANSLATIONS SYSTEM

### Setup
Use `i18next` + `react-i18next`. Language detection from device locale.
Fallback: always `de` (German).

### File structure
```json
// locales/de.json  (ALWAYS complete — reference file)
{
  "common": {
    "loading": "Lädt...",
    "error": "Fehler aufgetreten",
    "retry": "Erneut versuchen",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "search": "Suchen",
    "all": "Alle",
    "noResults": "Keine Angebote gefunden"
  },
  "tabs": {
    "home": "Angebote",
    "search": "Suchen",
    "stores": "Läden",
    "list": "Einkauf",
    "settings": "Einstellungen"
  },
  "home": {
    "title": "Diese Woche",
    "featured": "Top-Angebote",
    "expiringSoon": "Läuft bald ab",
    "validUntil": "Gültig bis {{date}}",
    "expiresIn": "Noch {{days}} Tage",
    "expiresToday": "Heute letzter Tag!"
  },
  "offer": {
    "originalPrice": "Normalpreis",
    "discount": "-{{pct}}%",
    "addToList": "Zur Liste",
    "removeFromList": "Entfernen",
    "unit": "pro {{unit}}",
    "store": "Bei {{store}}"
  },
  "search": {
    "placeholder": "Produkt suchen...",
    "filters": "Filter",
    "minDiscount": "Mind. Rabatt",
    "category": "Kategorie",
    "foundIn": "In {{count}} Läden gefunden",
    "bestPrice": "Bester Preis"
  },
  "list": {
    "title": "Meine Einkaufsliste",
    "empty": "Liste ist leer",
    "emptyHint": "Tippe auf ein Angebot und füge es hinzu",
    "totalSaving": "Ersparnis: CHF {{amount}}",
    "totalCost": "Gesamt: CHF {{amount}}",
    "clearAll": "Liste leeren",
    "share": "Liste teilen"
  },
  "settings": {
    "title": "Einstellungen",
    "language": "Sprache",
    "canton": "Kanton",
    "notifications": "Benachrichtigungen",
    "notifyNewOffers": "Neue Angebote (Montags)",
    "notifyExpiring": "Ablaufende Angebote"
  },
  "stores": {
    "title": "Nach Laden",
    "offers": "{{count}} Angebote"
  },
  "categories": {
    "fleisch": "Fleisch",
    "gemuese": "Gemüse & Früchte",
    "milch": "Milch & Käse",
    "bakery": "Brot & Backwaren",
    "getraenke": "Getränke",
    "snacks": "Snacks",
    "haushalt": "Haushalt",
    "hygiene": "Körperpflege",
    "tierfutter": "Tierfutter",
    "other": "Sonstiges"
  }
}
```

For `fr.json` and `it.json` — same keys, translated values.
Missing keys automatically fall back to `de.json`.

---

## TYPES

```ts
// types/index.ts

export interface Store {
  id: number
  slug: string
  nombre: string
  logoUrl: string
  color: string
}

export interface Category {
  id: number
  slug: string
  icon: string
}

export interface Offer {
  id: number
  store: Store
  category?: Category
  name: string
  priceOriginal?: number
  priceOffer: number
  discount: number
  unit?: string
  imageUrl: string
  validFrom: string
  validUntil: string
  daysLeft: number
  canton: string
}

export interface ShoppingListItem {
  offerId: number
  offer: Offer
  quantity: number
  checked: boolean
}

export interface ApiResponse<T> {
  status: 'ok' | 'error'
  total?: number
  pagina?: number
  datos: T
  message?: string
}

export interface FilterState {
  stores: string[]
  categories: string[]
  minDiscount: number
  canton: string
  sortBy: 'discount' | 'date' | 'price'
}
```

---

## DEPENDENCIES TO INSTALL

### Expo App (Bare Workflow)
```bash
# 1. Create project with bare workflow
npx create-expo-app@latest offerto --template bare-minimum
cd offerto

# 2. Navigation
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar

# 3. Fonts
npx expo install expo-font @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter

# 4. State + HTTP
npm install zustand axios

# 5. Translations
npm install i18next react-i18next

# 6. Storage + Notifications
npx expo install expo-sqlite expo-notifications expo-device

# 7. Utils
npm install date-fns

# 8. Generate native folders (iOS + Android)
npx expo prebuild
# → This creates ios/ and android/ from app.json
# → Run ONCE. After this, edit native files directly if needed.

# 9. iOS: install CocoaPods (macOS only)
cd ios && pod install && cd ..

# 10. Run on device/simulator
npx expo run:ios
npx expo run:android
```

### EAS Build (for App Store / Play Store)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (creates/updates eas.json)
eas build:configure

# Build for both stores
eas build --platform ios      # → .ipa for App Store
eas build --platform android  # → .aab for Play Store
```

### eas.json (already created)
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "info@hundezonen.ch" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

### Backend (PHP - no composer needed, pure PHP 8.2)
- PDO MySQL (built-in)
- DOMDocument (built-in)
- cURL (built-in)
- json_encode/decode (built-in)

---

## IMPLEMENTATION PLAN — DAY BY DAY

Mark each step as done by changing `[ ]` to `[x]`.

---

### DAY 1 — Database + Backend Foundation
- [ ] Create MySQL database `offerto_db`
- [ ] Run `backend/sql/schema.sql`
- [ ] Run `backend/sql/seeds.sql` (test data)
- [ ] Create `backend/config/db.php` (PDO connection)
- [ ] Create `backend/config/constants.php`
- [ ] Create `backend/api/tiendas.php` endpoint
- [ ] Create `backend/api/ofertas.php` endpoint (basic, no filters yet)
- [ ] Test both endpoints with Postman/browser
- **Goal:** GET /tiendas and GET /ofertas return valid JSON

---

### DAY 2 — Scrapers: Migros + Coop
- [ ] Create `backend/scrapers/BaseScraper.php`
- [ ] Create `backend/scrapers/MigrosScraper.php`
  - URL: `https://weekly.migros.ch/api/flyer?lang=de`
  - Parse JSON, map to DB fields, upsert
- [ ] Create `backend/scrapers/CoopScraper.php`
  - URL: `https://www.coop.ch/api/cms/coop/v1/promotions`
  - Parse JSON, map to DB fields, upsert
- [ ] Test scrapers manually: `php backend/scrapers/MigrosScraper.php`
- [ ] Verify data in MySQL
- **Goal:** Real offers in database from 2 major stores

---

### DAY 3 — Scrapers: Lidl + Aldi + Denner
- [ ] Create `backend/scrapers/LidlScraper.php` (via Flipp API)
- [ ] Create `backend/scrapers/AldiScraper.php` (scraping)
- [ ] Create `backend/scrapers/DennerScraper.php` (scraping)
- [ ] Create `backend/cron/scrape_weekly.php` (runs all scrapers)
- [ ] Create `backend/cron/cleanup_expired.php`
- [ ] Set up cron: `0 6 * * 1 php /path/scrape_weekly.php`
- [ ] Set up cron: `0 0 * * * php /path/cleanup_expired.php`
- **Goal:** All 5 stores scraping automatically

---

### DAY 4 — API Endpoints: Full + Search
- [ ] Add filters to `backend/api/ofertas.php` (tienda, categoria, minDescuento, canton, pagina)
- [ ] Create `backend/api/buscar.php` (FULLTEXT search)
- [ ] Create `backend/api/destacadas.php` (top discounts)
- [ ] Create `backend/api/lista.php` (GET + POST + DELETE)
- [ ] Add CORS headers to all endpoints
- [ ] Test all with Postman
- **Goal:** Complete, filter-ready API

---

### DAY 5 — Expo Project Setup (Bare Workflow)
- [ ] Create Expo project: `npx create-expo-app@latest offerto --template bare-minimum`
- [ ] Install all dependencies (see DEPENDENCIES section above)
- [ ] Configure `app.json`:
  - name: "Offerto"
  - slug: "offerto"
  - bundleIdentifier (iOS): "ch.offerto.app"
  - package (Android): "ch.offerto.app"
  - icon + splash configured
- [ ] Run `npx expo prebuild` → genera carpetas `ios/` y `android/`
- [ ] Run `cd ios && pod install` (macOS)
- [ ] Verify app boots: `npx expo run:ios`
- [ ] Set up `app/_layout.tsx` (fonts, i18n, navigation)
- [ ] Create `constants/colors.ts`
- [ ] Create `constants/typography.ts`
- [ ] Create `constants/spacing.ts`
- [ ] Create `types/index.ts`
- [ ] Create `services/api.ts` (Axios instance)
- [ ] Create `.env` con API_BASE_URL
- [ ] Set up `locales/de.json` (complete)
- [ ] Set up `locales/fr.json` + `locales/it.json` (placeholder values)
- [ ] Configure i18next in `app/_layout.tsx`
- [ ] Configure `eas.json` for EAS Build
- **Goal:** App boots on iOS simulator + Android emulator, fonts load, i18n works, native folders present

---

### DAY 6 — Core UI Components
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/Badge.tsx`
- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/Chip.tsx`
- [ ] `components/ui/Skeleton.tsx`
- [ ] `components/ui/EmptyState.tsx`
- [ ] `components/OfferCard.tsx` (main card with image, price, discount badge, store logo)
- [ ] `components/StoreFilterBar.tsx` (horizontal scrollable chips)
- **Goal:** All base components built and visually correct

---

### DAY 7 — Home Screen
- [ ] `services/offersService.ts` (getFeatured, getOffers, getExpiringSoon)
- [ ] `store/offersStore.ts` (Zustand)
- [ ] `hooks/useOffers.ts`
- [ ] `app/(tabs)/index.tsx` — Home screen:
  - Savings banner at top
  - "Top-Angebote" horizontal scroll (featured)
  - "Läuft bald ab" section (expiring in 2 days)
  - Store filter bar
  - Vertical list of all offers
- **Goal:** Home screen fully functional with real data

---

### DAY 8 — Search Screen
- [ ] `hooks/useSearch.ts` (debounced, 300ms)
- [ ] `components/SearchBar.tsx`
- [ ] `app/(tabs)/search.tsx`:
  - Search input
  - Filter chips: categories + min discount slider
  - Results list grouped by store
  - "Best price" highlight when same product in multiple stores
- **Goal:** Search + filters working end to end

---

### DAY 9 — Stores Screen + Offer Detail
- [ ] `services/storesService.ts`
- [ ] `app/(tabs)/stores.tsx`:
  - Grid of store cards with logo + offer count
  - Tap → filtered offer list for that store
- [ ] `app/offer/[id].tsx`:
  - Large product image
  - Full price comparison if available
  - Add to shopping list button
  - Share button
  - Store info + valid dates
- **Goal:** All browsing flows complete

---

### DAY 10 — Shopping List
- [ ] `store/listStore.ts` (Zustand + persist to expo-sqlite)
- [ ] `hooks/useShoppingList.ts`
- [ ] `components/ShoppingListItem.tsx`
- [ ] `app/(tabs)/list.tsx`:
  - Grouped by store
  - Checkboxes
  - Total savings calculation
  - Share list (WhatsApp/SMS format)
  - Clear all
- **Goal:** Shopping list works offline, persists between sessions

---

### DAY 11 — Settings + Notifications
- [ ] `store/settingsStore.ts` (canton, language, notification prefs)
- [ ] `app/(tabs)/settings.tsx`
- [ ] `services/notificationsService.ts`
- [ ] Push notification: Monday 06:00 "Neue Angebote diese Woche"
- [ ] Push notification: Sunday evening for items expiring tomorrow
- **Goal:** Settings save, notifications schedule correctly

---

### DAY 12 — Polish + Testing
- [ ] Test on iOS simulator + Android emulator
- [ ] Test all API error states (offline, 500 error)
- [ ] Add Skeleton loaders to all screens
- [ ] Add empty states to all screens
- [ ] Check all translations (DE complete, FR/IT acceptable)
- [ ] Check all colors + spacing on both platforms
- [ ] Test shopping list offline behavior
- [ ] Performance: FlatList with keyExtractor + getItemLayout
- **Goal:** App is smooth, handles all edge cases, feels premium

---

### DAY 13 — App Store Preparation
- [ ] Create app icon (1024x1024) — clean "O" logo, primary violet on white
- [ ] Create splash screen
- [ ] Write App Store description in DE/FR/IT
- [ ] Take screenshots on iPhone 15 Pro + iPad
- [ ] Configure `eas.json` for EAS Build
- [ ] Run `eas build --platform ios`
- [ ] Run `eas build --platform android`
- **Goal:** Builds ready for store submission

---

### DAY 14 — Launch
- [ ] Submit to App Store (4.99 CHF)
- [ ] Submit to Google Play (4.49 CHF)
- [ ] Set up server monitoring (cron job health check)
- [ ] Verify scrapers ran on Monday
- [ ] Post in Swiss Facebook groups / Reddit r/Switzerland
- **Goal:** LIVE

---

## CONVENTIONS & RULES

1. **German first** — all new text goes in `de.json` first, then translated
2. **TypeScript strict** — no `any` types, ever
3. **No inline styles** — always use StyleSheet.create() or constants
4. **API calls only in services/** — never fetch directly in components
5. **Zustand for global state** — local useState only for UI-only state (modal open/close etc)
6. **Images always from our server** — never hotlink store images directly (they expire)
7. **Cron jobs must log** — write to `/backend/logs/scraper_YYYY-MM-DD.log`
8. **PHP endpoints**: always set Content-Type: application/json, always return `status: ok|error`
9. **Offer cards**: always show `daysLeft` if <= 3 days (urgency trigger)
10. **No hardcoded strings** in components — always through i18n `t()` function
11. **Never manually edit** `ios/` or `android/` folders for config changes — always edit `app.json` and re-run `expo prebuild --clean`
12. **Permissions** (camera, notifications, location) go in `app.json` under `plugins`, not manually in `Info.plist` or `AndroidManifest.xml`
13. **Native modules** that need custom code go in `ios/Offerto/` and `android/app/src/main/java/ch/offerto/app/` — document every native change in this file

---

## ENVIRONMENT VARIABLES

```bash
# .env (never commit this file)
API_BASE_URL=http://localhost/offerto/backend/api
EXPO_PUBLIC_API_BASE_URL=http://localhost/offerto/backend/api

# .env.production
EXPO_PUBLIC_API_BASE_URL=https://api.offerto.ch/v1
```

---

## PROGRESS TRACKER

| Phase | Status | Days |
|-------|--------|------|
| Database + Backend | Not started | 1–4 |
| Expo Setup + Design System | ✅ Done | 5–6 |
| Core Screens (Home, Search, Kataloge, Offer Detail) | ✅ Done | 7–9 |
| Shopping List | Not started | 10 |
| Settings + Notifications | Not started | 11 |
| Polish + Testing | Not started | 12 |
| Store Submission | Not started | 13–14 |

---

## FEATURE ROADMAP (priority order)

Features to implement step by step. Target audience: Swiss B2B buyers (restaurants, hotels, caterers) shopping at Aligro, TopCC, Transgourmet.

### 1. Einkaufsliste / Shopping List (app/(tabs)/list.tsx — currently stub)
- Add offers to list from OfferCard (long press or button on detail)
- Show quantity per item (stepper +/-)
- Mark as purchased (checkbox, strikethrough)
- Group by store
- Total cost + total savings calculation
- Share list via native Share (WhatsApp/iMessage format)
- Clear all / clear purchased
- Persist with expo-sqlite (offline-first)
- Store: `store/listStore.ts` with Zustand + SQLite

### 2. Einstellungen / Settings (app/(tabs)/settings.tsx — currently stub)

#### Sprache
- DE / FR / IT / EN (add English for expats)
- Tap to change → i18n language switch instantly
- Persist in AsyncStorage / settingsStore

#### Lieblingsläden (Favorite stores)
- Toggle each store on/off
- Affects default filter on Home screen
- e.g. if user only shops at Aligro → show Aligro by default

#### Kanton
- Picker: Alle / ZH / BE / VD / GE / AG / BS / LU / SG / TI ...
- Filters regional offers automatically on all screens

#### MwSt / Mehrwertsteuer
- Toggle: show prices with or without VAT (7.7% standard / 2.5% food)
- Important for B2B buyers who reclaim VAT

#### Benachrichtigungen
- Master toggle (on/off)
- Monday 07:00: "Neue Prospeckte verfügbar" (new weekly catalogs)
- Expiring soon: notify 24h before favorites expire
- Per category: toggle notifications for Fleisch / Getränke / etc.
- Per store: toggle per store
- Uses expo-notifications + settingsStore

#### Erscheinungsbild
- Compact list mode (smaller OfferCard variant, 2-column grid option)
- Future: dark mode (requires Colors dark variant)

### 3. Preisvergleich / Price Comparison
- On offer detail page: "Dieses Produkt bei anderen Läden"
- Calls /buscar.php?q={product_name} and shows same product at other stores
- Side-by-side price comparison card
- Highlight cheapest option with green badge

### 4. Suchverlauf / Search History
- Last 10 searches stored in AsyncStorage
- Shown below SearchBar when input is empty
- Tap to repeat search
- Clear history button

### 5. Teilen / Sharing
- Share offer via WhatsApp/iMessage (already basic Share.share in detail)
- Add direct WhatsApp deep link: `whatsapp://send?text=...`
- Share shopping list as formatted text

### 6. Produkt-Benachrichtigungen (advanced)
- "Benachrichtige mich wenn X wieder im Angebot ist"
- Store product slugs + notify when they appear in new scrape
- Backend: endpoint `/api/watch` to register product keywords per user_token

### 7. iOS Widget (future)
- Home screen widget showing top deal of the day
- Requires expo-widgets (Expo SDK 53+) or native Swift widget

---

## CURRENT APP STATE (as of 2026-04-17)

### Screens implemented:
- **Angebote (Home)** — offer list, store filter banners (hide on scroll), featured horizontal scroll, infinite pagination
- **Entdecken (Search)** — category grid with real images, results view with store chips, animated title
- **Prospekte (Kataloge)** — 3 store catalogs as full-width image cards, WebView/PDF viewer modal
- **Offer Detail** — image, price, discount badge, dates, favorites toggle, share
- **Favorites** — saved offers via Zustand + AsyncStorage

### Screens stubbed (need implementation):
- `app/(tabs)/list.tsx` — shopping list (stub)
- `app/(tabs)/settings.tsx` — settings (stub)
- `app/(tabs)/stores.tsx` — hidden from tab bar (href: null)

### Tab bar:
- 3 tabs: Angebote (compass), Entdecken (grid), Prospekte (newspaper)
- Bottom-pinned, round icon circles, primary color when active

### Components:
- `SearchButton` — magnifying glass modal with debounced search, present in all headers
- `FavButton` — opens favorites screen
- `OfferCard` — main card with image, price, discount, store logo, days remaining
- `FavoritesStore` — Zustand store with AsyncStorage persist

---

## PROGRESS TRACKER
*Bundle ID: ch.offerto.app*
