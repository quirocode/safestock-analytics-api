class EmployeeRiskScore {
  constructor(indicators = {}) {
    this.indicators = {
      anulacionesRepetidas: Number(indicators.anulacionesRepetidas || 0),
      ajustesNegativos: Number(indicators.ajustesNegativos || 0),
      ventasRepetidasSku: Number(indicators.ventasRepetidasSku || 0),
      fueraDeHorario: Number(indicators.fueraDeHorario || 0),
      alertasCriticas: Number(indicators.alertasCriticas || 0)
    };
  }

  calculate() {
    const total =
      this.indicators.anulacionesRepetidas * 15 +
      this.indicators.ajustesNegativos * 20 +
      this.indicators.ventasRepetidasSku * 10 +
      this.indicators.fueraDeHorario * 10 +
      this.indicators.alertasCriticas * 20;
    return Math.min(total, 100);
  }

  classify() {
    const score = this.calculate();
    if (score >= 80) return 'Crítico';
    if (score >= 60) return 'Alto';
    if (score >= 30) return 'Medio';
    return 'Bajo';
  }

  toJSON() {
    return { puntaje: this.calculate(), nivel: this.classify(), indicadores: this.indicators };
  }
}

module.exports = EmployeeRiskScore;
