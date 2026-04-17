-- Tabla de configuración general (clave → valor)
CREATE TABLE IF NOT EXISTS config (
  clave      VARCHAR(100) PRIMARY KEY,
  valor      TEXT         NOT NULL,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Valor inicial para Aligro
INSERT INTO config (clave, valor) VALUES
  ('aligro_pdf_url', 'https://www.aligro.ch/uploads/documents/prospectus/69d76/69d768b6aaa0b688036218.pdf')
ON DUPLICATE KEY UPDATE clave = clave;
