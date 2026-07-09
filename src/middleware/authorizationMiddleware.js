function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Autenticacion requerida.' });
    }

    const currentRole = String(req.user.rol).trim().toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).trim().toUpperCase());

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso.' });
    }

    return next();
  };
}

module.exports = {
  authorizeRoles
};
