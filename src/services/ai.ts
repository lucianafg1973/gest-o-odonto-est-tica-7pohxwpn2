import pb from '@/lib/pocketbase/client'

export async function askAssistant(message: string, conversationId?: string | null) {
  return pb.send<{ conversation_id: string; content: string; message_id: string }>(
    '/backend/v1/ai/assistant/chat',
    {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId }),
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

export async function generateAiDocument(
  patientName: string,
  documentType: string,
  procedureName: string,
) {
  return pb.send<{ content: string }>('/backend/v1/ai/documents/generate', {
    method: 'POST',
    body: JSON.stringify({ patientName, documentType, procedureName }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function generateAiReport(summaryData: any) {
  return pb.send<{ report: string }>('/backend/v1/ai/report', {
    method: 'POST',
    body: JSON.stringify({ summary: summaryData }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getLfgIntelligence() {
  return pb.send<{ report: string }>('/backend/v1/ai/lfg-intelligence', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
}
