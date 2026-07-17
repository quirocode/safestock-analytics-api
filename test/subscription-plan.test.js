const test = require('node:test');
const assert = require('node:assert/strict');
const SubscriptionPlan = require('../src/subscription-management/domain/subscription-plan');

test('Emprendedor rejects a third active user', () => {
  const plan = new SubscriptionPlan({
    codigo: 'EMPRENDEDOR',
    nombre: 'Emprendedor',
    precio_mensual: 29,
    max_locales: 1,
    max_usuarios: 2,
    exige_motivo_anulacion: false,
    antifraude_habilitado: true,
    umbral_antifraude: 50,
    dashboard_actividades: false,
    dashboard_analitico: false
  });

  assert.throws(() => plan.assertUserCapacity(2), /maximo de 2 usuarios activos|m.ximo de 2 usuarios activos/);
  assert.doesNotThrow(() => plan.assertUserCapacity(1));
});

test('Emprendedor can access basic antifraud but not activity dashboard', () => {
  const plan = new SubscriptionPlan({
    codigo: 'EMPRENDEDOR',
    nombre: 'Emprendedor',
    precio_mensual: 29,
    max_locales: 1,
    max_usuarios: 2,
    exige_motivo_anulacion: false,
    antifraude_habilitado: true,
    umbral_antifraude: 50,
    dashboard_actividades: false,
    dashboard_analitico: false
  });

  assert.doesNotThrow(() => plan.assertFeature('antifraud'));
  assert.throws(() => plan.assertFeature('activities'), /no est/);
});
