BEGIN;

CREATE TABLE IF NOT EXISTS planes_suscripcion (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  precio_mensual NUMERIC(10,2) NOT NULL CHECK (precio_mensual >= 0),
  max_locales INTEGER CHECK (max_locales IS NULL OR max_locales > 0),
  max_usuarios INTEGER CHECK (max_usuarios IS NULL OR max_usuarios > 0),
  exige_motivo_anulacion BOOLEAN NOT NULL DEFAULT FALSE,
  antifraude_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  umbral_antifraude NUMERIC(10,2),
  dashboard_actividades BOOLEAN NOT NULL DEFAULT FALSE,
  dashboard_analitico BOOLEAN NOT NULL DEFAULT FALSE,
  canal_alertas VARCHAR(30) NOT NULL DEFAULT 'VISUAL',
  nivel_soporte VARCHAR(40) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planes_suscripcion
  (codigo, nombre, precio_mensual, max_locales, max_usuarios, exige_motivo_anulacion,
   antifraude_habilitado, umbral_antifraude, dashboard_actividades, dashboard_analitico,
   canal_alertas, nivel_soporte)
VALUES
  ('EMPRENDEDOR', 'Emprendedor', 29.00, 1, 2, FALSE, FALSE, NULL, FALSE, FALSE, 'VISUAL', 'CORREO'),
  ('CRECIMIENTO', 'Crecimiento', 89.00, 3, NULL, TRUE, TRUE, 50.00, TRUE, FALSE, 'SMS_PUSH', 'CHAT'),
  ('CORPORATIVO', 'Corporativo', 189.00, NULL, NULL, TRUE, TRUE, 0.00, TRUE, TRUE, 'TIEMPO_REAL', 'PREMIUM_24_7')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  precio_mensual = EXCLUDED.precio_mensual,
  max_locales = EXCLUDED.max_locales,
  max_usuarios = EXCLUDED.max_usuarios,
  exige_motivo_anulacion = EXCLUDED.exige_motivo_anulacion,
  antifraude_habilitado = EXCLUDED.antifraude_habilitado,
  umbral_antifraude = EXCLUDED.umbral_antifraude,
  dashboard_actividades = EXCLUDED.dashboard_actividades,
  dashboard_analitico = EXCLUDED.dashboard_analitico,
  canal_alertas = EXCLUDED.canal_alertas,
  nivel_soporte = EXCLUDED.nivel_soporte,
  actualizado_en = NOW();

CREATE TABLE IF NOT EXISTS organizaciones (
  id BIGSERIAL PRIMARY KEY,
  plan_suscripcion_id BIGINT NOT NULL REFERENCES planes_suscripcion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  razon_social VARCHAR(180) NOT NULL,
  nombre_comercial VARCHAR(180) NOT NULL,
  ruc VARCHAR(11),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'inactivo')),
  suscripcion_inicia_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suscripcion_vence_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizaciones (plan_suscripcion_id, razon_social, nombre_comercial)
SELECT id, 'SafeStock Analytics', 'SafeStock Analytics'
FROM planes_suscripcion
WHERE codigo = 'CORPORATIVO'
  AND NOT EXISTS (SELECT 1 FROM organizaciones);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS organizacion_id BIGINT REFERENCES organizaciones(id) ON UPDATE CASCADE ON DELETE RESTRICT;
UPDATE usuarios SET organizacion_id = (SELECT id FROM organizaciones ORDER BY id LIMIT 1) WHERE organizacion_id IS NULL;
ALTER TABLE usuarios ALTER COLUMN organizacion_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_estado ON usuarios(organizacion_id, estado);

CREATE TABLE IF NOT EXISTS recuperacion_password_otp (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash VARCHAR(255) NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_usuario_vigente ON recuperacion_password_otp(usuario_id, creado_en DESC);

GRANT SELECT ON planes_suscripcion, organizaciones TO safestock_user;
GRANT SELECT, INSERT, UPDATE ON recuperacion_password_otp TO safestock_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO safestock_user;

COMMIT;
