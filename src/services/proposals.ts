import pb from '@/lib/pocketbase/client'

export interface ProposalRecord {
  id: string
  lead?: string
  patient?: string
  procedure?: string
  status: 'enviada' | 'pendente' | 'aceita' | 'recusada'
  value?: number
  sent_date?: string
  notes?: string
  created: string
  expand?: { lead?: any; patient?: any; procedure?: any }
}

export const getProposals = (filter?: string) =>
  pb
    .collection('proposals')
    .getFullList<ProposalRecord>({ filter, sort: '-created', expand: 'lead,patient,procedure' })
export const createProposal = (data: Partial<ProposalRecord>) =>
  pb.collection('proposals').create<ProposalRecord>(data)
export const updateProposal = (id: string, data: Partial<ProposalRecord>) =>
  pb.collection('proposals').update<ProposalRecord>(id, data)
