-- Execute this migration as the PostgreSQL owner (normally postgres).
-- The API connects as safestock_user and needs explicit privileges on objects
-- created by an administrative account.
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

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO safestock_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO safestock_user;
