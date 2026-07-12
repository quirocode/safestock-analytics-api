BEGIN;

UPDATE planes_suscripcion
SET precio_mensual = 29.00,
    actualizado_en = NOW()
WHERE codigo = 'EMPRENDEDOR'
  AND precio_mensual IS DISTINCT FROM 29.00;

COMMIT;
