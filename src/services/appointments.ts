import pb from '@/lib/pocketbase/client'

export const APPOINTMENT_STATUSES = [
  'agendado',
  'confirmado',
  'chegou',
  'em_atendimento',
  'concluido',
  'faltou',
  'desmarcado_clinica',
  'desmarcado_paciente',
  'remarcou',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  chegou: 'Paciente chegou',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  faltou: 'Faltou',
  desmarcado_clinica: 'Desmarcado pela clínica',
  desmarcado_paciente: 'Desmarcado pelo paciente',
  remarcou: 'Remarcou',
}

/** Cor de fundo + texto do badge de cada status (identificação visual clara). */
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  agendado: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  chegou: 'bg-amber-100 text-amber-900 border-amber-200',
  em_atendimento: 'bg-violet-100 text-violet-800 border-violet-200',
  concluido: 'bg-teal-100 text-teal-800 border-teal-200',
  faltou: 'bg-red-100 text-red-800 border-red-200',
  desmarcado_clinica: 'bg-orange-100 text-orange-800 border-orange-200',
  desmarcado_paciente: 'bg-pink-100 text-pink-800 border-pink-200',
  remarcou: 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

/** Chip completo (badge+dot) de cada status, usado pelo seletor da agenda. */
export const STATUS_STYLES: Record<AppointmentStatus, { chip: string; dot: string }> = {
  agendado: { chip: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  confirmado: { chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  chegou: { chip: 'bg-amber-100 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
  em_atendimento: { chip: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  concluido: { chip: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  faltou: { chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
  desmarcado_clinica: {
    chip: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  desmarcado_paciente: { chip: 'bg-pink-100 text-pink-800 border-pink-200', dot: 'bg-pink-500' },
  remarcou: { chip: 'bg-cyan-100 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500' },
}

/** Ponto colorido usado junto ao select para reforçar a identificação visual. */
export const STATUS_DOTS: Record<AppointmentStatus, string> = {
  agendado: 'bg-blue-500',
  confirmado: 'bg-emerald-500',
  chegou: 'bg-amber-500',
  em_atendimento: 'bg-violet-500',
  concluido: 'bg-teal-500',
  faltou: 'bg-red-500',
  desmarcado_clinica: 'bg-orange-500',
  desmarcado_paciente: 'bg-pink-500',
  remarcou: 'bg-cyan-500',
}

export interface RescheduleHistoryEntry {
  from_date?: string
  from_time?: string
  to_date?: string
  to_time?: string
  at?: string
  by?: string
}

export interface AppointmentStatusEventRecord {
  id: string
  appointment: string
  from_status?: string
  to_status: string
  changed_by?: string
  changed_by_user?: string
  reason?: string
  actor_kind?: 'clinica' | 'paciente' | 'sistema'
  created: string
}

export interface AppointmentRecord {
  id: string
  patient: string
  procedure?: string
  professional?: string
  date: string
  start_time: string
  end_time?: string
  status: AppointmentStatus
  notes?: string
  status_changed_by?: string
  status_changed_at?: string
  canceled_by?: string
  canceled_reason?: string
  rescheduled_from?: string
  reschedule_history?: RescheduleHistoryEntry[]
  created: string
  updated: string
  expand?: {
    patient?: any
    procedure?: any
    professional?: any
  }
}

export const getAppointments = (filter?: string) =>
  pb.collection('appointments').getFullList<AppointmentRecord>({
    filter,
    sort: 'start_time',
    expand: 'patient,procedure,professional',
  })

export const createAppointment = (data: Partial<AppointmentRecord>) =>
  pb.collection('appointments').create<AppointmentRecord>(data)

export const updateAppointment = (id: string, data: Partial<AppointmentRecord>) =>
  pb.collection('appointments').update<AppointmentRecord>(id, data)

export const deleteAppointment = (id: string) => pb.collection('appointments').delete(id)

export const getStatusEvents = (appointmentId: string) =>
  pb.collection('appointment_status_events').getFullList<AppointmentStatusEventRecord>({
    filter: `appointment = "${appointmentId}"`,
    sort: '-created',
  })

export const createStatusEvent = (data: Partial<AppointmentStatusEventRecord>) =>
  pb.collection('appointment_status_events').create<Partial<AppointmentStatusEventRecord>>(data)
