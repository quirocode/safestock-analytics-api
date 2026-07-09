const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { signAccessToken } = require('../utils/jwt');

class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

async function login({ correo, password, contrasena }) {
  const cleanEmail = correo ? String(correo).trim() : '';
  const plainPassword = password || contrasena;

  if (!cleanEmail || !plainPassword) {
    throw new AuthError('Correo y password son obligatorios.', 400);
  }

  const user = await userModel.findByEmail(cleanEmail);

  if (!user) {
    throw new AuthError('Credenciales invalidas.', 401);
  }

  if (user.estado !== 'activo') {
    throw new AuthError('La cuenta se encuentra inactiva.', 403);
  }

  const passwordMatches = await bcrypt.compare(plainPassword, user.password_hash);

  if (!passwordMatches) {
    throw new AuthError('Credenciales invalidas.', 401);
  }

  await userModel.updateLastAccess(user.id);

  const token = signAccessToken(user);

  return {
    token,
    usuario: {
      id: user.id,
      correo: user.correo,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: user.rol_nombre
    }
  };
}

async function recoverPassword(correo) {
  const cleanEmail = correo ? String(correo).trim() : '';

  if (!cleanEmail) {
    throw new AuthError('Correo es obligatorio.', 400);
  }

  const user = await userModel.findByEmail(cleanEmail);

  if (!user) {
    throw new AuthError('No existe una cuenta registrada con ese correo.', 404);
  }

  return {
    message: 'Correo de recuperacion simulado correctamente.'
  };
}

module.exports = {
  AuthError,
  login,
  recoverPassword
};
