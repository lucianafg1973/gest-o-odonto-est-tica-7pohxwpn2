import pb from '@/lib/pocketbase/client'

export interface AppointmentRecord {
  id: string
  patient: string
  procedure?: string
  date: string
  start_time: string
  end_time?: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'faltou' | 'cancelado'
  notes?: string
  expand?: {
    patient?: any
    procedure?: any
  }
}

export const getAppointments = (filter?: string) =>
  pb.collection('appointments').getFullList<AppointmentRecord>({
    filter,
    sort: 'start_time',
    expand: 'patient,procedure',
  })

export const createAppointment = (data: Partial<AppointmentRecord>) =>
  pb.collection('appointments').create<AppointmentRecord>(data)
export const updateAppointment = (id: string, data: Partial<AppointmentRecord>) =>
  pb.collection('appointments').update<AppointmentRecord>(id, data)
export const deleteAppointment = (id: string) => pb.collection('appointments').delete(id)
