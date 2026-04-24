"""
Recorta las 2 imágenes sprite de productos en 40 PNGs individuales.
Uso: python scripts/crop_products.py
(las rutas de las imágenes están definidas abajo en IMAGES)
"""

import os
from PIL import Image

# ── Imagen 1 (20 productos) ──────────────────────────────────────────────────
NAMES_1 = [
    "rindfleisch",       # ternera
    "huhn",              # pollo filete
    "lachs",             # salmón
    "eier",              # huevos
    "milch",             # leche
    "hackfleisch",       # carne picada
    "fisch",             # pescado entero
    "garnelen",          # gambas
    "kaese",             # queso
    "joghurt",           # yogur vaso
    "butter",            # mantequilla
    "salat",             # lechuga
    "tomate",            # tomates
    "broccoli",          # brócoli
    "wasser",            # agua
    "brot",              # pan de molde
    "tiefkuehlgemuese",  # verduras congeladas
    "lasagne",           # plato preparado
    "quark",             # yogur bote
    "saft",              # zumo naranja
]

# ── Imagen 2 (20 productos) ──────────────────────────────────────────────────
NAMES_2 = [
    "lamm",              # cordero
    "mozzarella",        # mozzarella
    "beeren",            # arándanos
    "schinken",          # jamón cocido
    "oliven",            # aceitunas
    "ganzes_huhn",       # pollo entero
    "tofu",              # tofu
    "blattsalat",        # ensalada mixta
    "spargel",           # espárragos
    "mandarinen",        # mandarinas
    "pasta",             # pasta
    "erdbeeren",         # fresas
    "pilze",             # champiñones
    "raeucherlachs",     # salmón ahumado
    "essiggurken",       # pepinillos
    "wein",              # vino
    "kaffee",            # café
    "datteln",           # dátiles / frutos secos
    "suppe",             # sopa / crema
    "bauernbrot",        # pan rústico
]

# ── Imagen 3 — Bebidas (20 productos) ───────────────────────────────────────
NAMES_3 = [
    "cola",            # cola can
    "orangenlimonade", # orange soft drink
    "bier_flasche",    # beer bottle
    "mineralwasser",   # sparkling water
    "energydrink",     # energy drink
    "rotwein",         # red wine
    "weisswein",       # white wine
    "prosecco",        # prosecco/champagne
    "apfelsaft",       # apple juice
    "tomatensaft",     # tomato juice
    "gruener_tee",     # green tea
    "kaffee_bohnen",   # coffee beans
    "kakao",           # hot chocolate
    "limonade",        # lemonade
    "sportgetraenk",   # sports drink
    "kokoswasser",     # coconut water
    "bier_dose",       # beer can
    "cider",           # cider
    "eistee",          # iced tea
    "smoothie",        # smoothie
]

# ── Imagen 4 — Carnes extra + embutidos (20 productos) ──────────────────────
NAMES_4 = [
    "entrecote",        # entrecôte steak
    "schweinsfilet",    # pork tenderloin
    "speck",            # bacon
    "salami",           # salami
    "aufschnitt",       # cold cuts
    "kalbfleisch",      # veal
    "entenbrust",       # duck breast
    "truthahn",         # turkey
    "bratwurst",        # bratwurst
    "chorizo",          # chorizo
    "prosciutto",       # prosciutto
    "burger_patty",     # burger patty
    "lammkotelett",     # lamb rack
    "hahnchenfluegel",  # chicken wings
    "spareribs",        # pork ribs
    "leber",            # liver
    "rauchwurst",       # smoked sausage
    "merguez",          # merguez
    "zunge",            # tongue
    "hahnchenschenkel", # drumsticks
]

# ── Imagen 5 — Verduras, frutas y despensa (20 productos) ───────────────────
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

# ── Imagen 6 — Limpieza + congelados (20 productos) ─────────────────────────
NAMES_6 = [
    "spuelmittel",         # dish soap
    "allzweckreiniger",    # all-purpose cleaner
    "desinfektionsmittel", # disinfectant
    "bleichmittel",        # bleach
    "kuechenrolle",        # paper towels
    "toilettenpapier",     # toilet paper
    "muellbeutel",         # trash bags
    "handschuhe",          # gloves
    "alufolie",            # aluminum foil
    "frischhaltefolie",    # cling film
    "einwegbehaelter",     # food containers
    "backpapier",          # baking paper
    "schwaemme",           # sponges
    "spuelmaschinentabs",  # dishwasher tabs
    "waschmittel",         # laundry detergent
    "tiefkuehlpommes",     # frozen fries catering
    "tiefkuehlpizza",      # frozen pizza
    "tiefkuehlfisch",      # frozen fish
    "eiscreme_gross",      # ice cream catering
    "tiefkuehlbeeren",     # frozen berries
]

# ── Imagen 7 — Salsas, quesos, conservas (20 productos) ─────────────────────
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

# ── Imagen 8 — Especias, desayuno, repostería (20 productos) ─────────────────
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

NAMES_9 = [
    "chips",            # potato chips
    "knaeckebrot",      # crispbread
    "kekse",            # cookies/biscuits
    "waffel",           # waffles
    "brezel",           # pretzel
    "muesliriegel",     # muesli bar
    "trockenfruechte",  # dried fruits
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
    "gemuesesaft",      # vegetable juice
    "karottensaft",     # carrot juice
]

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

IMAGES = [
    ("/Users/roberto/Desktop/fd9829f3-9c50-4a96-9253-ccc88a236eed.png", NAMES_1),
    ("/Users/roberto/Desktop/b5fd0215-397e-4284-bfb2-7142b34c15b7.png", NAMES_2),
    ("/Users/roberto/Desktop/tanda3.png", NAMES_3),
    ("/Users/roberto/Desktop/tahda4.png", NAMES_4),
    ("/Users/roberto/Desktop/tanda5.png", NAMES_5),
    ("/Users/roberto/Desktop/tanda6.png", NAMES_6),
    ("/Users/roberto/Desktop/tanda7.png", NAMES_7),
    ("/Users/roberto/Desktop/tanda8.png", NAMES_8),
    ("/Users/roberto/Desktop/tanda9.png",  NAMES_9),
    ("/Users/roberto/Desktop/tanda10.png", NAMES_10),
]

COLS = 5
ROWS = 4
OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets", "images", "products"))


def crop_sprite(src_path: str, names: list[str]):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    cell_w = w // COLS
    cell_h = h // ROWS
    margin = int(cell_w * 0.04)

    for idx, name in enumerate(names):
        row = idx // COLS
        col = idx % COLS
        x0 = col * cell_w + margin
        y0 = row * cell_h + margin
        x1 = x0 + cell_w - margin * 2
        y1 = y0 + cell_h - margin * 2
        tile = img.crop((x0, y0, x1, y1))
        out_path = os.path.join(OUT_DIR, f"{name}.png")
        tile.save(out_path, "PNG")
        print(f"  ✓  {name}.png")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    total = 0
    for src, names in IMAGES:
        print(f"\nProcesando: {os.path.basename(src)}")
        crop_sprite(src, names)
        total += len(names)
    print(f"\n✅  {total} imágenes guardadas en:\n   {OUT_DIR}")
