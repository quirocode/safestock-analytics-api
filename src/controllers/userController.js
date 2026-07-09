const userService = require('../services/userService');

async function updateProfile(req, res, next) {
  try {
    const usuario = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({ usuario });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateProfile
};
