BEGIN;

UPDATE planes_suscripcion
SET antifraude_habilitado = TRUE,
    umbral_antifraude = COALESCE(umbral_antifraude, 50.00),
    actualizado_en = NOW()
WHERE codigo = 'EMPRENDEDOR';

GRANT SELECT ON planes_suscripcion TO safestock_user;

COMMIT;
