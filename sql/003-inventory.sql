CREATE TABLE IF NOT EXISTS historial_inventario (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tipo_movimiento VARCHAR(20) NOT NULL,
  cantidad INTEGER NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT historial_inventario_tipo_valido CHECK (
    tipo_movimiento IN ('ENTRADA', 'SALIDA', 'VENTA', 'AJUSTE')
  ),
  CONSTRAINT historial_inventario_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_fecha_hora
  ON historial_inventario (fecha_hora DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_producto_fecha
  ON historial_inventario (producto_id, fecha_hora DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_usuario_fecha
  ON historial_inventario (usuario_id, fecha_hora DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_tipo_fecha
  ON historial_inventario (tipo_movimiento, fecha_hora DESC, id DESC);
