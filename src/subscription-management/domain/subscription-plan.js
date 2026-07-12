const HttpError = require('../../shared/domain/http-error');

class SubscriptionPlan {
  constructor(data) {
    this.id = data.id;
    this.code = data.codigo;
    this.name = data.nombre;
    this.monthlyPrice = Number(data.precio_mensual);
    this.maxLocations = data.max_locales == null ? null : Number(data.max_locales);
    this.maxUsers = data.max_usuarios == null ? null : Number(data.max_usuarios);
    this.requiresCancellationReason = Boolean(data.exige_motivo_anulacion);
    this.fraudEnabled = Boolean(data.antifraude_habilitado);
    this.fraudThreshold = data.umbral_antifraude == null ? null : Number(data.umbral_antifraude);
    this.activityDashboard = Boolean(data.dashboard_actividades);
    this.analyticDashboard = Boolean(data.dashboard_analitico);
    this.alertChannel = data.canal_alertas;
    this.supportLevel = data.nivel_soporte;
  }

  assertUserCapacity(activeUsers) {
    if (this.maxUsers !== null && Number(activeUsers) >= this.maxUsers) {
      throw new HttpError(`El plan ${this.name} permite un máximo de ${this.maxUsers} usuarios activos.`, 409);
    }
  }

  assertFeature(feature) {
    const enabled = { antifraud: this.fraudEnabled, activities: this.activityDashboard, analytics: this.analyticDashboard }[feature];
    if (!enabled) throw new HttpError(`La función solicitada no está incluida en el plan ${this.name}.`, 403);
  }

  toJSON() {
    return { id: this.id, codigo: this.code, nombre: this.name, precioMensual: this.monthlyPrice,
      maxLocales: this.maxLocations, maxUsuarios: this.maxUsers, exigeMotivoAnulacion: this.requiresCancellationReason,
      antifraudeHabilitado: this.fraudEnabled, umbralAntifraude: this.fraudThreshold,
      dashboardActividades: this.activityDashboard, dashboardAnalitico: this.analyticDashboard,
      canalAlertas: this.alertChannel, nivelSoporte: this.supportLevel };
  }
}

module.exports = SubscriptionPlan;
