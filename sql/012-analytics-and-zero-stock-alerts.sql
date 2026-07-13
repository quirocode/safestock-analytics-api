BEGIN;

ALTER TABLE historial_inventario
  ADD COLUMN IF NOT EXISTS variacion_stock INTEGER NOT NULL DEFAULT 0;

UPDATE historial_inventario
SET variacion_stock = CASE tipo_movimiento
  WHEN 'ENTRADA' THEN cantidad
  WHEN 'SALIDA' THEN -cantidad
  WHEN 'VENTA' THEN -cantidad
  ELSE 0
END
WHERE variacion_stock = 0
  AND tipo_movimiento IN ('ENTRADA', 'SALIDA', 'VENTA');

CREATE INDEX IF NOT EXISTS idx_historial_inventario_producto_fecha
  ON historial_inventario(producto_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo_fecha
  ON eventos_auditoria(tipo, fecha_hora DESC);

GRANT SELECT, INSERT, UPDATE ON historial_inventario TO safestock_user;

COMMIT;
