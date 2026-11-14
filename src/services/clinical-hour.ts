import pb from '@/lib/pocketbase/client'

export interface ClinicalHourConfig {
  id: string
  monthly_operating_cost: number
  available_clinical_hours: number
  clinical_hour_value: number
  period: string
  last_updated?: string
  /** Capacidade produtiva editável — migração 0016 */
  rooms_count?: number
  hours_per_day?: number
  days_per_month?: number
  idle_percent?: number
  evaluation_extra_percent?: number
  available_hours?: number
  productive_hours?: number
  hour_cost?: number
  minute_cost?: number
}

export interface CostItemRecord {
  id: string
  description: string
  group: 'operacional' | 'pessoal' | 'provisao' | 'reserva'
  category?: string
  amount: number
  period_month?: string
  active: boolean
  created: string
  updated: string
}

export const getClinicalHourConfig = async (): Promise<ClinicalHourConfig | null> => {
  const list = await pb.collection('clinical_hour_config').getFullList<ClinicalHourConfig>({
    sort: '-period',
  })
  return list[0] || null
}

export const updateClinicalHourConfig = async (id: string, data: Partial<ClinicalHourConfig>) =>
  pb.collection('clinical_hour_config').update<ClinicalHourConfig>(id, data)

export const getCostItems = async (periodMonth?: string) => {
  const filter = periodMonth ? `period_month="${periodMonth}"` : 'id != ""'
  return pb
    .collection('clinic_cost_items')
    .getFullList<CostItemRecord>({ filter, sort: 'group,description' })
}

export const createCostItem = (data: Partial<CostItemRecord>) =>
  pb.collection('clinic_cost_items').create<CostItemRecord>(data)

export const updateCostItem = (id: string, data: Partial<CostItemRecord>) =>
  pb.collection('clinic_cost_items').update<CostItemRecord>(id, data)

export const deleteCostItem = (id: string) => pb.collection('clinic_cost_items').delete(id)

/**
 * Recalcula a capacidade produtiva e a hora clínica a partir dos custos da
 * planilha + campos editáveis. Horas produtivas = disponíveis × (1 − ociosidade).
 * O fator adicional de avaliação, quando usado, AUMENTA o custo/hora (divide as
 * horas produtivas) — aplicado UMA única vez, nunca em duplicidade.
 */
export function calcularHoraClinica(
  custosMensais: number,
  config: Pick<ClinicalHourConfig, 'available_hours' | 'idle_percent' | 'evaluation_extra_percent'>,
): { productiveHours: number; hourCost: number; minuteCost: number } {
  const disponiveis = Number(config.available_hours) || 0
  const ociosidade = Number(config.idle_percent) || 0
  const produtorBase = disponiveis * (1 - ociosidade / 100)
  const fatorExtra = Number(config.evaluation_extra_percent) || 0
  const productiveHours = fatorExtra > 0 ? produtorBase / (1 + fatorExtra / 100) : produtorBase
  const hourCost = productiveHours > 0 ? custosMensais / productiveHours : 0
  return {
    productiveHours,
    hourCost,
    minuteCost: hourCost / 60,
  }
}

export const periodoAtual = () => new Date().toISOString().slice(0, 7)
