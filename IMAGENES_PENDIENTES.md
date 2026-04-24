# Imágenes de productos — Guía completa

---

## CÓMO AÑADIR NUEVAS IMÁGENES (proceso completo)

### PASO 1 — Generar el sprite en ChatGPT
- Pide una imagen con este prompt (ver sección "PROMPT BASE"):
  - Grid 5 columnas × 4 filas = 20 productos por imagen
  - Fondo blanco, sin texto, sin logos
- Guarda el archivo en el Escritorio como `tandaX.png` (X = número de tanda)

### PASO 2 — Recortar el sprite en 20 PNGs individuales
Ejecuta este comando en terminal:
```bash
/tmp/imgenv/bin/python3 /Users/roberto/offerto/scripts/crop_products.py
```
- Las imágenes se guardan en `assets/images/products/`
- El script está en `scripts/crop_products.py` — añade la nueva tanda al array `IMAGES` con la ruta y los nombres

### PASO 3 — Copiar las imágenes a dos sitios
```
assets/images/products/         → app móvil Expo
offerto-admin/public/products/  → panel de administración
```

### PASO 4 — Subir al servidor
- Sube las PNGs nuevas a `oferto/assets/images/products/` vía FTP

### PASO 5 — Insertar en la base de datos (imagen_banco)
Abre en el browser:
```
https://web.lweb.ch/oferto/api/seed_imagenes.php
```
O ejecuta el SQL de `backend/api/admin/seed-imagen-banco.sql` en phpMyAdmin.

Para imágenes nuevas, añade las filas manualmente en phpMyAdmin:
```sql
INSERT INTO imagen_banco (slug, nombre, categoria, keywords, activa) VALUES
('chips', 'Chips', 'snacks', 'chips, crisps, kartoffelchips, snack', 1),
-- ... una fila por imagen nueva
```

### PASO 6 — Reasignar imágenes en el panel admin
- Abre `http://localhost:3000/dashboard`
- Haz clic en **"Asignar todas las imágenes"**
- Procesará todos los productos con OpenAI + fallback por categoría
- Coste: ~$0.001 por cada 30 productos

### RESUMEN RÁPIDO
```
ChatGPT → tanda.png en Escritorio
→ crop_products.py → assets/images/products/
→ copiar a offerto-admin/public/products/
→ subir al servidor vía FTP
→ INSERT en imagen_banco (phpMyAdmin)
→ "Asignar todas" en dashboard admin
```

---

## PROMPT BASE (mismo estilo que las anteriores)

```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
[lista de 20 productos]
```

---

## TANDA 3 — Bebidas (crítico para B2B restaurantes)

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. cola soft drink can
2. orange soft drink can
3. beer bottle
4. sparkling mineral water bottle
5. energy drink can
6. red wine bottle
7. white wine bottle
8. prosecco / champagne bottle
9. apple juice carton
10. tomato juice bottle
11. green tea box
12. espresso coffee beans bag
13. hot chocolate powder tin
14. lemonade bottle
15. sports drink bottle
16. coconut water carton
17. beer can (generic)
18. cider bottle
19. iced tea bottle
20. smoothie bottle
```

**Nombres de archivo (orden del grid):**
```python
NAMES_3 = [
    "cola",           # cola can
    "orangenlimonade",# orange soft drink
    "bier_flasche",   # beer bottle
    "mineralwasser",  # sparkling water
    "energydrink",    # energy drink
    "rotwein",        # red wine
    "weisswein",      # white wine
    "prosecco",       # prosecco/champagne
    "apfelsaft",      # apple juice
    "tomatensaft",    # tomato juice
    "gruener_tee",    # green tea
    "kaffee_bohnen",  # coffee beans
    "kakao",          # hot chocolate
    "limonade",       # lemonade
    "sportgetraenk",  # sports drink
    "kokoswasser",    # coconut water
    "bier_dose",      # beer can
    "cider",          # cider
    "eistee",         # iced tea
    "smoothie",       # smoothie
]
```

---

## TANDA 4 — Carnes extra + embutidos (lo más pedido en restaurantes)

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. entrecote beef steak
2. pork tenderloin fillet
3. crispy bacon strips
4. salami slices
5. cold cuts assortment (aufschnitt)
6. veal cutlet (Kalbfleisch)
7. duck breast
8. turkey breast
9. bratwurst sausages
10. chorizo sausage
11. prosciutto ham slices
12. beef burger patties
13. lamb rack (Lammkotelett)
14. chicken wings
15. pork ribs
16. beef liver
17. smoked sausage
18. merguez sausage
19. beef tongue
20. chicken drumsticks
```

