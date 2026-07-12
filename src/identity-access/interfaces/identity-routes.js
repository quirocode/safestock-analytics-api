const express = require('express');

class IdentityRoutes {
  constructor({ controller, authentication }) {
    this.router = express.Router();
    this.router.post('/auth/login', controller.login);
    this.router.post('/auth/2fa/verificar', controller.verifyTwoFactor);
    this.router.post('/auth/recuperar-password', controller.recoverPassword);
    this.router.post('/auth/2fa/configurar', authentication.authenticate, controller.setupTwoFactor);
    this.router.post('/auth/2fa/activar', authentication.authenticate, controller.enableTwoFactor);
    this.router.get('/usuarios', authentication.authenticate, authentication.authorize('ADMIN'), controller.listUsers);
    this.router.post('/usuarios', authentication.authenticate, authentication.authorize('ADMIN'), controller.createUser);
    this.router.put('/usuarios/perfil', authentication.authenticate, controller.updateProfile);
    this.router.put('/usuarios/password', authentication.authenticate, controller.changePassword);
    this.router.put('/usuarios/:id/estado', authentication.authenticate, authentication.authorize('ADMIN'), controller.updateStatus);
    this.router.get('/usuarios/accesos/historial', authentication.authenticate, authentication.authorize('ADMIN', 'AUDITOR'), controller.listAccessHistory);
    this.router.get('/empleados', authentication.authenticate, authentication.authorize('ADMIN'), controller.listUsers);
  }
}

module.exports = IdentityRoutes;
