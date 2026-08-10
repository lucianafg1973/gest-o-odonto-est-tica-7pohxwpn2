import pb from '@/lib/pocketbase/client'

export interface ConversationRecord {
  id: string
  patient?: string
  lead?: string
  channel: 'whatsapp' | 'instagram' | 'telefone' | 'presencial'
  message_text: string
  direction: 'entrada' | 'saida'
  created: string
  expand?: { patient?: any; lead?: any }
}

export const getConversations = (filter?: string) =>
  pb
    .collection('conversations')
    .getFullList<ConversationRecord>({ filter, sort: '-created', expand: 'patient,lead' })
export const createConversation = (data: Partial<ConversationRecord>) =>
  pb.collection('conversations').create<ConversationRecord>(data)
