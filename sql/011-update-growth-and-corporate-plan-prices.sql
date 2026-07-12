BEGIN;

UPDATE planes_suscripcion
SET precio_mensual = CASE codigo
      WHEN 'CRECIMIENTO' THEN 89.00
      WHEN 'CORPORATIVO' THEN 189.00
    END,
    actualizado_en = NOW()
WHERE codigo IN ('CRECIMIENTO', 'CORPORATIVO')
  AND precio_mensual IS DISTINCT FROM CASE codigo
      WHEN 'CRECIMIENTO' THEN 89.00
      WHEN 'CORPORATIVO' THEN 189.00
    END;

COMMIT;
