/**
 * Chips de agendamento posicionados na grade (Dia/Semana).
 * Um agendamento ocupa tantas fileiras de 30 min quanto a sua duração
 * (ex.: 08:00–08:40 ocupa duas fileiras: 08:00 e 08:30).
 * Cor de FUNDO pela categoria do tratamento (vermelho=cirurgia, azul=profilaxia,
 * dourado=HOF, verde=ortodontia); o STATUS continua com seu selo próprio.
 */
import {
  STATUS_LABELS,
  type AppointmentRecord,
  type AppointmentStatus,
} from '@/services/appointments'
import { durationMinutes } from '@/services/appointments'
import { categorizeAppointment, CATEGORY_STYLES, CATEGORY_LABELS } from '@/lib/appointment-category'
import { isSlotFree } from '@/lib/agenda-status'
import { cn } from '@/lib/utils'

const SLOT_MIN = 30

export interface ChipGroup {
  /** Índice da fileira (0-based) onde o chip começa. */
  row: number
  /** Quantidade de fileiras ocupadas (mínimo 1). */
  span: number
  apps: AppointmentRecord[]
}

/**
 * Agrupa os agendamentos ativos de uma coluna (profissional no dia / dia na semana)
 * por fileira de início, calculando quantas fileiras cada grupo ocupa.
 */
export function groupChips(
  appointments: AppointmentRecord[],
  iso: string,
  professionalId: string,
  slots: number[],
  workEnd: number,
): ChipGroup[] {
  const first = slots[0]
  if (first === undefined) return []
  const lastRow = slots.length

  const groups = new Map<number, ChipGroup>()
  for (const app of appointments) {
    if ((app.date || '').slice(0, 10) !== iso) continue
    if (isSlotFree(app)) continue
    // Na visão de dia (coluna por profissional) a ocupação é POR COLUNA:
    // agendamento de outro profissional não bloqueia esta coluna.
    if (professionalId && app.professional !== professionalId) continue

    const [h, m] = (app.start_time || '').split(':').map(Number)
    const startRaw = (h || 0) * 60 + (m || 0)
    const startMin = Math.max(startRaw, first)
    if (startMin >= workEnd) continue
    const idx = Math.floor((startMin - first) / SLOT_MIN)
    if (idx < 0 || idx >= lastRow) continue

    const dur = durationMinutes(app)
    const endMin = Math.min(workEnd, startMin + dur)
    const span = Math.max(1, Math.min(lastRow - idx, Math.ceil((endMin - startMin) / SLOT_MIN)))

    const g = groups.get(idx)
    if (g) {
      g.apps.push(app)
      g.span = Math.max(g.span, span)
    } else {
      groups.set(idx, { row: idx, span, apps: [app] })
    }
  }
  return [...groups.values()].sort((a, b) => a.row - b.row)
}

/** Selo compacto do STATUS dentro do chip colorido por categoria. */
function StatusSeal({ status }: { status: AppointmentStatus }) {
  const dot =
    status === 'concluido'
      ? 'bg-teal-600'
      : status === 'confirmado'
        ? 'bg-emerald-600'
        : status === 'chegou'
          ? 'bg-amber-600'
          : status === 'em_atendimento'
            ? 'bg-violet-600'
            : status === 'faltou'
              ? 'bg-red-600'
              : status === 'desmarcado_clinica'
                ? 'bg-orange-600'
                : status === 'desmarcado_paciente'
                  ? 'bg-pink-600'
                  : status === 'remarcou'
                    ? 'bg-cyan-600'
                    : 'bg-blue-600'
  return <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', dot)} />
}

/**
 * Chip colorido pela CATEGORIA do tratamento; o status aparece como um pequeno
 * ponto escuro (selo) no canto — continua legível sobre qualquer cor de fundo.
 */
export function AppointmentChip({
  app,
  span,
  onOpenDetail,
}: {
  app: AppointmentRecord
  span: number
  onOpenDetail: (app: AppointmentRecord) => void
}) {
  const style = CATEGORY_STYLES[categorizeAppointment(app)]
  const end = app.end_time ? `–${app.end_time.slice(0, 5)}` : ''
  return (
    <button
      type="button"
      className={cn(
        'relative w-full text-left border rounded-md px-1.5 py-0.5 truncate hover:shadow-sm transition-shadow',
        style.chip,
        style.stripe,
      )}
      title={`${app.expand?.patient?.name || 'Paciente'} — ${(app.start_time || '').slice(0, 5)}${end} — ${
        app.expand?.procedure?.name || 'Atendimento Geral'
      } — ${CATEGORY_LABELS[categorizeAppointment(app)]} — Status: ${STATUS_LABELS[app.status]}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpenDetail(app)
      }}
      style={{ height: `${span * 2.25 - 0.15}rem` }}
    >
      <span className="block text-[10px] font-semibold leading-tight truncate pr-2">
        {app.expand?.patient?.name || 'Paciente'}
      </span>
      <span className="block text-[9px] opacity-80 leading-tight truncate pr-2">
        {(app.start_time || '').slice(0, 5)}
        {end} · {app.expand?.procedure?.name || 'Atendimento Geral'}
      </span>
      <span className="absolute right-1 top-0.5" title={`Status: ${STATUS_LABELS[app.status]}`}>
        <StatusSeal status={app.status} />
      </span>
    </button>
  )
}
