const test = require('node:test');
const assert = require('node:assert/strict');
const PasswordRecoveryMailer = require('../src/identity-access/infrastructure/password-recovery-mailer');

test('sends the six-digit recovery code through the mail adapter', async () => {
  let message;
  const transporter = { sendMail: async (payload) => { message = payload; } };
  const mailer = new PasswordRecoveryMailer({
    config: { from: 'SafeStock <no-reply@safestock.test>' }, transporter
  });
  await mailer.sendCode({ correo: 'admin@safestock.com', codigo: '123456' });
  assert.equal(message.to, 'admin@safestock.com');
  assert.match(message.subject, /recuperar tu contraseña/i);
  assert.match(message.text, /123456/);
});

test('reports unavailable service when SMTP is not configured', async () => {
  const mailer = new PasswordRecoveryMailer();
  await assert.rejects(() => mailer.sendCode({ correo: 'admin@safestock.com', codigo: '123456' }), /todavía no está configurado/);
});
