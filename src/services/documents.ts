import pb from '@/lib/pocketbase/client'

export interface DocumentRecord {
  id: string
  patient: string
  document_type: 'tcle' | 'contrato' | 'pos_operatorio' | 'orientacoes' | 'informativo'
  procedure?: string
  title: string
  content?: string
  pdf_file?: string
  created: string
  expand?: {
    patient?: any
    procedure?: any
  }
}

export const getDocuments = (patientId?: string) =>
  pb.collection('documents').getFullList<DocumentRecord>({
    filter: patientId ? `patient = "${patientId}"` : '',
    sort: '-created',
    expand: 'patient,procedure',
  })

export const createDocument = (data: Partial<DocumentRecord>) =>
  pb.collection('documents').create<DocumentRecord>(data)
