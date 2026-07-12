const bcrypt = require('bcrypt');
const HttpError = require('../../shared/domain/http-error');
const User = require('../domain/user');

class IdentityService {
  constructor({ repository, tokenService, totpService }) {
    this.repository = repository;
    this.tokenService = tokenService;
    this.totpService = totpService;
  }

  async login(payload, metadata = {}) {
    const correo = String(payload.correo || '').trim().toLowerCase();
    const password = payload.password || payload.contrasena;
    if (!correo || !password) throw new HttpError('Correo y password son obligatorios.', 400);

    const user = await this.repository.findUserByEmail(correo);
    const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !validPassword) {
      await this.repository.recordAccess({ userId: user?.id || null, correo, successful: false, ...metadata, reason: 'Credenciales invalidas' });
      throw new HttpError('Credenciales invalidas.', 401);
    }
    if (user.estado !== 'activo') {
      await this.repository.recordAccess({ userId: user.id, correo, successful: false, ...metadata, reason: `Cuenta ${user.estado}` });
      throw new HttpError('La cuenta no esta activa.', 403);
    }

    if (user.two_factor_enabled) {
      const challengeToken = this.tokenService.sign(user, { purpose: '2fa' });
      return { requiresTwoFactor: true, challengeToken };
    }

    return this.completeLogin(user, metadata);
  }

  async verifyTwoFactor({ challengeToken, codigo }, metadata = {}) {
    let payload;
    try { payload = this.tokenService.verify(challengeToken); } catch { throw new HttpError('Desafio 2FA invalido o expirado.', 401); }
    if (payload.purpose !== '2fa') throw new HttpError('Desafio 2FA invalido.', 401);
    const user = await this.repository.findUserById(payload.sub);
    const factor = await this.repository.getTwoFactorData(payload.sub);
    if (!user || !factor?.two_factor_secret || !this.totpService.verify(codigo, factor.two_factor_secret)) {
      throw new HttpError('Codigo 2FA invalido.', 401);
    }
    return this.completeLogin(user, metadata);
  }

  async completeLogin(user, metadata) {
    await this.repository.updateLastAccess(user.id);
    await this.repository.recordAccess({ userId: user.id, correo: user.correo, successful: true, ...metadata, reason: null });
    return {
      token: this.tokenService.sign(user),
      usuario: {
        id: user.id, correo: user.correo, nombres: user.nombres,
        apellidos: user.apellidos, rol: user.rol_nombre, permisos: user.permisos || []
      }
    };
  }

  async setupTwoFactor(userId) {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new HttpError('Usuario no encontrado.', 404);
    const secret = this.totpService.createSecret();
    await this.repository.setTwoFactorSecret(userId, secret);
    return { secret, otpauthUrl: this.totpService.createUri(user.correo, secret) };
  }

  async enableTwoFactor(userId, codigo) {
    const factor = await this.repository.getTwoFactorData(userId);
    if (!factor?.two_factor_secret || !this.totpService.verify(codigo, factor.two_factor_secret)) {
      throw new HttpError('Codigo 2FA invalido.', 400);
    }
    await this.repository.enableTwoFactor(userId);
    return { message: 'Autenticacion de dos pasos activada.' };
  }

  async recoverPassword(correo) {
    const user = await this.repository.findUserByEmail(String(correo || '').trim().toLowerCase());
    if (!user) throw new HttpError('No existe una cuenta registrada con ese correo.', 404);
    return { message: 'Correo de recuperacion simulado correctamente.' };
  }

  async listUsers() { return this.repository.listUsers(); }

  async createUser(payload) {
    const user = new User({
      correo: payload.correo || payload.email,
      nombres: payload.nombres || payload.nombre,
      apellidos: payload.apellidos || '.',
      estado: payload.estado || 'activo',
      rolNombre: String(payload.rol || 'VENDEDOR').toUpperCase()
    }).assertValid();
    if (!payload.password || String(payload.password).length < 8) {
      throw new HttpError('La password debe tener al menos 8 caracteres.', 400);
    }
    try {
      const created = await this.repository.createUser({
        correo: user.correo, nombres: user.nombres, apellidos: user.apellidos,
        estado: user.estado, rolNombre: user.rolNombre,
        passwordHash: await bcrypt.hash(payload.password, 12)
      });
      if (!created) throw new HttpError('Rol no encontrado.', 400);
      return created;
    } catch (error) {
      if (error.code === '23505') throw new HttpError('El correo ya esta registrado.', 409);
      throw error;
    }
  }

  async updateProfile(userId, payload) {
    const nombres = String(payload.nombres || '').trim();
    const apellidos = String(payload.apellidos || '').trim();
    if (nombres.length < 2 || apellidos.length < 2) throw new HttpError('Nombres y apellidos son obligatorios.', 400);
    return this.repository.updateProfile(userId, { nombres, apellidos });
  }

  async updateStatus(id, estado) {
    if (!['activo', 'inactivo', 'bloqueado'].includes(estado)) throw new HttpError('Estado invalido.', 400);
    const user = await this.repository.updateStatus(id, estado);
    if (!user) throw new HttpError('Usuario no encontrado.', 404);
    return user;
  }

  async changePassword(userId, { passwordActual, passwordNueva }) {
    const user = await this.repository.findUserById(userId);
    const fullUser = user && await this.repository.findUserByEmail(user.correo);
    if (!fullUser || !await bcrypt.compare(passwordActual || '', fullUser.password_hash)) {
      throw new HttpError('La password actual no es correcta.', 400);
    }
    if (!passwordNueva || passwordNueva.length < 8) throw new HttpError('La nueva password debe tener al menos 8 caracteres.', 400);
    await this.repository.updatePassword(userId, await bcrypt.hash(passwordNueva, 12));
    return { message: 'Password actualizada correctamente.' };
  }

  async listAccessHistory(query) {
    return this.repository.listAccessHistory({ limit: Math.min(Number(query.limit) || 100, 500), offset: Number(query.offset) || 0 });
  }
}

module.exports = IdentityService;
