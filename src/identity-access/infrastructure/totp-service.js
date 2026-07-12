const { authenticator } = require('otplib');

class TotpService {
  createSecret() {
    return authenticator.generateSecret();
  }

  createUri(email, secret) {
    return authenticator.keyuri(email, 'SafeStock Analytics', secret);
  }

  verify(token, secret) {
    return authenticator.check(String(token || ''), secret);
  }
}

module.exports = TotpService;
