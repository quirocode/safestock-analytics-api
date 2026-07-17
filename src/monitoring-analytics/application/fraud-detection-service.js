const HttpError = require('../../shared/domain/http-error');
const EmployeeRiskScore = require('../domain/employee-risk-score');
const FraudAlert = require('../domain/fraud-alert');
const FraudPatternRule = require('../domain/fraud-pattern-rule');

class FraudDetectionService {
  constructor(repository) {
    this.repository = repository;
    this.rules = FraudPatternRule.defaults;
  }

  async suspicious({ organizationId, threshold }) {
    await this.repository.detectFraudPatterns({ organizationId, rules: this.rules });
    const rows = await this.repository.suspicious({ organizationId, threshold });
    return rows.map((row) => FraudAlert.fromRow(row).toJSON());
  }

  async employeeRisk({ organizationId, query }) {
    const range = this.normalizeRange(query);
    await this.repository.detectFraudPatterns({ organizationId, rules: this.rules });
    const rows = await this.repository.employeeRisk({ organizationId, ...range });
    return rows.map((row) => {
      const indicators = {
        anulacionesRepetidas: row.anulaciones_repetidas,
        ajustesNegativos: row.ajustes_negativos,
        ventasRepetidasSku: row.ventas_repetidas_sku,
        fueraDeHorario: row.fuera_de_horario,
        alertasCriticas: row.alertas_criticas
      };
      const score = new EmployeeRiskScore(indicators).toJSON();
      return {
        usuarioId: row.usuario_id,
        nombre: `${row.nombres || ''} ${row.apellidos || ''}`.trim() || row.correo,
        correo: row.correo,
        rol: row.rol,
        ...score
      };
    }).sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre));
  }

  normalizeRange(query = {}) {
    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(today.getDate() - 6);
    const from = String(query.fechaDesde || query.fechaInicio || defaultFrom.toISOString().slice(0, 10));
    const to = String(query.fechaHasta || query.fechaFin || today.toISOString().slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new HttpError('Las fechas deben usar el formato AAAA-MM-DD.', 400);
    }
    if (new Date(`${from}T00:00:00Z`) > new Date(`${to}T00:00:00Z`)) {
      throw new HttpError('La fecha de inicio no puede ser posterior a la fecha de fin.', 400);
    }
    return { from, to };
  }
}

module.exports = FraudDetectionService;