**Nombres de archivo:**
```python
NAMES_4 = [
    "entrecote",       # entrecôte steak
    "schweinsfilet",   # pork tenderloin
    "speck",           # bacon
    "salami",          # salami
    "aufschnitt",      # cold cuts
    "kalbfleisch",     # veal
    "entenbrust",      # duck breast
    "truthahn",        # turkey
    "bratwurst",       # bratwurst
    "chorizo",         # chorizo
    "prosciutto",      # prosciutto
    "burger_patty",    # burger patty
    "lammkotelett",    # lamb rack
    "hahnchenfluegel", # chicken wings
    "spareribs",       # pork ribs
    "leber",           # liver
    "rauchwurst",      # smoked sausage
    "merguez",         # merguez
    "zunge",           # tongue
    "hahnchenschenkel",# drumsticks
]
```

---

## TANDA 5 — Verduras, frutas y despensa (cobertura completa)

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. potatoes (Kartoffeln)
2. onions
3. red bell pepper
4. carrot
5. garlic bulb
6. apple
7. banana
8. lemon
9. orange
10. grapes bunch
11. avocado
12. cooking oil bottle
13. rice bag
14. flour bag
15. canned tomatoes
16. pasta sauce jar
17. frozen french fries bag
18. ice cream tub
19. chocolate bar
20. bag of nuts / almonds
```

**Nombres de archivo:**
```python
NAMES_5 = [
    "kartoffel",       # potatoes
    "zwiebel",         # onions
    "paprika",         # bell pepper
    "karotte",         # carrot
    "knoblauch",       # garlic
    "apfel",           # apple
    "banane",          # banana
    "zitrone",         # lemon
    "orange",          # orange
    "weintrauben",     # grapes
    "avocado",         # avocado
    "speiseoel",       # cooking oil
    "reis",            # rice
    "mehl",            # flour
    "dosentomaten",    # canned tomatoes
    "tomatensauce",    # pasta sauce
    "pommes_frites",   # frozen fries
    "glacee",          # ice cream
    "schokolade",      # chocolate
    "nuesse",          # nuts
]
```

---

## CÓMO PROCESARLAS

Una vez tengas las 3 imágenes sprite del escritorio, actualiza el script:

```bash
# En scripts/crop_products.py, añade las 3 nuevas tandas:
("/Users/roberto/Desktop/imagen_tanda3.png", NAMES_3),
("/Users/roberto/Desktop/imagen_tanda4.png", NAMES_4),
("/Users/roberto/Desktop/imagen_tanda5.png", NAMES_5),
```

Y ejecuta:
```bash
/tmp/imgenv/bin/python3 /Users/roberto/offerto/scripts/crop_products.py
```

Las 60 imágenes nuevas se añaden solas a `assets/images/products/`.

---

## TANDA 6 — Limpieza, congelados y non-food (B2B restaurantes)

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. dish soap bottle (Spülmittel)
2. all-purpose cleaner spray bottle
3. disinfectant spray bottle
4. bleach / chlorine bottle
5. paper towels roll (Küchenrolle)
6. toilet paper pack
7. trash bags box
8. latex / nitrile gloves box
9. aluminum foil roll
10. plastic wrap / cling film roll
11. disposable food containers stack
12. baking paper roll
13. sponges / scrubbing pads pack
14. dishwasher tablets box
15. laundry detergent bottle
16. frozen french fries bag (large catering)
17. frozen pizza
18. frozen fish fillet bag
19. ice cream tub (large catering size)
20. frozen berries bag
```

