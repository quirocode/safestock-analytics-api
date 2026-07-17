class FraudPatternRule {
  static get defaults() {
    return {
      lowAmountCancellationLimit: 20,
      lowAmountCancellationCount: 3,
      repeatedSkuSalesCount: 5,
      repeatedSkuWindowMinutes: 30,
      negativeAdjustmentCount: 3,
      sensitiveStartHour: 21,
      sensitiveEndHour: 23
    };
  }
}

module.exports = FraudPatternRule;
