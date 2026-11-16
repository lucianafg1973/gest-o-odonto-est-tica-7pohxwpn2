import pb from '@/lib/pocketbase/client'
import { LeadRecord } from '@/services/leads'
import { ProfessionalRecord } from '@/services/professionals'

/**
 * Acompanhamento de avaliações/fechamentos (aba Leads).
 *
 * Uma linha da planilha = uma avaliação (lead_evaluations). Campos que faltavam
 * (feedback, data de nova contatação, valor fechado) vivem aqui; "valor não
 * realizado" é derivado: max(0, valor do tratamento − valor fechado), em
 * centavos — como em src/lib/payment-calc.ts.
 */

export interface LeadEvaluationRecord {
  id: string
  lead?: string
  patient?: string
  professional?: string
  evaluation_date?: string | null
  plan_value?: number | null
  closed_value?: number | null
  feedback?: string | null
  next_contact_date?: string | null
  created: string
  updated: string
  expand?: {
    lead?: LeadRecord
    patient?: { id: string; name: string }
    professional?: ProfessionalRecord
  }
}

export const getLeadEvaluations = () =>
  pb.collection('lead_evaluations').getFullList<LeadEvaluationRecord>({
    sort: '-created',
    expand: 'lead,patient,professional',
  })

export const createLeadEvaluation = (data: Partial<LeadEvaluationRecord>) =>
  pb.collection('lead_evaluations').create<LeadEvaluationRecord>(data)

export const updateLeadEvaluation = (id: string, data: Partial<LeadEvaluationRecord>) =>
  pb.collection('lead_evaluations').update<LeadEvaluationRecord>(id, data)

export const deleteLeadEvaluation = (id: string) => pb.collection('lead_evaluations').delete(id)

/** Valor fechado em centavos (ou 0 quando vazio/não fechou). */
export const fechadoC = (e: LeadEvaluationRecord) => Math.round((Number(e.closed_value) || 0) * 100)

/** Valor do tratamento (orçamento proposto) em centavos. */
export const planC = (e: LeadEvaluationRecord) => Math.round((Number(e.plan_value) || 0) * 100)

/** Valor NÃO realizado (centavos): o que o cliente NÃO fechou — nunca negativo. */
export const abertoC = (e: LeadEvaluationRecord) => Math.max(0, planC(e) - fechadoC(e))

export interface TotaisPlanilha {
  fechadoCents: number
  abertoCents: number
  planCents: number
}

/** Somatórios da planilha — fechado total e aberto (não realizado) total. */
export const totaisPlanilha = (rows: LeadEvaluationRecord[]): TotaisPlanilha => ({
  fechadoCents: rows.reduce((s, e) => s + fechadoC(e), 0),
  abertoCents: rows.reduce((s, e) => s + abertoC(e), 0),
  planCents: rows.reduce((s, e) => s + planC(e), 0),
})

/** R$ 1.234,56 — formatação padrão da planilha (centavos → texto). */
export const brl = (cents: number) =>
  (Math.round(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

/** yyyy-mm-dd → dd/mm/aa (fallback quando a data está vazia). */
export const dataBR = (iso?: string | null) => {
  if (!iso) return '—'
  const d = iso.slice(0, 10).split('-')
  if (d.length !== 3) return '—'
  return `${d[2]}/${d[1]}/${d[0]}`
}
