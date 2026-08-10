export interface PriceComponents {
  clinical_hour_value: number
  duration_minutes: number
  card_fee_percent: number
  ir_percent: number
  material_cost: number
  sales_commission_percent: number
  executor_percent: number
  rework_cost: number
  lab_price: number
}

export function calculateClinicalHourPortion(
  clinicalHourValue: number,
  durationMinutes: number,
): number {
  return clinicalHourValue * (durationMinutes / 60)
}

export function calculateFinalPrice(c: PriceComponents): number {
  const chp = calculateClinicalHourPortion(c.clinical_hour_value, c.duration_minutes)
  const base = chp + (c.material_cost || 0) + (c.lab_price || 0) + (c.rework_cost || 0)
  const feePercent =
    (c.card_fee_percent || 0) +
    (c.ir_percent || 0) +
    (c.sales_commission_percent || 0) +
    (c.executor_percent || 0)
  const fees = (base * feePercent) / 100
  return base + fees
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}
