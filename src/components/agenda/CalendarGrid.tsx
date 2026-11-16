/**
 * Grade de calendário da agenda (estilo Google Agenda):
 * - Dia: coluna por profissional, horários em fileiras
 * - Semana: dias como colunas, agendamentos por hora
 * - Mês: delegado a MonthView
 * Nova VISUALIZAÇÃO da mesma agenda (coleção appointments) — não cria coleção nova.
 * Expediente comercial vem da coleção `work_schedule` (banco), com fallback 08:00–19:00.
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AppointmentStatusBadge from '@/components/agenda/AppointmentStatusBadge'
import MonthView from '@/components/agenda/MonthView'
import { AppointmentChip, groupChips } from '@/components/agenda/CalendarGridChips'
import { getWorkSchedule, saveWorkSchedule, DEFAULT_WORK_SCHEDULE } from '@/services/work_schedule'
import {
  STATUS_LABELS,
  type AppointmentRecord,
  type AppointmentStatus,
} from '@/services/appointments'
import { isSlotFree } from '@/lib/agenda-status'
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  type AppointmentCategory,
} from '@/lib/appointment-category'
import { cn } from '@/lib/utils'

export type GridPeriod = 'day' | 'week' | 'month'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const SLOT_MIN = 30

/** "09:00" → 540 */
export function timeToMin(t: string): number {
  const [h, m] = (t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** 540 → "09:00" */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Segunda-feira da semana da data. */
function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7 // seg = 0
  r.setDate(r.getDate() - dow)
  return r
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface Props {
  appointments: AppointmentRecord[]
  professionals: { id: string; name: string; specialty?: string }[]
  /** Profissionais selecionados no filtro multi-seleção (vazio = Todos). */
  selectedProfessionalIds?: string[]
  initialPeriod?: GridPeriod
  initialDate?: string
  onCreateAt: (opts: { date: string; time: string; professionalId: string }) => void
  onStatusSelect: (app: AppointmentRecord, s: AppointmentStatus) => void
  onRequestCancel: (app: AppointmentRecord, kind: 'clinica' | 'paciente') => void
  onReschedule: (app: AppointmentRecord) => void
  onEdit: (app: AppointmentRecord) => void
  onWhatsApp: (app: AppointmentRecord) => void
}

export default function CalendarGrid({
  appointments,
  professionals,
  selectedProfessionalIds = [],
  initialPeriod = 'day',
  initialDate,
  onCreateAt,
  onStatusSelect,
  onRequestCancel,
  onReschedule,
  onEdit,
  onWhatsApp,
}: Props) {
  const today = new Date()
  const [period, setPeriod] = useState<GridPeriod>(initialPeriod)
  const [cursor, setCursor] = useState<Date>(() => {
    const d = initialDate ? new Date(initialDate + 'T00:00:00') : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  })
  // Expediente por dia da semana (0=dom … 6=sáb) — carregado do banco, fallback padrão.
  const [schedule, setSchedule] = useState<Record<number, { start: number; end: number }>>(
    () => DEFAULT_WORK_SCHEDULE,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsDow, setSettingsDow] = useState(1)
  const [settingsStart, setSettingsStart] = useState('08:00')
  const [settingsEnd, setSettingsEnd] = useState('19:00')
  const [detail, setDetail] = useState<AppointmentRecord | null>(null)

  useEffect(() => {
    if (initialDate) {
      const d = new Date(initialDate + 'T00:00:00')
      if (!Number.isNaN(d.getTime())) setCursor(d)
    }
  }, [initialDate])

  useEffect(() => {
    let alive = true
    getWorkSchedule()
      .then((s) => {
        if (alive) setSchedule(s)
      })
      .catch(() => {
        /* fallback para o padrão já em useState */
      })
    return () => {
      alive = false
    }
  }, [])

  const buckets = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>()
    for (const app of appointments) {
      const dateKey = (app.date || '').slice(0, 10)
      if (!dateKey) continue
      const key = `${dateKey}T${(app.start_time || '').slice(0, 5)}`
      const arr = map.get(key)
      if (arr) arr.push(app)
      else map.set(key, [app])
    }
    return map
  }, [appointments])

  /** Dias exibidos: 1 (dia) ou 7 (semana). */
  const days: Date[] = useMemo(() => {
    if (period === 'day') return [cursor]
    if (period === 'week') {
      const start = startOfWeek(cursor)
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    return []
  }, [period, cursor])

  // Expediente do(s) dia(s) em exibição: define as fileiras da grade.
  const work = useMemo(() => {
    if (period === 'week') {
      let start = Infinity
      let end = 0
      for (const d of days) {
        const s = schedule[d.getDay()] || DEFAULT_WORK_SCHEDULE[d.getDay()]
        start = Math.min(start, s.start)
        end = Math.max(end, s.end)
      }
      if (!Number.isFinite(start) || end <= start) return { start: 8 * 60, end: 19 * 60 }
      return { start, end }
    }
    const s = schedule[cursor.getDay()] || DEFAULT_WORK_SCHEDULE[cursor.getDay()]
    return { start: s.start, end: s.end }
  }, [period, cursor, days, schedule])

  const slots = useMemo(() => {
    const out: number[] = []
    for (let m = work.start; m < work.end; m += SLOT_MIN) out.push(m)
    return out
  }, [work])

  const shift = (n: number) => {
    if (period === 'day') setCursor((c) => addDays(c, n))
    else if (period === 'week') setCursor((c) => addDays(c, 7 * n))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1))
  }

  const goToday = () => setCursor(new Date())

  const label =
    period === 'day'
      ? cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      : period === 'week'
        ? `${days[0]?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${days[6]?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
        : `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`

  const openSettings = () => {
    const s = schedule[cursor.getDay()] || DEFAULT_WORK_SCHEDULE[cursor.getDay()]
    setSettingsDow(cursor.getDay())
    setSettingsStart(minToTime(s.start))
    setSettingsEnd(minToTime(s.end))
    setSettingsOpen(true)
  }

  const applySettings = async () => {
    const s = timeToMin(settingsStart)
    const e = timeToMin(settingsEnd)
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) {
      setSettingsOpen(false)
      return
    }
    // Otimista na UI; persiste no banco (coleção work_schedule).
    setSchedule((prev) => ({ ...prev, [settingsDow]: { start: s, end: e } }))
    setSettingsOpen(false)
    try {
      const saved = await saveWorkSchedule(settingsDow, { start: s, end: e })
      setSchedule((prev) => ({ ...prev, [settingsDow]: saved }))
    } catch {
      // sem persistência (ex.: sem permissão) — mantém o valor aplicado na sessão
    }
  }

  /**
   * Colunas de profissionais na visão dia — respeita o filtro multi-seleção
   * (com seleção, só entram as colunas dos escolhidos; sem seleção, todas).
   * Sem profissionais cadastrados, cai numa coluna única "Sem profissional".
   */
  const cols =
    period === 'day'
      ? professionals.length > 0
        ? selectedProfessionalIds.length > 0
          ? professionals.filter((p) => selectedProfessionalIds.includes(p.id))
          : professionals
        : [{ id: '', name: 'Sem profissional' }]
      : []

  const nCols = period === 'day' ? cols.length : days.length
  const gridCols = `56px repeat(${nCols}, minmax(0,1fr))`

  return (
    <div className="space-y-3">
      {/* Toolbar: navegação + período + expediente */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-[#EDE3D8] rounded-xl p-2 shadow-subtle">
        <Button size="sm" variant="outline" onClick={() => shift(-1)} className="h-8 w-8 p-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={goToday} className="h-8 text-xs">
          Hoje
        </Button>
        <Button size="sm" variant="outline" onClick={() => shift(1)} className="h-8 w-8 p-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="font-serif-title text-sm text-[#2D1B14] capitalize ml-1 min-w-0 truncate">
          {label}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1 bg-[#FAF6F0] p-1 rounded-lg border border-[#EDE3D8]">
          {(['day', 'week', 'month'] as GridPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                period === p
                  ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                  : 'bg-white text-[#6B4F42] border-[#EDE3D8] hover:bg-[#FFF3D6]'
              }`}
            >
              {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={openSettings} className="h-8 text-xs">
          <Settings2 className="w-3.5 h-3.5 mr-1" /> Expediente
        </Button>
      </div>

      {/* Legenda de cores por categoria de tratamento */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-white border border-[#EDE3D8] rounded-xl px-3 py-1.5 shadow-subtle">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B4F42]">
          Categorias:
        </span>
        {(Object.keys(CATEGORY_LABELS) as AppointmentCategory[]).map((cat) => (
          <span key={cat} className="flex items-center gap-1 text-[10px] text-[#6B4F42]">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_STYLES[cat].dot}`} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>

      {/* ============ VISÃO MÊS ============ */}
      {period === 'month' && (
        <MonthView
          cursor={cursor}
          appointments={appointments}
          today={today}
          onOpenDay={(iso) => {
            setCursor(new Date(iso + 'T00:00:00'))
            setPeriod('day')
          }}
          onCreateAt={onCreateAt}
        />
      )}

      {/* ============ VISÃO DIA/SEMANA ============ */}
      {period !== 'month' && (
        <div className="border border-[#EDE3D8] rounded-xl bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: period === 'day' ? Math.max(640, nCols * 170) : 780 }}>
              {/* Cabeçalho de colunas */}
              <div
                className="grid border-b border-[#EDE3D8] sticky top-0 bg-white z-10"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="p-2 text-[10px] text-[#6B4F42] border-r border-[#EDE3D8]">
                  Horário
                </div>
                {period === 'day'
                  ? cols.map((p) => (
                      <div
                        key={p.id || 'none'}
                        className="p-2 text-center border-r last:border-r-0 border-[#EDE3D8]"
                      >
                        <p className="text-xs font-semibold text-[#2D1B14] truncate">{p.name}</p>
                        {p.specialty && (
                          <p className="text-[10px] text-[#6B4F42] truncate">{p.specialty}</p>
                        )}
                      </div>
                    ))
                  : days.map((d) => {
                      const iso = toISO(d)
                      const n = appointments.filter(
                        (a) => (a.date || '').slice(0, 10) === iso && !isSlotFree(a),
                      ).length
                      return (
                        <div
                          key={iso}
                          className={cn(
                            'p-2 text-center border-r last:border-r-0 border-[#EDE3D8]',
                            isSameDay(d, today) && 'bg-[#FFF3D6]',
                          )}
                        >
                          <p className="text-[10px] text-[#6B4F42] uppercase">
                            {WEEKDAYS[(d.getDay() + 6) % 7]}
                          </p>
                          <p
                            className={cn(
                              'text-sm font-bold',
                              isSameDay(d, today) ? 'text-[#C66B4D]' : 'text-[#2D1B14]',
                            )}
                          >
                            {d.getDate()}
                          </p>
                          {n > 0 && (
                            <p className="text-[10px] text-[#6B4F42]">
                              {n} {n === 1 ? 'consulta' : 'consultas'}
                            </p>
                          )}
                        </div>
                      )
                    })}
              </div>

              {/* Corpo da grade: fileiras de horários */}
              <div>
                {slots.map((min) => {
                  const time = minToTime(min)
                  return (
                    <div
                      key={min}
                      className="grid border-b last:border-b-0 border-[#EDE3D8]/60"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <div className="px-1 py-1.5 text-[10px] text-[#6B4F42] text-right border-r border-[#EDE3D8]">
                        {time}
                      </div>
                      {period === 'day'
                        ? cols.map((p) => {
                            const iso = toISO(cursor)
                            const bucket = buckets.get(`${iso}T${time}`)
                            return (
                              <SlotCell
                                key={p.id || 'none'}
                                dateISO={iso}
                                time={time}
                                professionalId={p.id}
                                bucket={bucket}
                                chips={groupChips(appointments, iso, p.id, slots, work.end).filter(
                                  (g) => g.row === slots.indexOf(min),
                                )}
                                onCreateAt={onCreateAt}
                                onOpenDetail={setDetail}
                              />
                            )
                          })
                        : days.map((d) => {
                            const diso = toISO(d)
                            const bucket = buckets.get(`${diso}T${time}`)
                            return (
                              <SlotCell
                                key={diso}
                                dateISO={diso}
                                time={time}
                                professionalId=""
                                bucket={bucket}
                                chips={groupChips(appointments, diso, '', slots, work.end).filter(
                                  (g) => g.row === slots.indexOf(min),
                                )}
                                onCreateAt={onCreateAt}
                                onOpenDetail={setDetail}
                              />
                            )
                          })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe do agendamento ao clicar no chip da grade */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#C66B4D]" /> Detalhe da consulta
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 py-1">
              <div className="text-xs bg-[#FAF6F0] border border-[#EDE3D8] rounded-lg p-3 space-y-0.5 text-[#6B4F42]">
                <p className="font-semibold text-sm text-[#2D1B14]">
                  {detail.expand?.patient?.name || 'Paciente'}
                </p>
                <p>{detail.expand?.procedure?.name || 'Atendimento Geral'}</p>
                <p>
                  {(detail.date || '').slice(0, 10)} das {detail.start_time}
                  {detail.end_time ? ` às ${detail.end_time}` : ''}
                  {detail.expand?.professional?.name ? ` — ${detail.expand.professional.name}` : ''}
                </p>
                {detail.notes && <p className="whitespace-pre-wrap">{detail.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AppointmentStatusBadge
                  status={detail.status}
                  patientName={detail.expand?.patient?.name || 'Paciente'}
                  onStatusSelect={(s) => {
                    onStatusSelect(detail, s)
                    setDetail(null)
                  }}
                  onRequestCancel={(kind) => {
                    onRequestCancel(detail, kind)
                    setDetail(null)
                  }}
                />
                <span className="text-[11px] text-[#6B4F42]">
                  Status atual: {STATUS_LABELS[detail.status]}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    onEdit(detail)
                    setDetail(null)
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    onReschedule(detail)
                    setDetail(null)
                  }}
                >
                  Remarcar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    onWhatsApp(detail)
                    setDetail(null)
                  }}
                >
                  Lembrete WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Célula de horário da grade: mostra chips dos agendamentos ou fica clicável (horário livre). */
function SlotCell({
  dateISO,
  time,
  professionalId,
  bucket,
  chips,
  onCreateAt,
  onOpenDetail,
}: {
  dateISO: string
  time: string
  professionalId: string
  bucket: AppointmentRecord[] | undefined
  chips: { row: number; span: number; apps: AppointmentRecord[] }[]
  onCreateAt: (opts: { date: string; time: string; professionalId: string }) => void
  onOpenDetail: (app: AppointmentRecord) => void
}) {
  const apps = bucket || []
  const freed = apps.filter((a) => isSlotFree(a))
  // A célula fica clicável quando NENHUM chip começa nela (chips longos ocupam
  // várias fileiras, mas a célula de origem é a única que abre o "+ agendar").
  const clickable = chips.length === 0

  return (
    <div
      className={cn(
        'relative border-r last:border-r-0 border-[#EDE3D8] px-1 py-1 min-h-[2.25rem] group',
        clickable && 'cursor-pointer hover:bg-[#FFF3D6]/60',
      )}
      onClick={() => {
        if (clickable) onCreateAt({ date: dateISO, time, professionalId })
      }}
      title={clickable ? `${dateISO} ${time} — clique para agendar` : undefined}
    >
      {chips.map((g) =>
        g.apps.map((app) => (
          <AppointmentChip key={app.id} app={app} span={g.span} onOpenDetail={onOpenDetail} />
        )),
      )}
      {chips.length === 0 && freed.length > 0 && (
        <span className="text-[9px] text-[#6B4F42]/70 italic block leading-tight">
          livre ({freed.length === 1 ? 'horário liberado' : `${freed.length} liberados`})
        </span>
      )}
      {clickable && (
        <span className="hidden group-hover:block absolute right-1 top-1 text-[9px] text-[#C66B4D] font-semibold pointer-events-none">
          + agendar
        </span>
      )}
    </div>
  )
}
