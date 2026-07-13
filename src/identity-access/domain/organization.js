const HttpError = require('../../shared/domain/http-error');

class Organization {
  constructor({ name, administratorName, email }) {
    this.name = String(name || '').trim();
    this.administratorName = String(administratorName || '').trim();
    this.email = String(email || '').trim().toLowerCase();
  }

  assertValid() {
    if (this.name.length < 2) throw new HttpError('El nombre de la empresa debe tener al menos 2 caracteres.', 400);
    if (this.administratorName.length < 2) throw new HttpError('El nombre del administrador debe tener al menos 2 caracteres.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) throw new HttpError('El correo electrónico no es válido.', 400);
    return this;
  }

  get administratorNames() {
    const parts = this.administratorName.split(/\s+/);
    return { nombres: parts.shift(), apellidos: parts.join(' ') || '.' };
  }
}

module.exports = Organization;
