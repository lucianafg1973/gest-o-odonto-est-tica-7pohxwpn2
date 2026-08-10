import pb from '@/lib/pocketbase/client'

export interface ImplantRecord {
  id: string
  marca: string
  modelo: string
  tamanho?: number
  espessura?: number
  tipo?: string
  category: 'implante' | 'componente'
  description?: string
  created: string
}

export const getImplants = (filter?: string) =>
  pb.collection('implants').getFullList<ImplantRecord>({ filter, sort: 'marca' })
export const createImplant = (data: Partial<ImplantRecord>) =>
  pb.collection('implants').create<ImplantRecord>(data)
