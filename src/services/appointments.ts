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

/** Tipo de entrada na agenda: consulta de paciente ou compromisso interno. */
export type AppointmentEntryKind = 'consulta' | 'compromisso'

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
  /** 'consulta' (padrão implícito nos registros antigos) | 'compromisso'. */
  entry_kind?: AppointmentEntryKind
  /** Compromisso: o "qual" (reunião, administrativo, pausa, curso…). */
  entry_title?: string
  /** Compromisso de dia inteiro (bloqueia a coluna do dia na grade). */
  is_all_day?: boolean
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

/** Duração do compromisso de dia inteiro (minutos) — cobre o expediente todo. */
export const ALL_DAY_MINUTES = 24 * 60

export const createAppointment = (data: Partial<AppointmentRecord>) =>
  pb.collection('appointments').create<AppointmentRecord>(data)

/** É compromisso interno (não é consulta de paciente)? Registros antigos: consulta. */
export function isCompromisso(app: AppointmentRecord): boolean {
  return app.entry_kind === 'compromisso'
}

/** Rótulo curto do "qual" do compromisso (fallback: Compromisso). */
export function compromissoTitulo(app: AppointmentRecord): string {
  return (app.entry_title || '').trim() || 'Compromisso'
}

const FREED_STATUSES: AppointmentStatus[] = [
  'desmarcado_clinica',
  'desmarcado_paciente',
  'remarcou',
]

/**
 * COMPROMISSO QUE FECHA O DIA: compromisso interno de DIA INTEIRO e ainda ativo
 * (não desmarcado/remarcado). Um dia com esse compromisso tem a agenda FECHADA:
 * sem novos agendamentos e sem faixa "Dia todo" — o compromisso aparece na coluna.
 * Regra de escopo (igual à grade): compromisso SEM profissional fecha para todos;
 * COM profissional fecha só para ele.
 */
export function compromissoQueFechaDia(
  appointments: AppointmentRecord[],
  dateISO: string,
  professionalId?: string,
): AppointmentRecord | null {
  return (
    appointments.find((a) => {
      if (!isCompromisso(a) || !a.is_all_day) return false
      if (FREED_STATUSES.includes(a.status)) return false
      if ((a.date || '').slice(0, 10) !== dateISO) return false
      if (professionalId !== undefined && a.professional && a.professional !== professionalId)
        return false
      return true
    }) || null
  )
}

/** "14:00" → 840 (uso interno dos helpers de bloqueio). */
const toMinBloqueio = (t?: string): number => {
  const [h, m] = (t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * COMPROMISSO QUE BLOQUEIA HORÁRIO: compromisso interno COM horário específico
 * (não dia inteiro) e ainda ativo (não desmarcado/remarcado), cujo intervalo
 * sobrepõe o slot dado. Os horários cobertos ficam FECHADOS na grade (hachura +
 * cadeado): sem novos agendamentos ali, clique abre a edição do compromisso.
 * Regra de escopo (igual ao fechamento do dia): compromisso SEM profissional
 * bloqueia para todos; COM profissional bloqueia só a coluna dele. Na visão de
 * semana (coluna = dia, todos juntos) NÃO passe professionalId: qualquer
 * compromisso do dia bloqueia o intervalo na coluna do dia.
 */
export function compromissoQueBloqueiaHorario(
  appointments: AppointmentRecord[],
  dateISO: string,
  slotStartMin: number,
  slotEndMin: number,
  professionalId?: string,
): AppointmentRecord | null {
  return (
    appointments.find((a) => {
      if (!isCompromisso(a) || a.is_all_day) return false
      if (FREED_STATUSES.includes(a.status)) return false
      if ((a.date || '').slice(0, 10) !== dateISO) return false
      if (professionalId !== undefined && a.professional && a.professional !== professionalId)
        return false
      const s = toMinBloqueio(a.start_time)
      const rawEnd = toMinBloqueio(a.end_time)
      const e = rawEnd > s ? rawEnd : s + 40
      return slotStartMin < e && slotEndMin > s
    }) || null
  )
}

/**
 * Calcula o horário de fim a partir do início e da duração (minutos).
 * Duração mínima = slot da grade (30 min); nunca fim ≤ início.
 */
export function computeEndTime(startTime: string, durationMin: number): string {
  const [h, m] = (startTime || '09:00').split(':').map(Number)
  const start = (h || 0) * 60 + (m || 0)
  const dur = Math.max(30, Math.round(durationMin || 0))
  const end = start + dur
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

/** Duração padrão de uma consulta nova (minutos) quando o usuário não informa o fim. */
export const DEFAULT_APPOINTMENT_DURATION = 40

/** "09:20" + 40 → "10:00". Minutos podem ser negativos; o resultado fica em 00:00–23:59. */
export function addMin(time: string, minutes: number): string {
  const [h, m] = (time || '00:00').split(':').map(Number)
  const total = ((h || 0) * 60 + (m || 0) + minutes) % 1440
  const wrapped = (total + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

/** Duração em minutos entre início e fim (fallback: 40 min quando o fim falta/é inválido). */
export function durationMinutes(app: Pick<AppointmentRecord, 'start_time' | 'end_time'>): number {
  if (!app.end_time) return 40
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const d = toMin(app.end_time) - toMin(app.start_time || '09:00')
  return d > 0 ? d : 40
}

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
