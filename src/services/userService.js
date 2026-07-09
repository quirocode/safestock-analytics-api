const userModel = require('../models/userModel');

class UserError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'UserError';
    this.statusCode = statusCode;
  }
}

function validateProfilePayload({ nombres, apellidos }) {
  if (!nombres || !apellidos) {
    throw new UserError('Nombres y apellidos son obligatorios.', 400);
  }

  if (String(nombres).trim().length < 2 || String(apellidos).trim().length < 2) {
    throw new UserError('Nombres y apellidos deben tener al menos 2 caracteres.', 400);
  }

  return {
    nombres: String(nombres).trim(),
    apellidos: String(apellidos).trim()
  };
}

async function updateProfile(userId, payload) {
  const validPayload = validateProfilePayload(payload);
  const updatedUser = await userModel.updateProfile(userId, validPayload);

  if (!updatedUser) {
    throw new UserError('Usuario no encontrado o inactivo.', 404);
  }

  return updatedUser;
}

module.exports = {
  UserError,
  updateProfile
};
