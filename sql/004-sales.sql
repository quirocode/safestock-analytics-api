CREATE TABLE IF NOT EXISTS ventas (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal NUMERIC(12, 2) NOT NULL,
  igv NUMERIC(12, 2) NOT NULL,
  total NUMERIC(12, 2) NOT NULL,
  CONSTRAINT ventas_subtotal_no_negativo CHECK (subtotal >= 0),
  CONSTRAINT ventas_igv_no_negativo CHECK (igv >= 0),
  CONSTRAINT ventas_total_no_negativo CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS ventas_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_venta BIGINT NOT NULL REFERENCES ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  id_producto BIGINT NOT NULL REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  CONSTRAINT ventas_detalle_cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT ventas_detalle_precio_no_negativo CHECK (precio_unitario >= 0),
  CONSTRAINT ventas_detalle_subtotal_no_negativo CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha
  ON ventas (fecha DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha
  ON ventas (id_usuario, fecha DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta
  ON ventas_detalle (id_venta);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto
  ON ventas_detalle (id_producto);
