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

IMAGES = [
    ("/Users/roberto/Desktop/fd9829f3-9c50-4a96-9253-ccc88a236eed.png", NAMES_1),
    ("/Users/roberto/Desktop/b5fd0215-397e-4284-bfb2-7142b34c15b7.png", NAMES_2),
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
