import pb from '@/lib/pocketbase/client'

export interface PatientRecord {
  id: string
  name: string
  email?: string
  phone: string
  birth_date?: string
  cpf?: string
  address?: string
  medical_notes?: string
  photo?: string
  created: string
  updated: string
}

export const getPatients = () =>
  pb.collection('patients').getFullList<PatientRecord>({ sort: 'name' })
export const getPatient = (id: string) => pb.collection('patients').getOne<PatientRecord>(id)
export const createPatient = (data: Partial<PatientRecord> | FormData) =>
  pb.collection('patients').create<PatientRecord>(data)
export const updatePatient = (id: string, data: Partial<PatientRecord> | FormData) =>
  pb.collection('patients').update<PatientRecord>(id, data)
export const deletePatient = (id: string) => pb.collection('patients').delete(id)

export function getPatientPhotoUrl(patient: PatientRecord) {
  if (!patient || !patient.photo) return null
  return pb.files.getURL(patient, patient.photo)
}
