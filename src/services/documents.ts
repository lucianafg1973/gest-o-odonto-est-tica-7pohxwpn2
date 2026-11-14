import pb from '@/lib/pocketbase/client'

/** Tipos do fluxo do planejamento (0014) + tipos clínicos já existentes. */
export type DocFlowType = 'orcamento' | 'aprovado' | 'aceite' | 'assinado'
export type DocumentType =
  | DocFlowType
  | 'tcle'
  | 'contrato'
  | 'pos_operatorio'
  | 'orientacoes'
  | 'informativo'

export interface DocumentRecord {
  id: string
  patient: string
  document_type: DocumentType
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

/** Anexa o PDF digitalizado assinado pelo paciente num documento existente. */
export const attachSignedPdf = (id: string, file: File) => {
  const fd = new FormData()
  fd.append('pdf_file', file)
  return pb.collection('documents').update<DocumentRecord>(id, fd)
}

export const updateDocument = (id: string, data: Partial<DocumentRecord> | FormData) =>
  pb.collection('documents').update<DocumentRecord>(id, data as unknown as Partial<DocumentRecord>)
