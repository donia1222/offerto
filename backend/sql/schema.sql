-- ============================================================
-- OFFERTO — Database Schema
-- Database: offerto_db
-- ============================================================

-- NOTA: Crea la base de datos desde el panel de tu hosting (Hostpoint).
-- Luego selecciónala en phpMyAdmin y ejecuta este script.
-- NO ejecutar CREATE DATABASE aquí en hosting compartido.

CREATE TABLE IF NOT EXISTS tiendas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(50)  UNIQUE NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  logo_url   VARCHAR(255) DEFAULT NULL,
  color_hex  VARCHAR(7)   DEFAULT '#000000',
  activa     TINYINT(1)   DEFAULT 1,
  orden      TINYINT      DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  slug   VARCHAR(100) UNIQUE NOT NULL,
  icon   VARCHAR(10)  DEFAULT '🛒',
  orden  TINYINT      DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ofertas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id        INT           NOT NULL,
  categoria_id     INT           DEFAULT NULL,
  nombre_de        VARCHAR(255)  NOT NULL,
  nombre_fr        VARCHAR(255)  DEFAULT NULL,
  nombre_it        VARCHAR(255)  DEFAULT NULL,
  precio_original  DECIMAL(8,2)  DEFAULT NULL,
  precio_oferta    DECIMAL(8,2)  NOT NULL,
  descuento_pct    TINYINT       DEFAULT 0,
  unidad           VARCHAR(50)   DEFAULT NULL,
  imagen_url       VARCHAR(500)  DEFAULT NULL,
  valido_desde     DATE          NOT NULL,
  valido_hasta     DATE          NOT NULL,
  canton           VARCHAR(10)   DEFAULT 'all',
  fuente_url       VARCHAR(500)  DEFAULT NULL,
  activa           TINYINT(1)    DEFAULT 1,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id)    REFERENCES tiendas(id)    ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_valido     (valido_hasta, activa),
  INDEX idx_tienda     (tienda_id, valido_hasta),
  INDEX idx_categoria  (categoria_id, valido_hasta),
  INDEX idx_descuento  (descuento_pct),
  FULLTEXT idx_search  (nombre_de, nombre_fr, nombre_it),
  UNIQUE KEY idx_upsert (tienda_id, fuente_url(200))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS listas_compra (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_token  VARCHAR(64)  NOT NULL,
  oferta_id   INT          NOT NULL,
  cantidad    TINYINT      DEFAULT 1,
  comprado    TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oferta_id) REFERENCES ofertas(id) ON DELETE CASCADE,
  INDEX idx_user (user_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
