const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const IdentityService = require('../src/identity-access/application/identity-service');

function createService(repository, tokenService = { sign: () => 'signed-token' }) {
  return new IdentityService({
    repository,
    tokenService,
    totpService: {},
    subscriptionService: {},
    recoveryMailer: {}
  });
}

test('requires the current password before an administrator deactivates their own account', async () => {
  const passwordHash = await bcrypt.hash('Admin123!', 4);
  let updated = false;
  const repository = {
    findUserById: async () => ({ id: 7, correo: 'admin@safestock.com', nombres: 'Admin', apellidos: 'Principal', organizacion_id: 3 }),
    findUserByEmail: async () => ({ id: 7, correo: 'admin@safestock.com', password_hash: passwordHash }),
    updateStatus: async () => { updated = true; return { id: 7, estado: 'inactivo' }; }
  };
  const service = createService(repository);

  await assert.rejects(
    service.updateStatus({ targetId: 7, requesterId: 7, organizationId: 3, estado: 'inactivo', password: 'Incorrecta' }),
    error => error.statusCode === 403 && /Contraseña incorrecta/.test(error.message)
  );
  assert.equal(updated, false);

  await service.updateStatus({ targetId: 7, requesterId: 7, organizationId: 3, estado: 'inactivo', password: 'Admin123!' });
  assert.equal(updated, true);
});

test('registers an organization and its administrator and returns an initial JWT', async () => {
  let registration;
  const repository = {
    registerOrganizationWithAdministrator: async payload => {
      registration = payload;
      return { id: 15, correo: payload.email, nombres: payload.nombres, apellidos: payload.apellidos, rol_nombre: 'ADMIN', permisos: [], organizacion_id: 9 };
    }
  };
  const service = createService(repository);
  const result = await service.register({
    nombreEmpresa: 'Bodega Central',
    nombreAdministrador: 'Ana Torres',
    correo: 'ANA@EMPRESA.COM',
    password: 'Segura123!'
  });

  assert.equal(registration.organizationName, 'Bodega Central');
  assert.equal(registration.email, 'ana@empresa.com');
  assert.equal(registration.nombres, 'Ana');
  assert.equal(registration.apellidos, 'Torres');
  assert.match(registration.passwordHash, /^\$2/);
  assert.equal(result.token, 'signed-token');
  assert.equal(result.usuario.organizacionId, 9);
});
