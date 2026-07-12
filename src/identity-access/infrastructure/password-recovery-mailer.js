const nodemailer = require('nodemailer');
const HttpError = require('../../shared/domain/http-error');

class PasswordRecoveryMailer {
  constructor({ config = {}, transporter = null } = {}) {
    this.config = config;
    this.transporter = transporter || (this.isConfigured() ? nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    }) : null);
  }

  isConfigured() {
    return Boolean(this.config.host && this.config.port && this.config.user && this.config.password && this.config.from);
  }

  async sendCode({ correo, codigo }) {
    if (!this.transporter) {
      throw new HttpError('El servicio de correo todavía no está configurado. Contacta al administrador.', 503);
    }
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: correo,
        subject: 'Código para recuperar tu contraseña | SafeStock Analytics',
        text: `Tu código de recuperación es ${codigo}. Expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`,
        html: `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;padding:32px"><p style="font-size:12px;font-weight:700;letter-spacing:2px;color:#2563eb">SAFESTOCK ANALYTICS</p><h1 style="font-size:24px">Recuperación de contraseña</h1><p style="line-height:1.6;color:#4b5563">Ingresa este código en la plataforma. Por seguridad, expirará en 15 minutos.</p><div style="margin:24px 0;padding:18px;background:#eff6ff;border-radius:8px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#1d4ed8">${codigo}</div><p style="font-size:13px;line-height:1.6;color:#6b7280">Si no solicitaste este cambio, ignora el mensaje. Nunca compartas este código.</p></div></body></html>`
      });
      return {};
    } catch (error) {
      console.error('[password-recovery] No se pudo entregar el correo:', error.message);
      throw new HttpError('No se pudo enviar el código. Inténtalo nuevamente en unos minutos.', 502);
    }
  }
}

module.exports = PasswordRecoveryMailer;