**Nombres de archivo:**
```python
NAMES_6 = [
    "spuelmittel",        # dish soap
    "allzweckreiniger",   # all-purpose cleaner
    "desinfektionsmittel",# disinfectant
    "bleichmittel",       # bleach
    "kuechenrolle",       # paper towels
    "toilettenpapier",    # toilet paper
    "muellbeutel",        # trash bags
    "handschuhe",         # gloves
    "alufolie",           # aluminum foil
    "frischhaltefolie",   # cling film
    "einwegbehaelter",    # food containers
    "backpapier",         # baking paper
    "schwaemme",          # sponges
    "spuelmaschinentabs", # dishwasher tabs
    "waschmittel",        # laundry detergent
    "tiefkuehlpommes",    # frozen fries (catering)
    "tiefkuehlpizza",     # frozen pizza
    "tiefkuehlfisch",     # frozen fish
    "eiscreme_gross",     # ice cream catering
    "tiefkuehlbeeren",    # frozen berries
]
```

---

## TANDA 7 — Salsas, quesos varietales y conservas

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. ketchup bottle
2. mustard jar
3. mayonnaise jar
4. soy sauce bottle
5. olive oil bottle
6. balsamic vinegar bottle
7. hot sauce / chili sauce bottle
8. BBQ sauce bottle
9. parmesan cheese wedge
10. cream cheese tub
11. gruyère cheese block
12. brie / camembert cheese round
13. blue cheese (gorgonzola)
14. ricotta tub
15. tuna can
16. sardines can
17. anchovies jar
18. chickpeas can
19. tomato paste tube
20. coconut milk can
```

**Nombres de archivo:**
```python
NAMES_7 = [
    "ketchup",          # ketchup
    "senf",             # mustard
    "mayonnaise",       # mayonnaise
    "sojasosse",        # soy sauce
    "olivenoel",        # olive oil
    "balsamico",        # balsamic vinegar
    "chilisauce",       # hot sauce
    "bbqsauce",         # BBQ sauce
    "parmesan",         # parmesan
    "frischkaese",      # cream cheese
    "gruyere",          # gruyère
    "brie",             # brie/camembert
    "gorgonzola",       # blue cheese
    "ricotta",          # ricotta
    "thunfisch",        # tuna can
    "sardinen",         # sardines can
    "anchovis",         # anchovies
    "kichererbsen",     # chickpeas can
    "tomatenmark",      # tomato paste
    "kokosmilch",       # coconut milk can
]
```

---

## TANDA 8 — Especias, desayuno y repostería

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. salt shaker / salt box
2. black pepper grinder
3. mixed herbs jar / spice jar
4. curry powder tin
5. paprika powder tin
6. cinnamon stick / ground cinnamon
7. jam / fruit preserve jar
8. honey jar
9. breakfast cereal box
10. granola bag
11. croissant
12. muesli bag
13. maple syrup bottle
14. peanut butter jar
15. lentils bag / lentils pack
16. white beans can
17. chocolate mousse cup / dessert cup
18. tiramisu tray
19. whipped cream can (spray)
20. vanilla extract / vanilla pods
```

**Nombres de archivo:**
```python
NAMES_8 = [
    "salz",             # salt
    "pfeffer",          # pepper
    "kraeutermischung", # mixed herbs
    "curry",            # curry powder
    "paprikapulver",    # paprika powder
    "zimt",             # cinnamon
    "konfituere",       # jam
    "honig",            # honey
    "cornflakes",       # cereal
    "granola",          # granola
    "croissant",        # croissant
    "muesli",           # muesli
    "ahornsirup",       # maple syrup
    "erdnussbutter",    # peanut butter
    "linsen",           # lentils
    "weisse_bohnen",    # white beans
    "schokomousse",     # chocolate mousse
    "tiramisu",         # tiramisu
    "schlagsahne",      # whipped cream
    "vanille",          # vanilla
]
```

---

