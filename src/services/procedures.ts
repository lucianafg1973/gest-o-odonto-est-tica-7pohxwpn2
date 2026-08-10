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
}

export const getProcedures = () =>
  pb.collection('procedures').getFullList<ProcedureRecord>({ sort: 'name' })

export const createProcedure = (data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').create<ProcedureRecord>(data)

export const updateProcedure = (id: string, data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').update<ProcedureRecord>(id, data)
