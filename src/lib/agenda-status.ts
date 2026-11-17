/**
 * Utilitários da agenda: status, aniversariantes, mensagem de aniversário e indicadores.
 * Importado por src/pages/Agenda.tsx.
 */
import {
  AppointmentRecord,
  STATUS_LABELS,
  isCompromisso,
  type AppointmentStatus,
} from '@/services/appointments'
import type { PatientRecord } from '@/services/patients'
import { createMessageRecord } from '@/services/messages'

const BIRTHDAY_MESSAGE_KEY = 'lfg_birthday_message_v1'

/** Texto EXATO inicial do modelo — editável, persistido em localStorage. */
export const DEFAULT_BIRTHDAY_MESSAGE =
  'Olá, {primeiro_nome}! 🎉 A equipe do LFG Clinic deseja a você um feliz aniversário! Que seu novo ciclo seja repleto de saúde, alegrias e muitos motivos para sorrir. 💛'

export function getBirthdayMessageTemplate(): string {
  try {
    return localStorage.getItem(BIRTHDAY_MESSAGE_KEY) || DEFAULT_BIRTHDAY_MESSAGE
  } catch {
    return DEFAULT_BIRTHDAY_MESSAGE
  }
}

export function setBirthdayMessageTemplate(tpl: string) {
  try {
    localStorage.setItem(BIRTHDAY_MESSAGE_KEY, tpl)
  } catch {
    /* ignore */
  }
}

/** Ano bissexto gregoriano. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * MM-DD efetivo do aniversário em `year`, com a regra de 29 de fevereiro
 * (anos não bissextos → 28/02 por padrão; configurável para 01/03).
 */
export function birthdayMonthDay(
  birthDate: string | undefined,
  year: number,
  leapTo: '0228' | '0301' = '0228',
): string | null {
  if (!birthDate || birthDate.length < 10) return null
  const mmdd = birthDate.slice(5, 10)
  if (mmdd === '02-29' && !isLeapYear(year)) return leapTo
  return mmdd
}

function todayParts() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

export type BirthdayScope = 'day' | 'week' | 'month'

export interface BirthdayPatient {
  patient: PatientRecord
  /** MM-DD do aniversário considerado. */
  monthDay: string
  /** Idade que fará no aniversário do ano corrente. */
  turningAge?: number
  scope: BirthdayScope
}

/** Lista de aniversariantes dentro do escopo (dia / semana / mês), com regra 29/02→28/02. */
export function getBirthdayPatients(
  patients: PatientRecord[],
  scope: BirthdayScope = 'day',
  leapTo: '0228' | '0301' = '0228',
): BirthdayPatient[] {
  const t = todayParts()
  const year = t.y
  const result: BirthdayPatient[] = []

  for (const patient of patients) {
    const mmdd = birthdayMonthDay(patient.birth_date, year, leapTo)
    if (!mmdd) continue
    const mm = parseInt(mmdd.slice(0, 2), 10)
    const dd = parseInt(mmdd.slice(3, 5), 10)
    const birthYear = parseInt((patient.birth_date || '').slice(0, 4), 10)
    const turningAge = Number.isFinite(birthYear) ? year - birthYear : undefined

    let inScope = false

    if (scope === 'day') {
      inScope = mm === t.m && dd === t.d
    } else if (scope === 'week') {
      // Janela de 7 dias corridos a partir de hoje (trata virada de mês/ano).
      const cur = new Date(year, t.m - 1, t.d)
      const end = new Date(year, t.m - 1, t.d + 6)
      const birth = new Date(year, mm - 1, dd)
      inScope = birth >= cur && birth <= end
    } else {
      inScope = mm === t.m
    }

    if (inScope) {
      result.push({ patient, monthDay: mmdd, turningAge, scope })
    }
  }

  result.sort((a, b) => a.monthDay.localeCompare(b.monthDay))
  return result
}

export function countTodayBirthdays(patients: PatientRecord[]): number {
  return getBirthdayPatients(patients, 'day').length
}

export function phoneDigits(phone: string | undefined): string {
  return (phone || '').replace(/\D/g, '')
}

/** Número válido para wa.me: 10–13 dígitos (DDD + número, com ou sem DDI 55). */
export function isValidWaNumber(phone: string | undefined): boolean {
  const digits = phoneDigits(phone)
  return digits.length >= 10 && digits.length <= 13
}

export function firstName(name: string | undefined): string {
  if (!name) return ''
  return name.trim().split(/\s+/)[0] || ''
}

/** Monta a mensagem final substituindo {primeiro_nome}. */
export function buildBirthdayMessage(patientName: string | undefined, tpl: string): string {
  return tpl.split('{primeiro_nome}').join(firstName(patientName) || 'cliente')
}

/**
 * Abre o WhatsApp (wa.me) com a mensagem personalizada. Apenas abre — NÃO registra envio.
 * Respeita a preferência de comunicação (LGPD): retorna 'bloqueado' se o paciente optou por não receber.
 */
