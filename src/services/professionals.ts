import pb from '@/lib/pocketbase/client'

export interface ProfessionalRecord {
  id: string
  name: string
  specialty?: string
  commission_rate?: number
  user?: string
  created: string
  expand?: { user?: any }
}

export const getProfessionals = () =>
  pb.collection('professionals').getFullList<ProfessionalRecord>({ sort: 'name', expand: 'user' })
export const createProfessional = (data: Partial<ProfessionalRecord>) =>
  pb.collection('professionals').create<ProfessionalRecord>(data)
export const updateProfessional = (id: string, data: Partial<ProfessionalRecord>) =>
  pb.collection('professionals').update<ProfessionalRecord>(id, data)
export const deleteProfessional = (id: string) => pb.collection('professionals').delete(id)
