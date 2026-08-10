import pb from '@/lib/pocketbase/client'

export interface ImageRecord {
  id: string
  patient: string
  image_type: 'facial' | 'corporal' | 'dental' | 'radiologica'
  file: string
  caption?: string
  created: string
}

export const getPatientImages = (patientId: string) =>
  pb.collection('images').getFullList<ImageRecord>({
    filter: `patient = "${patientId}"`,
    sort: '-created',
  })

export const uploadPatientImage = (formData: FormData) =>
  pb.collection('images').create<ImageRecord>(formData)

export function getImageUrl(record: ImageRecord) {
  if (!record || !record.file) return ''
  return pb.files.getURL(record, record.file)
}
