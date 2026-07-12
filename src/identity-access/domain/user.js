const HttpError = require('../../shared/domain/http-error');

class User {
  constructor({ id, correo, nombres, apellidos, estado = 'activo', rolNombre, twoFactorEnabled = false }) {
    this.id = id;
    this.correo = String(correo || '').trim().toLowerCase();
    this.nombres = String(nombres || '').trim();
    this.apellidos = String(apellidos || '').trim();
    this.estado = estado;
    this.rolNombre = rolNombre;
    this.twoFactorEnabled = Boolean(twoFactorEnabled);
  }

  assertValid() {
    if (!this.correo || !this.correo.includes('@')) throw new HttpError('Correo invalido.', 400);
    if (this.nombres.length < 2 || this.apellidos.length < 2) {
      throw new HttpError('Nombres y apellidos son obligatorios.', 400);
    }
    if (!['activo', 'inactivo', 'bloqueado'].includes(this.estado)) {
      throw new HttpError('Estado de usuario invalido.', 400);
    }
    return this;
  }
}

module.exports = User;
