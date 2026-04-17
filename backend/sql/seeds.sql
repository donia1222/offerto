-- Selecciona tu base de datos en phpMyAdmin antes de ejecutar esto.

INSERT INTO tiendas (slug, nombre, color_hex, activa, orden) VALUES
('aligro',       'Aligro',       '#E30613', 1, 1),
('topcc',        'TopCC',        '#003882', 1, 2),
('transgourmet', 'Transgourmet', '#E2001A', 1, 3);

INSERT INTO categorias (slug, icon, orden) VALUES
('fleisch',    '🥩', 1),
('gemuese',    '🥦', 2),
('milch',      '🧀', 3),
('bakery',     '🍞', 4),
('getraenke',  '🥤', 5),
('snacks',     '🍫', 6),
('haushalt',   '🧹', 7),
('hygiene',    '🧴', 8),
('tierfutter', '🐾', 9),
('other',      '🛒', 10);

INSERT INTO ofertas (tienda_id, categoria_id, nombre_de, precio_original, precio_oferta, descuento_pct, unidad, valido_desde, valido_hasta) VALUES
(1, 1, 'Schweizer Rindsfilet', 42.90, 29.90, 30, 'pro 100g', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(1, 3, 'Gruyère AOC', 5.90,  3.90, 34, '200g', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(2, 1, 'Kalbsschnitzel',      28.00, 19.90, 29, 'pro kg',   CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(2, 5, 'Coca-Cola 6x1.5L',   12.90,  8.90, 31, '6er Pack',  CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(3, 2, 'Erdbeeren Spanien',    4.90,  2.49, 49, '500g',      CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(4, 6, 'Lindt Schokolade',     3.50,  1.99, 43, '100g',      CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY)),
(5, 7, 'Persil Colorwaschmittel', 14.90, 9.90, 34, '2.5kg', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY));
