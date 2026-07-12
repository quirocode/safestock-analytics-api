class PasswordRecoveryMailer {
  constructor({ environment = 'development' } = {}) { this.environment = environment; }
  async sendCode({ correo, codigo }) {
    // Adapter boundary: replace this implementation with Nodemailer or Azure Communication Services.
    console.info(`[password-recovery] Código generado para ${correo}; entrega simulada.`);
    return this.environment === 'production' ? {} : { codigoSimulado: codigo };
  }
}
module.exports = PasswordRecoveryMailer;
