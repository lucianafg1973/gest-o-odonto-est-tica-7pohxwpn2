import type { PaymentPlan, PaymentInstallment } from '@/components/planning/PaymentInfo'

/**
 * Cálculos monetários do plano de pagamento — TODOS em centavos inteiros,
 * para eliminar erros de arredondamento de ponto flutuante.
 */
export const toCents = (reais: number): number => Math.round((reais || 0) * 100)
export const fromCents = (cents: number): number => Math.round(cents) / 100

/** Divide `cents` em `count` parcelas inteiras; o resto (centavos) fica na ÚLTIMA. */
export function splitCents(cents: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count || 1))
  const base = Math.floor(cents / n)
  const remainder = cents - base * n
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? base + remainder : base))
}

export const centsIn = (list: PaymentInstallment[], kind: 'entrada' | 'parcela') =>
  list.filter((i) => i.kind === kind).reduce((s, i) => s + Math.round(i.amount * 100), 0)

export const entradaCents = (plan: PaymentPlan) => centsIn(plan.installments || [], 'entrada')

/** Saldo a parcelar (centavos): total − entradas, nunca negativo. */
export const saldoCents = (plan: PaymentPlan, total: number) =>
  Math.max(0, toCents(total) - entradaCents(plan))

/** Soma em centavos de todas as parcelas individuais (kind='parcela'). */
export const parcelasCents = (plan: PaymentPlan) => centsIn(plan.installments || [], 'parcela')

/** Selo de conferência: entrada + parcelas = total (tolerância de 1 centavo). */
export function conferencia(plan: PaymentPlan, total: number) {
  const diffCents = toCents(total) - (entradaCents(plan) + parcelasCents(plan))
  const ok = Math.abs(diffCents) <= 1
  return { ok, diffCents, direcao: diffCents > 0 ? 'faltam' : diffCents < 0 ? 'excedem' : '' }
}

export const novoId = () => `pi${Date.now()}${Math.random().toString(36).slice(2, 6)}`

export const addDaysISO = (base: string, days: number) => {
  const d = base ? new Date(`${base}T12:00:00`) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
