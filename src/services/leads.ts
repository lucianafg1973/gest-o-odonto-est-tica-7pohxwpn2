import pb from '@/lib/pocketbase/client'

export interface LeadRecord {
  id: string
  name: string
  phone: string
  email?: string
  source: 'instagram' | 'whatsapp' | 'anuncios' | 'indicacoes' | 'manual'
  status: 'lead' | 'avaliacao' | 'tratamento' | 'recuperado' | 'reativado'
  professional?: string
  converted_patient?: string
  notes?: string
  follow_up_date?: string
  created: string
  expand?: { professional?: any; converted_patient?: any }
}

export const getLeads = (filter?: string) =>
  pb
    .collection('leads')
    .getFullList<LeadRecord>({ filter, sort: '-created', expand: 'professional,converted_patient' })
export const createLead = (data: Partial<LeadRecord>) =>
  pb.collection('leads').create<LeadRecord>(data)
export const updateLead = (id: string, data: Partial<LeadRecord>) =>
  pb.collection('leads').update<LeadRecord>(id, data)
export const deleteLead = (id: string) => pb.collection('leads').delete(id)
