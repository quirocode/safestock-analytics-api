BEGIN;

GRANT SELECT, UPDATE ON organizaciones TO safestock_user;
GRANT SELECT ON planes_suscripcion TO safestock_user;

COMMIT;
