const jwt = require('jsonwebtoken');

class JwtTokenService {
  constructor({ secret, expiresIn }) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(user, extra = {}) {
    return jwt.sign({ rol: user.rol_nombre || user.rolNombre, ...extra }, this.secret, {
      subject: String(user.id),
      expiresIn: this.expiresIn
    });
  }

  verify(token) {
    return jwt.verify(token, this.secret);
  }
}

module.exports = JwtTokenService;
