/**
 * Visão mensal da grade de calendário da agenda: grade de semanas com
 * indicadores por dia. Tocar num dia abre a visão de dia (com a coluna por profissional).
 */
import { useMemo } from 'react'
import { Lock, Plus } from 'lucide-react'
import {
  STATUS_LABELS,
  isCompromisso,
  compromissoTitulo,
  compromissoQueFechaDia,
  type AppointmentRecord,
} from '@/services/appointments'
import { professionalPastel } from '@/lib/professional-colors'
import { isSlotFree } from '@/lib/agenda-status'
import { cn } from '@/lib/utils'

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface Props {
  cursor: Date
  appointments: AppointmentRecord[]
  today: Date
  onOpenDay: (iso: string) => void
  onCreateAt: (opts: { date: string; time: string; professionalId: string }) => void
}

interface CellInfo {
  iso: string
  day: number
  inMonth: boolean
  active: AppointmentRecord[]
  freedCount: number
  overflow: number
  /** Compromisso de dia inteiro que FECHA este dia (agenda fechada). */
  fechado: AppointmentRecord | null
  /** Compromissos de horário específico que BLOQUEIAM intervalos neste dia. */
  bloqueios: AppointmentRecord[]
}

export default function MonthView({ cursor, appointments, today, onOpenDay, onCreateAt }: Props) {
  const byDate = useMemo(() => {
    const map = new Map<string, { active: AppointmentRecord[]; freed: number }>()
    for (const a of appointments) {
      const k = (a.date || '').slice(0, 10)
      if (!k) continue
      let e = map.get(k)
      if (!e) {
        e = { active: [], freed: 0 }
        map.set(k, e)
      }
      if (isSlotFree(a)) e.freed++
      else e.active.push(a)
    }
    return map
  }, [appointments])

  const cells: CellInfo[] = useMemo(() => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const first = new Date(y, m, 1)
    const start = new Date(first)
    const dow = (first.getDay() + 6) % 7 // seg = 0
    start.setDate(start.getDate() - dow)
    const out: CellInfo[] = []
    let d = new Date(start)
    for (let i = 0; i < 42; i++) {
      const iso = toISO(d)
      const e = byDate.get(iso)
      // Compromissos de horário específico NÃO entram na lista de chips: viram
      // rótulo de bloqueio próprio (cadeado) acima da lista.
      const active = (e?.active || []).filter((a) => !isCompromisso(a) || a.is_all_day)
      out.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === m,
        active,
        freedCount: e?.freed || 0,
        overflow: Math.max(0, active.length - 3),
        fechado: compromissoQueFechaDia(appointments, iso),
        // Compromissos de horário específico ativos do dia (bloqueiam intervalos).
        bloqueios: e ? e.active.filter((a) => isCompromisso(a) && !a.is_all_day) : [],
      })
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    }
    return out
  }, [cursor, byDate, appointments])

  return (
    <div className="border border-[#EDE3D8] rounded-xl bg-white overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-[#EDE3D8] bg-[#FAF6F0]">
        {WEEKDAY_HEADERS.map((w) => (
          <div
            key={w}
            className="py-1.5 text-center text-[10px] font-semibold uppercase text-[#6B4F42] border-r last:border-r-0 border-[#EDE3D8]"
          >
            {w}
          </div>
        ))}
      </div>
      {/* Grade de semanas (6 linhas × 7 dias) */}
      <div className="grid grid-rows-6">
        {Array.from({ length: 6 }, (_, w) => (
          <div
            key={w}
            className="grid grid-cols-7 border-b last:border-b-0 border-[#EDE3D8] min-h-[92px]"
          >
            {cells.slice(w * 7, w * 7 + 7).map((c) => {
              const cellDate = new Date(c.iso + 'T00:00:00')
              const todayCell = isSameDay(cellDate, today)
              return (
                <div
                  key={c.iso}
                  className={cn(
                    'relative border-r last:border-r-0 border-[#EDE3D8] p-1 min-h-[92px] group/cell',
                    !c.inMonth && 'bg-[#FAF6F0]/60',
                    todayCell && 'bg-[#FFF3D6]',
                    c.fechado && 'bg-[#F5EFE7]',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenDay(c.iso)}
                      className={cn(
                        'text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center transition-colors',
                        todayCell
                          ? 'bg-[#C66B4D] text-white'
                          : c.inMonth
                            ? 'text-[#2D1B14] hover:bg-[#FFF3D6]'
                            : 'text-[#6B4F42]/50 hover:bg-[#FFF3D6]',
                      )}
                      title="Abrir dia na grade"
                    >
                      {c.day}
                    </button>
                  </div>
                  {/* BLOQUEIO PARCIAL: compromissos de horário específico (cadeado no rótulo;
                      clique abre o dia — NÃO cria agendamento). */}
                  {!c.fechado &&
                    c.bloqueios.map((b) => {
                      const pastel = professionalPastel(
                        b.professional || b.expand?.professional?.name || '',
                      )
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => onOpenDay(c.iso)}
                          className="w-full text-left border border-dashed border-[#B08968] rounded px-1 py-0.5 text-[9px] leading-tight bg-[#FAF6F0] hover:shadow-sm flex items-center gap-1"
                          title={`Horários bloqueados: ${compromissoTitulo(b)} — ${(b.start_time || '').slice(0, 5)} às ${(b.end_time || '').slice(0, 5)} — clique para abrir o dia e editar`}
                        >
                          <Lock className="w-2.5 h-2.5 shrink-0 text-[#8A6A55]" />
                          <span className="truncate font-semibold text-[#2D1B14]">
                            {compromissoTitulo(b)} {(b.start_time || '').slice(0, 5)}–
                            {(b.end_time || '').slice(0, 5)}
                          </span>
                        </button>
                      )
                    })}
                  {/* AGENDA FECHADA: rótulo do compromisso de dia inteiro (clique abre o dia) */}
                  {c.fechado && (
                    <button
                      type="button"
                      onClick={() => onOpenDay(c.iso)}
                      className="w-full text-left border border-dashed border-[#B08968] rounded px-1 py-0.5 text-[9px] leading-tight bg-[#FAF6F0] hover:shadow-sm flex items-center gap-1"
                      title={`Agenda fechada neste dia: ${compromissoTitulo(c.fechado)} — clique para abrir o dia e editar`}
                    >
                      <Lock className="w-2.5 h-2.5 shrink-0 text-[#8A6A55]" />
                      <span className="truncate font-semibold text-[#2D1B14]">
                        {compromissoTitulo(c.fechado)}
                      </span>
                      <span className="ml-auto text-[8px] text-[#8A6A55] shrink-0">Fechada</span>
                    </button>
                  )}
                  <div className="mt-0.5 space-y-0.5">
                    {c.active.slice(0, 3).map((a) => {
                      const pastel = professionalPastel(
                        a.professional || a.expand?.professional?.name || '',
                      )
                      const comp = isCompromisso(a)
                      return (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => onOpenDay(c.iso)}
                          className={cn(
                            'w-full text-left border rounded px-1 py-0.5 text-[9px] leading-tight truncate hover:shadow-sm flex items-center gap-1',
                            comp && 'border-dashed',
                          )}
                          style={
                            comp
                              ? {
                                  backgroundColor: pastel.bg,
                                  borderColor: pastel.border,
                                  color: pastel.text,
                                }
                              : {
                                  backgroundColor: pastel.bg,
                                  borderLeft: `3px solid ${pastel.border}`,
                                }
                          }
                          title={
                            comp
                              ? `${compromissoTitulo(a)} — ${a.is_all_day ? 'dia inteiro' : a.start_time}${
                                  a.expand?.professional?.name
                                    ? ` — ${a.expand.professional.name}`
                                    : ''
                                }`
                              : `${a.expand?.patient?.name || 'Paciente'} — ${
                                  a.expand?.procedure?.name || 'Atendimento Geral'
                                } — Status: ${STATUS_LABELS[a.status]}${
                                  a.expand?.professional?.name
                                    ? ` — ${a.expand.professional.name}`
                                    : ''
                                }`
                          }
                        >
                          {!comp && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: pastel.border }}
                            />
                          )}
                          <span className="truncate">
                            {comp
                              ? compromissoTitulo(a)
                              : `${a.expand?.patient?.name || 'Paciente'} · ${a.start_time}`}
                          </span>
                        </button>
                      )
                    })}
                    {c.overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenDay(c.iso)}
                        className="text-[9px] text-[#6B4F42] hover:text-[#C66B4D] block"
                      >
                        +{c.overflow} mais
                      </button>
                    )}
                    {c.active.length === 0 && c.freedCount > 0 && (
                      <span className="text-[9px] text-[#6B4F42]/70 italic">horário liberado</span>
                    )}
                  </div>
                  {c.inMonth && c.fechado && (
                    <span
                      className="absolute top-1 right-1 p-0.5 rounded bg-white border border-[#EDE3D8] text-[#8A6A55]"
                      title={`Agenda fechada neste dia: ${compromissoTitulo(c.fechado)}`}
                    >
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {c.inMonth && !c.fechado && c.bloqueios.length > 0 && (
                    <span
                      className="absolute top-1 right-1 p-0.5 rounded bg-white border border-[#EDE3D8] text-[#8A6A55]"
                      title={`Horários bloqueados neste dia: ${c.bloqueios
                        .map(
                          (b) =>
                            `${compromissoTitulo(b)} ${(b.start_time || '').slice(0, 5)}–${(b.end_time || '').slice(0, 5)}`,
                        )
                        .join(', ')}`}
                    >
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {c.inMonth && !c.fechado && (
                    <button
                      type="button"
                      className={cn(
                        'p-0.5 rounded bg-white border border-[#EDE3D8] text-[#C66B4D] hover:bg-[#FFF3D6]',
                        c.bloqueios.length > 0
                          ? 'block absolute top-1 right-8'
                          : 'hidden group-hover/cell:block absolute top-1 right-1',
                      )}
                      title="Novo agendamento neste dia"
                      onClick={() => onCreateAt({ date: c.iso, time: '08:00', professionalId: '' })}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
