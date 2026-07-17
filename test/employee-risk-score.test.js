const test = require('node:test');
const assert = require('node:assert/strict');
const EmployeeRiskScore = require('../src/monitoring-analytics/domain/employee-risk-score');
const AuthenticationMiddleware = require('../src/identity-access/interfaces/authentication-middleware');

test('calculates employee risk score with a maximum of 100', () => {
  const score = new EmployeeRiskScore({
    anulacionesRepetidas: 2,
    ajustesNegativos: 2,
    ventasRepetidasSku: 1,
    fueraDeHorario: 1,
    alertasCriticas: 1
  });

  assert.equal(score.calculate(), 100);
});

test('classifies employee risk levels', () => {
  assert.equal(new EmployeeRiskScore({}).classify(), 'Bajo');
  assert.equal(new EmployeeRiskScore({ anulacionesRepetidas: 2 }).classify(), 'Medio');
  assert.equal(new EmployeeRiskScore({ ajustesNegativos: 3 }).classify(), 'Alto');
  assert.equal(new EmployeeRiskScore({ ajustesNegativos: 4 }).classify(), 'Crítico');
});

test('admin authorization blocks non-admin roles', () => {
  const middleware = new AuthenticationMiddleware({ tokenService: {}, identityRepository: {} });
  const authorize = middleware.authorize('ADMIN', 'ADMINISTRADOR');
  let statusCode = 0;
  let payload = null;
  const req = { user: { rol: 'VENDEDOR' } };
  const res = { status(code) { statusCode = code; return this; }, json(data) { payload = data; return this; } };
  const next = () => { throw new Error('next should not be called'); };

  authorize(req, res, next);

  assert.equal(statusCode, 403);
  assert.match(payload.message, /permisos/);
});
