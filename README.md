# SafeStock Analytics API

Sprint 1: base de datos, autenticacion y perfil de usuario.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Configuracion

1. Crear la base de datos PostgreSQL.
2. Ejecutar `sql/001_identity.sql`.
3. Ejecutar `sql/002_catalog.sql`.
4. Ejecutar `sql/003_inventory.sql`.
5. Ejecutar `sql/004_sales.sql`.
6. Ejecutar `sql/005_dashboard_alerts.sql`.
7. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL` y `JWT_SECRET`.
8. Instalar dependencias con `npm install`.
9. Levantar la API con `npm run dev` o `npm start`.

## Endpoints

- `POST /api/auth/login`
  - Body: `{ "correo": "admin@empresa.com", "password": "secreto" }`
  - Tambien acepta `{ "correo": "admin@empresa.com", "contrasena": "secreto" }`.
  - Retorna JWT si las credenciales son validas.

- `POST /api/auth/recuperar-password`
  - Body: `{ "correo": "admin@empresa.com" }`
  - Simula el envio de correo de recuperacion si el usuario existe.

- `PUT /api/usuarios/perfil`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "nombres": "Ana", "apellidos": "Torres" }`
  - Actualiza el perfil del usuario autenticado.

- `GET /api/empleados`
  - Header: `Authorization: Bearer <token>`
  - Requiere rol `ADMIN` o `ADMINISTRADOR`.
  - Retorna todos los usuarios registrados sin exponer contrasenas.

- `GET /api/productos`
  - Header: `Authorization: Bearer <token>`
  - Retorna productos activos.

- `PUT /api/productos/:id`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "nombre": "Arroz superior", "categoria": "Abarrotes", "precio": 8.50 }`
  - Actualiza nombre, categoria y precio de un producto existente.

- `GET /api/inventario`
  - Header: `Authorization: Bearer <token>`
  - Retorna SKU, nombre y stock actual de todos los productos.

- `GET /api/inventario/movimientos`
  - Header: `Authorization: Bearer <token>`
  - Query opcional: `?limit=100&offset=0`.
  - Retorna el historial de movimientos con producto y usuario responsable.
  - Ordena primero los movimientos mas recientes.

- `POST /api/ventas`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "productos": [{ "productoId": 1, "cantidad": 2 }] }`
  - Valida stock, calcula subtotal, IGV 18% y total.
  - Inserta venta, detalle, descuenta stock y registra movimiento `VENTA` en una sola transaccion SQL.

- `GET /api/ventas`
  - Header: `Authorization: Bearer <token>`
  - Query opcional: `?limit=100&offset=0`.
  - Lista ventas ordenadas por fecha descendente, con usuario y detalles.

- `GET /api/dashboard/resumen`
  - Header: `Authorization: Bearer <token>`
  - Retorna total vendido hoy, cantidad de transacciones del dia y productos bajo stock.
  - Usa `REPORT_TIME_ZONE`, por defecto `America/Lima`, para calcular el dia operativo.

- `GET /api/alertas/stock`
  - Header: `Authorization: Bearer <token>`
  - Retorna productos activos cuyo `stock_actual` sea menor o igual a `stock_minimo`.
  - `stock_minimo` queda con valor por defecto de 10 unidades.

## Crear un hash bcrypt para usuario semilla

```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('Admin123!', 12).then(console.log)"
```