## TANDA 9 — Snacks, dips y bebidas calientes

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. potato chips bag
2. crispbread / knäckebrot pack
3. cookies / biscuits tin
4. waffle pack
5. pretzel bag
6. muesli bar / cereal bar
7. dried fruits mix bag
8. almonds bag
9. cashews bag
10. hummus dip cup
11. guacamole dip cup
12. tzatziki cup
13. coffee capsules / pods box
14. tea bags box
15. fruit juice carton (orange or mixed)
16. rice cakes bag
17. popcorn bag
18. breadsticks / grissini pack
19. vegetable juice bottle
20. carrot juice bottle
```

**Nombres de archivo:**
```python
NAMES_9 = [
    "chips",            # potato chips
    "knaeckebrot",      # crispbread
    "kekse",            # cookies/biscuits
    "waffel",           # waffles
    "brezel",           # pretzel
    "muesliriegel",     # muesli bar
    "trockenfrüchte",   # dried fruits
    "mandeln",          # almonds
    "cashews",          # cashews
    "hummus",           # hummus
    "guacamole",        # guacamole
    "tzatziki",         # tzatziki
    "kaffeekapsel",     # coffee pods
    "teebeutel",        # tea bags
    "fruchtsaft",       # fruit juice carton
    "reiswaffeln",      # rice cakes
    "popcorn",          # popcorn
    "salzstangen",      # breadsticks
    "gemüsesaft",       # vegetable juice
    "karottensaft",     # carrot juice
]
```

---

## TANDA 10 — Pescado fresco, carnes especiales y productos suizos

**Prompt para ChatGPT:**
```
Create a 5x4 grid of 20 realistic supermarket product photos on white background.
Clean packaging style, soft shadow, high resolution, no text, no logos, no branding.
Products in order (left to right, top to bottom):
1. fresh salmon fillet on tray
2. cod fillet / Kabeljau
3. fresh trout
4. scampi / langoustines pack
5. pork chop / Schweinskotelette
6. turkey fillet / Putenfilet
7. chicken breast fillet
8. leg of lamb / Lammkeule
9. rabbit / Kaninchen
10. venison / Hirschfleisch
11. air-dried beef slices / Bündnerfleisch
12. rösti (potato rösti patty)
13. raclette cheese pack
14. Appenzeller cheese block
15. Emmental cheese block
16. liver sausage / Leberwurst
17. beef goulash pack / Rindsgulasch
18. ossobuco veal shank
19. breaded schnitzel
20. salty pastry / Salzgebäck assortment
```

**Nombres de archivo:**
```python
NAMES_10 = [
    "lachsfilet",           # salmon fillet
    "kabeljau",             # cod
    "forelle",              # trout
    "scampi",               # scampi
    "schweinskotelett",     # pork chop
    "putenfilet",           # turkey fillet
    "haehnchenbrustfilet",  # chicken breast
    "lammkeule",            # leg of lamb
    "kaninchen",            # rabbit
    "hirschfleisch",        # venison
    "buendnerfleisch",      # air-dried beef
    "roesti",               # rösti
    "raclette",             # raclette
    "appenzeller",          # appenzeller cheese
    "emmentaler",           # emmental
    "leberwurst",           # liver sausage
    "rindsgulasch",         # beef goulash
    "ossobuco",             # ossobuco
    "schnitzel",            # schnitzel
    "salzgebaeck",          # salty pastry
]
```

---

## TOTAL FINAL

| Tanda | Imágenes | Categoría |
|-------|----------|-----------|
| 1 + 2 (✅ hechas) | 40 | Básicos |
| 3 (✅ hecha) | 20 | Bebidas |
| 4 (✅ hecha) | 20 | Carnes extra |
| 5 (✅ hecha) | 20 | Verduras, frutas, despensa |
| 6 (✅ hecha) | 20 | Limpieza + congelados |
| 7 (✅ hecha) | 20 | Salsas + quesos + conservas |
| 8 (✅ hecha) | 20 | Especias + desayuno + repostería |
| 9 (pendiente) | 20 | Snacks + dips + bebidas calientes |
| 10 (pendiente) | 20 | Pescado fresco + carnes especiales + suizos |
| **Total** | **200** | **Cobertura completa** |
