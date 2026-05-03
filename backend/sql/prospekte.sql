-- ============================================================
-- OFFERTO — Tabla Prospekte (catálogos PDF por tienda)
-- Ejecutar en phpMyAdmin sobre la DB offerto_db
-- ============================================================

CREATE TABLE IF NOT EXISTS prospekte (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id    INT           NOT NULL,
  titulo       VARCHAR(255)  NOT NULL,
  subtitulo    VARCHAR(500)  DEFAULT NULL,   -- región/ciudades (ej. "Zürich, Bern, Basel")
  pdf_url      VARCHAR(500)  DEFAULT NULL,   -- URL directa al PDF
  web_url      VARCHAR(500)  DEFAULT NULL,   -- URL flipbook/web viewer
  url_key      VARCHAR(200)  NOT NULL        COMMENT 'pdf_url o web_url — clave para upsert',
  valido_desde DATE          DEFAULT NULL,
  valido_hasta DATE          DEFAULT NULL,
  semana       VARCHAR(10)   DEFAULT NULL,   -- "KW19"
  tipo         VARCHAR(50)   DEFAULT 'aktionen',  -- aktionen|beilage|guide|kiosk|baeckerei|wochenhits
  activo       TINYINT(1)    DEFAULT 1,
  scraped_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  UNIQUE KEY  idx_unique   (tienda_id, url_key),
  INDEX       idx_active   (tienda_id, activo, valido_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
