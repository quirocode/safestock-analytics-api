class AuthenticationMiddleware {
  constructor({ tokenService, identityRepository }) {
    this.tokenService = tokenService;
    this.identityRepository = identityRepository;
    this.authenticate = this.authenticate.bind(this);
  }

  async authenticate(req, res, next) {
    try {
      const [scheme, token] = String(req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Token de autenticacion requerido.' });
      const payload = this.tokenService.verify(token);
      if (payload.purpose === '2fa') return res.status(401).json({ message: 'Completa la autenticacion 2FA.' });
      const user = await this.identityRepository.findUserById(payload.sub);
      if (!user || user.estado !== 'activo') return res.status(401).json({ message: 'Token invalido o usuario inactivo.' });
      req.user = { id: user.id, correo: user.correo, rol: user.rol_nombre, permisos: user.permisos || [], organizationId: user.organizacion_id };
      next();
    } catch {
      res.status(401).json({ message: 'Token invalido o expirado.' });
    }
  }

  authorize(...roles) {
    const allowed = roles.map((role) => role.toUpperCase());
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ message: 'Autenticacion requerida.' });
      if (!allowed.includes(String(req.user.rol).toUpperCase())) return res.status(403).json({ message: 'No tienes permisos para esta operacion.' });
      next();
    };
  }
}

module.exports = AuthenticationMiddleware;
