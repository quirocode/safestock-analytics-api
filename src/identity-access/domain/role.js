class Role {
  constructor({ id, nombre, permisos = [] }) {
    this.id = id;
    this.nombre = String(nombre || '').toUpperCase();
    this.permisos = permisos;
  }

  can(permission) {
    return this.nombre === 'ADMIN' || this.permisos.includes(permission);
  }
}

module.exports = Role;
