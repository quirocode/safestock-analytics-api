const IdentityRepositoryPort = require('../domain/identity-repository-port');

class PostgresIdentityRepository extends IdentityRepositoryPort {
  constructor(database) {
    super();
    this.database = database;
  }

  async findUserByEmail(correo) {
    const result = await this.database.query(
      `SELECT u.*, r.nombre AS rol_nombre,
              COALESCE(array_agg(DISTINCT p.codigo) FILTER (WHERE p.codigo IS NOT NULL), '{}') AS permisos
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
       LEFT JOIN permisos p ON p.id = rp.permiso_id
       WHERE u.correo = $1
       GROUP BY u.id, r.id
       LIMIT 1`,
      [correo]
    );
    return result.rows[0] || null;
  }

  async findUserById(id) {
    const result = await this.database.query(
      `SELECT u.id, u.correo, u.nombres, u.apellidos, u.estado, u.rol_id, u.organizacion_id,
              u.two_factor_enabled, r.nombre AS rol_nombre,
              COALESCE(array_agg(DISTINCT p.codigo) FILTER (WHERE p.codigo IS NOT NULL), '{}') AS permisos
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
       LEFT JOIN permisos p ON p.id = rp.permiso_id
       WHERE u.id = $1
       GROUP BY u.id, r.id
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async listUsers() {
    const result = await this.database.query(
      `SELECT u.id, u.correo, u.nombres, u.apellidos, u.estado, u.rol_id,
              u.two_factor_enabled, u.ultimo_acceso_en, u.creado_en, r.nombre AS rol_nombre
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
       ORDER BY u.apellidos, u.nombres`
    );
    return result.rows;
  }

  async createUser({ correo, passwordHash, nombres, apellidos, rolNombre, estado, organizationId }) {
    const result = await this.database.query(
      `INSERT INTO usuarios (rol_id, correo, password_hash, nombres, apellidos, estado, organizacion_id)
       SELECT id, $1, $2, $3, $4, $5, $7 FROM roles WHERE nombre = $6
       RETURNING id, correo, nombres, apellidos, estado, rol_id, creado_en`,
      [correo, passwordHash, nombres, apellidos, estado, rolNombre, organizationId]
    );
    return result.rows[0] || null;
  }

  async updateProfile(id, { nombres, apellidos }) {
    const result = await this.database.query(
      `UPDATE usuarios SET nombres = $2, apellidos = $3, actualizado_en = NOW()
       WHERE id = $1 RETURNING id, correo, nombres, apellidos, estado`,
      [id, nombres, apellidos]
    );
    return result.rows[0] || null;
  }

  async updateStatus(id, estado) {
    const result = await this.database.query(
      `UPDATE usuarios SET estado = $2, actualizado_en = NOW() WHERE id = $1
       RETURNING id, correo, nombres, apellidos, estado`,
      [id, estado]
    );
    return result.rows[0] || null;
  }

  async updatePassword(id, passwordHash) {
    await this.database.query(
      'UPDATE usuarios SET password_hash = $2, actualizado_en = NOW() WHERE id = $1',
      [id, passwordHash]
    );
  }

  async updateLastAccess(id) {
    await this.database.query(
      'UPDATE usuarios SET ultimo_acceso_en = NOW(), actualizado_en = NOW() WHERE id = $1',
      [id]
    );
  }

  async recordAccess({ userId, correo, successful, ip, userAgent, reason }) {
    await this.database.query(
      `INSERT INTO historial_accesos (usuario_id, correo_intentado, exitoso, direccion_ip, user_agent, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, correo, successful, ip, userAgent, reason]
    );
  }

  async listAccessHistory({ limit = 100, offset = 0 }) {
    const result = await this.database.query(
      `SELECT ha.id, ha.correo_intentado, ha.exitoso, ha.direccion_ip, ha.user_agent,
              ha.motivo, ha.fecha_hora, u.nombres, u.apellidos
       FROM historial_accesos ha LEFT JOIN usuarios u ON u.id = ha.usuario_id
       ORDER BY ha.fecha_hora DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async setTwoFactorSecret(id, secret) {
    await this.database.query(
      `UPDATE usuarios SET two_factor_secret = $2, two_factor_enabled = FALSE,
       actualizado_en = NOW() WHERE id = $1`, [id, secret]
    );
  }

  async enableTwoFactor(id) {
    await this.database.query(
      'UPDATE usuarios SET two_factor_enabled = TRUE, actualizado_en = NOW() WHERE id = $1', [id]
    );
  }

  async getTwoFactorData(id) {
    const result = await this.database.query(
      'SELECT id, correo, two_factor_secret, two_factor_enabled FROM usuarios WHERE id = $1', [id]
    );
    return result.rows[0] || null;
  }

  async createPasswordRecoveryCode({ userId, codeHash, expiresAt }) {
    await this.database.transaction(async (client) => {
      await client.query(
        'UPDATE recuperacion_password_otp SET usado_en = NOW() WHERE usuario_id = $1 AND usado_en IS NULL', [userId]
      );
      await client.query(
        `INSERT INTO recuperacion_password_otp(usuario_id, codigo_hash, expira_en)
         VALUES($1, $2, $3)`, [userId, codeHash, expiresAt]
      );
    });
  }

  async findActivePasswordRecoveryCode(userId) {
    const result = await this.database.query(
      `SELECT id, usuario_id, codigo_hash, expira_en, intentos
       FROM recuperacion_password_otp
       WHERE usuario_id = $1 AND usado_en IS NULL AND expira_en > NOW() AND intentos < 5
       ORDER BY creado_en DESC LIMIT 1`, [userId]
    );
    return result.rows[0] || null;
  }

  async incrementPasswordRecoveryAttempts(id) {
    await this.database.query('UPDATE recuperacion_password_otp SET intentos = intentos + 1 WHERE id = $1', [id]);
  }

  async consumePasswordRecoveryCode({ codeId, userId, passwordHash }) {
    return this.database.transaction(async (client) => {
      const consumed = await client.query(
        `UPDATE recuperacion_password_otp SET usado_en = NOW()
         WHERE id = $1 AND usuario_id = $2 AND usado_en IS NULL AND expira_en > NOW()
         RETURNING id`, [codeId, userId]
      );
      if (!consumed.rowCount) return false;
      await client.query(
        'UPDATE usuarios SET password_hash = $2, actualizado_en = NOW() WHERE id = $1', [userId, passwordHash]
      );
      return true;
    });
  }
}

module.exports = PostgresIdentityRepository;