export function openWhatsAppWithMessage(
  phone: string | undefined,
  message: string,
  commPref?: string,
): 'ok' | 'invalid' | 'bloqueado' {
  if (commPref === 'bloqueado') return 'bloqueado'
  if (!isValidWaNumber(phone)) return 'invalid'
  const digits = phoneDigits(phone)
  const full = digits.startsWith('55') ? digits : '55' + digits
  const url = `https://wa.me/${full}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
  return 'ok'
}

/** Registra manualmente "Mensagem enviada" com data e usuário responsável. */
export async function registerBirthdayMessageSent(
  patientId: string,
  message: string,
  userName: string,
): Promise<void> {
  await createMessageRecord({
    patient: patientId,
    message_type: 'aniversario',
    content: `${message}\n— Enviada por: ${userName}`,
    sent: true,
    sent_date: new Date().toISOString(),
  })
}

export function currentUserName(user: any): string {
  return user?.name || user?.email || 'Usuário'
}

export function statusLabel(s: AppointmentStatus): string {
  return STATUS_LABELS[s] || s
}

/** Indicadores de comparecimento — denominadores explícitos. */
export interface AttendanceIndicators {
  agendados: number
  confirmados: number
  atendidos: number
  faltas: number
  desmarcadosClinica: number
  desmarcadosPaciente: number
  remarcacoes: number
  /** comparecimento = atendidos ÷ (atendidos + faltas); null quando denominador = 0 */
  attendanceRate: number | null
  /** faltas = faltas ÷ (atendidos + faltas); null quando denominador = 0 */
  absenceRate: number | null
}

export function computeIndicators(appointments: AppointmentRecord[]): AttendanceIndicators {
  const count = (s: AppointmentStatus) => appointments.filter((a) => a.status === s).length
  const atendidos = count('concluido')
  const faltas = count('faltou')
  const base = atendidos + faltas

  return {
    agendados: count('agendado'),
    confirmados: count('confirmado'),
    atendidos,
    faltas,
    desmarcadosClinica: count('desmarcado_clinica'),
    desmarcadosPaciente: count('desmarcado_paciente'),
    remarcacoes: count('remarcou'),
    attendanceRate: base > 0 ? atendidos / base : null,
    absenceRate: base > 0 ? faltas / base : null,
  }
}

/** Horário liberado: desmarcados/remarcados não bloqueiam novo agendamento. */
export function isSlotFree(app: AppointmentRecord): boolean {
  return ['desmarcado_clinica', 'desmarcado_paciente', 'remarcou'].includes(app.status)
}

/** Já existe agendamento ATIVO (não desmarcado) nesse paciente+data+hora? */
export function hasActiveAppointmentAt(
  appointments: AppointmentRecord[],
  patientId: string,
  date: string,
  time: string,
  ignoreId?: string,
): boolean {
  return appointments.some(
    (a) =>
      a.id !== ignoreId &&
      a.patient === patientId &&
      (a.date || '').slice(0, 10) === date &&
      a.start_time === time &&
      !isSlotFree(a),
  )
}

/** Período para os filtros de indicadores. */
export type PeriodFilter = 'day' | 'week' | 'month' | 'all'

/**
 * Compromissos de DIA INTEIRO que FECHAM a agenda, indexados por data (ISO).
 * Não existe mais faixa "Dia todo": o compromisso de dia inteiro fecha o dia
 * (só do profissional dele quando tem profissional; de todos quando não tem).
 */
export function allDayClosuresByDate(
  appointments: AppointmentRecord[],
): Map<string, AppointmentRecord[]> {
  const map = new Map<string, AppointmentRecord[]>()
  for (const a of appointments) {
    if (!isCompromisso(a) || !a.is_all_day) continue
    if (isSlotFree(a)) continue
    const k = (a.date || '').slice(0, 10)
    if (!k) continue
    const arr = map.get(k)
    if (arr) arr.push(a)
    else map.set(k, [a])
  }
  return map
}

/**
 * O compromisso que FECHA a agenda em dateISO para a coluna do profissional dado
 * ('' = sem profissional / visão semana): clinicas (sem profissional) fecham para
 * todos; com profissional, fecha só a coluna dele.
 */
export function agendaFechada(
  closures: Map<string, AppointmentRecord[]>,
  dateISO: string,
  professionalId: string,
): AppointmentRecord | null {
  return (
    (closures.get(dateISO) || []).find(
      (a) => !a.professional || a.professional === professionalId,
    ) || null
  )
}

/** Filtra agendamentos por período (dia selecionado / semana / mês correntes). */
export function filterByPeriod(
  appointments: AppointmentRecord[],
  period: PeriodFilter,
  refDate: string,
): AppointmentRecord[] {
  if (period === 'all') return appointments
  const ref = new Date(refDate + 'T00:00:00')
  if (Number.isNaN(ref.getTime())) return appointments

  return appointments.filter((a) => {
    const d = new Date((a.date || '').slice(0, 10) + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return false
    if (period === 'day') return d.getTime() === ref.getTime()
    if (period === 'week') {
      const day = 24 * 60 * 60 * 1000
      const dow = (ref.getDay() + 6) % 7 // segunda = 0
      const start = new Date(ref.getTime() - dow * day)
      const end = new Date(start.getTime() + 6 * day)
      return d >= start && d <= end
    }
    // month
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  })
}
