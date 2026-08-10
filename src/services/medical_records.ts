import pb from '@/lib/pocketbase/client'

export interface MedicalRecordItem {
  id: string
  patient: string
  procedure?: string
  record_date?: string
  anamnesis?: string
  diagnosis?: string
  notes?: string
  attachments?: string[]
  expand?: {
    procedure?: any
  }
  created: string
}

export const getMedicalRecordsByPatient = (patientId: string) =>
  pb.collection('medical_records').getFullList<MedicalRecordItem>({
    filter: `patient = "${patientId}"`,
    sort: '-created',
    expand: 'procedure',
  })

export const createMedicalRecord = (data: Partial<MedicalRecordItem> | FormData) =>
  pb.collection('medical_records').create<MedicalRecordItem>(data)
