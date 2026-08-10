import pb from '@/lib/pocketbase/client'

export interface MessageRecord {
  id: string
  patient: string
  message_type: 'lembrete_consulta' | 'antes_preparatorio' | 'pos_operatorio' | 'informativo'
  content?: string
  sent?: boolean
  sent_date?: string
  created: string
  expand?: {
    patient?: any
  }
}

export const getMessagesByPatient = (patientId: string) =>
  pb.collection('messages').getFullList<MessageRecord>({
    filter: `patient = "${patientId}"`,
    sort: '-created',
    expand: 'patient',
  })

export const createMessageRecord = (data: Partial<MessageRecord>) =>
  pb.collection('messages').create<MessageRecord>(data)
