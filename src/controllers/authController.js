const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function recoverPassword(req, res, next) {
  try {
    const result = await authService.recoverPassword(req.body.correo);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  recoverPassword
};
