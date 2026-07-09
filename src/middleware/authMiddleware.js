const userModel = require('../models/userModel');
const { verifyAccessToken } = require('../utils/jwt');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Token de autenticacion requerido.' });
    }

    const payload = verifyAccessToken(token);
    const user = await userModel.findById(payload.sub);

    if (!user || user.estado !== 'activo') {
      return res.status(401).json({ message: 'Token invalido o usuario inactivo.' });
    }

    req.user = {
      id: user.id,
      correo: user.correo,
      rol: user.rol_nombre
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

module.exports = {
  authenticate
};
