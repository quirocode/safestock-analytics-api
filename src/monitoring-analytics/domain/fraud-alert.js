class FraudAlert {
  constructor({ id, tipo, severidad, descripcion, fechaHora, usuario, metadata = {} }) {
    this.id = id;
    this.tipo = tipo;
    this.severidad = severidad;
    this.descripcion = descripcion;
    this.fechaHora = fechaHora;
    this.usuario = usuario;
    this.metadata = metadata;
  }

  static fromRow(row) {
    return new FraudAlert({
      id: row.id,
      tipo: row.tipo,
      severidad: row.severidad,
      descripcion: row.descripcion,
      fechaHora: row.fecha_hora,
      usuario: {
        id: row.usuario_id,
        nombres: row.usuario_nombres,
        apellidos: row.usuario_apellidos,
        correo: row.usuario_correo,
        rol: row.usuario_rol
      },
      metadata: row.metadata || {}
    });
  }

  toJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      severidad: this.severidad,
      descripcion: this.descripcion,
      fecha_hora: this.fechaHora,
      usuario: this.usuario,
      metadata: this.metadata
    };
  }
}

module.exports = FraudAlert;
