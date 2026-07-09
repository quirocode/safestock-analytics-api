CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  precio NUMERIC(12, 2) NOT NULL,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_precio_no_negativo CHECK (precio >= 0),
  CONSTRAINT productos_stock_no_negativo CHECK (stock_actual >= 0),
  CONSTRAINT productos_estado_valido CHECK (estado IN ('activo', 'inactivo'))
);

CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
