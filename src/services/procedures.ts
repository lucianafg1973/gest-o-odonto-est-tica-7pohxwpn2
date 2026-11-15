import pb from '@/lib/pocketbase/client'

export interface ProcedureRecord {
  id: string
  name: string
  category: 'dentista' | 'estetica' | 'harmonizacao'
  description?: string
  price?: number
  duration_minutes?: number
  pre_op_instructions?: string
  post_op_instructions?: string
  card_fee_percent?: number
  ir_percent?: number
  material_cost?: number
  sales_commission_percent?: number
  executor_percent?: number
  rework_cost?: number
  lab_price?: number
  use_manual_price?: boolean
  manual_price?: number
  computed_price?: number
  /** Tabela de Procedimentos e Preços — migração 0016 */
  external_code?: string
  specialty?: string
  family?: string
  executor_cost?: number
  other_direct_cost?: number
  tax_percent?: number
  min_margin_percent?: number
  target_margin_percent?: number
  planned_discount_percent?: number
  max_discount_percent?: number
  import_batch?: string
  import_status?: string
  observations?: string
  active?: boolean
  history?: { at: string; by: string; field: string; from: unknown; to: unknown }[]
}

export const deleteProcedure = (id: string) => pb.collection('procedures').delete(id)

export const getProcedures = () =>
  pb.collection('procedures').getFullList<ProcedureRecord>({ sort: 'name' })

/** Histórico interno de alterações de preço/custos (sem segunda tabela). */
export async function updateProcedureWithHistory(
  procedure: ProcedureRecord,
  data: Partial<ProcedureRecord>,
  userName: string,
): Promise<ProcedureRecord> {
  const tracked: (keyof ProcedureRecord)[] = [
    'price',
    'material_cost',
    'lab_price',
    'executor_cost',
  ]
  const entries = Object.entries(data).filter(([k]) =>
    tracked.includes(k as keyof ProcedureRecord),
  ) as [string, unknown][]
  const oldEntries: ProcedureRecord['history'] = Array.isArray(procedure.history)
    ? procedure.history
    : []
  const changes = entries
    .map(([field, to]) => {
      const from = (procedure as unknown as Record<string, unknown>)[field]
      if (Number(from) === Number(to)) return null
      return { at: new Date().toISOString(), by: userName, field, from, to }
    })
    .filter(Boolean) as ProcedureRecord['history']
  const history = changes && changes.length ? [...oldEntries, ...changes].slice(-100) : oldEntries
  return updateProcedure(procedure.id, { ...data, history })
}

export const createProcedure = (data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').create<ProcedureRecord>(data)

export const updateProcedure = (id: string, data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').update<ProcedureRecord>(id, data)
