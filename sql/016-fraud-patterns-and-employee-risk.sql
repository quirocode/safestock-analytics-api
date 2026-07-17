BEGIN;

CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha
  ON ventas (id_usuario, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_anulacion_usuario_fecha
  ON ventas (anulada_por, anulada_en DESC)
  WHERE estado = 'ANULADA';

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto
  ON ventas_detalle (id_producto);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_usuario_fecha_tipo
  ON historial_inventario (usuario_id, fecha_hora DESC, tipo_movimiento);

CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_usuario_fecha
  ON eventos_auditoria (usuario_id, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo_fecha
  ON eventos_auditoria (tipo, fecha_hora DESC);

COMMIT;
