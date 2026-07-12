const test = require('node:test');
const assert = require('node:assert/strict');
const SubscriptionPlan = require('../src/subscription-management/domain/subscription-plan');

test('Emprendedor rejects a third active user', () => {
  const plan = new SubscriptionPlan({ codigo: 'EMPRENDEDOR', nombre: 'Emprendedor', precio_mensual: 49,
    max_locales: 1, max_usuarios: 2, exige_motivo_anulacion: false, antifraude_habilitado: false,
    dashboard_actividades: false, dashboard_analitico: false });
  assert.throws(() => plan.assertUserCapacity(2), /máximo de 2 usuarios activos/);
  assert.doesNotThrow(() => plan.assertUserCapacity(1));
});

test('Emprendedor cannot access antifraud features', () => {
  const plan = new SubscriptionPlan({ codigo: 'EMPRENDEDOR', nombre: 'Emprendedor', precio_mensual: 49,
    max_locales: 1, max_usuarios: 2, exige_motivo_anulacion: false, antifraude_habilitado: false,
    dashboard_actividades: false, dashboard_analitico: false });
  assert.throws(() => plan.assertFeature('antifraud'), /no está incluida/);
});
