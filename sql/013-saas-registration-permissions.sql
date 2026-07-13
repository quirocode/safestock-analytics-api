BEGIN;

GRANT SELECT, INSERT ON organizaciones TO safestock_user;
GRANT SELECT ON planes_suscripcion TO safestock_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO safestock_user;

COMMIT;
