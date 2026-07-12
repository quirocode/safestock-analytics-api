ALTER TABLE productos
ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 10;

ALTER TABLE productos
DROP CONSTRAINT IF EXISTS productos_stock_minimo_no_negativo;

ALTER TABLE productos
ADD CONSTRAINT productos_stock_minimo_no_negativo CHECK (stock_minimo >= 0);

CREATE INDEX IF NOT EXISTS idx_productos_stock_alerta
  ON productos (estado, stock_actual, stock_minimo);
