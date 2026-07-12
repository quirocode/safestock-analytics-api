CREATE TABLE IF NOT EXISTS permisos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS roles_permisos (
  rol_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id BIGINT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_estado_valido;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_estado_valido CHECK (estado IN ('activo','inactivo','bloqueado'));

CREATE TABLE IF NOT EXISTS historial_accesos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  correo_intentado CITEXT NOT NULL,
  exitoso BOOLEAN NOT NULL,
  direccion_ip INET,
  user_agent VARCHAR(500),
  motivo VARCHAR(255),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historial_accesos_fecha ON historial_accesos(fecha_hora DESC);

ALTER TABLE historial_inventario ADD COLUMN IF NOT EXISTS motivo VARCHAR(500);

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(500);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS anulada_por BIGINT REFERENCES usuarios(id) ON DELETE RESTRICT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS anulada_en TIMESTAMPTZ;
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_estado_valido;
ALTER TABLE ventas ADD CONSTRAINT ventas_estado_valido CHECK (estado IN ('REGISTRADA','ANULADA'));

CREATE TABLE IF NOT EXISTS eventos_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(80) NOT NULL,
  entidad VARCHAR(80) NOT NULL,
  entidad_id BIGINT,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  descripcion VARCHAR(500) NOT NULL,
  severidad VARCHAR(20) NOT NULL DEFAULT 'ADVERTENCIA',
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eventos_severidad_valida CHECK (severidad IN ('INFO','ADVERTENCIA','CRITICA'))
);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_fecha ON eventos_auditoria(fecha_hora DESC);

INSERT INTO permisos(codigo,descripcion) VALUES
('USUARIOS_GESTIONAR','Gestionar usuarios y bloqueos'),('PRODUCTOS_GESTIONAR','Gestionar catalogo'),
('INVENTARIO_AJUSTAR','Registrar ajustes de inventario'),('VENTAS_REGISTRAR','Registrar ventas'),
('VENTAS_ANULAR','Anular ventas'),('REPORTES_VER','Consultar y exportar reportes')
ON CONFLICT(codigo) DO NOTHING;

INSERT INTO roles_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permisos p WHERE r.nombre='ADMIN' ON CONFLICT DO NOTHING;
INSERT INTO roles_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r JOIN permisos p ON p.codigo IN ('VENTAS_REGISTRAR','PRODUCTOS_GESTIONAR') WHERE r.nombre='VENDEDOR' ON CONFLICT DO NOTHING;
INSERT INTO roles_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r JOIN permisos p ON p.codigo='REPORTES_VER' WHERE r.nombre='AUDITOR' ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA public TO safestock_user;
GRANT SELECT ON roles, permisos, roles_permisos TO safestock_user;
GRANT SELECT, INSERT, UPDATE ON usuarios TO safestock_user;
GRANT SELECT, INSERT ON historial_accesos TO safestock_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON productos TO safestock_user;
GRANT SELECT, INSERT ON historial_inventario TO safestock_user;
GRANT SELECT, INSERT, UPDATE ON ventas TO safestock_user;
GRANT SELECT, INSERT ON ventas_detalle TO safestock_user;
GRANT SELECT, INSERT ON eventos_auditoria TO safestock_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO safestock_user;
