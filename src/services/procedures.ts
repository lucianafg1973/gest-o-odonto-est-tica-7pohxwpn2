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
}

export const getProcedures = () =>
  pb.collection('procedures').getFullList<ProcedureRecord>({ sort: 'name' })
export const createProcedure = (data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').create<ProcedureRecord>(data)
export const updateProcedure = (id: string, data: Partial<ProcedureRecord>) =>
  pb.collection('procedures').update<ProcedureRecord>(id, data)
