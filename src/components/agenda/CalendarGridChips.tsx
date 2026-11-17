/**
 * Chips de agendamento posicionados na grade (Dia/Semana).
 * Um agendamento ocupa tantas fileiras de 30 min quanto a sua duração
 * (ex.: 08:00–08:40 ocupa duas fileiras: 08:00 e 08:30).
 * Cor de FUNDO = cor PASTEL do PROFISSIONAL (identificação rápida de quem atende);
 * a CATEGORIA do tratamento continua visível como uma barra lateral fina à esquerda
 * (vermelho=cirurgia, azul=profilaxia, dourado=HOF, verde=ortodontia);
 * o STATUS continua com seu selo próprio (ponto no canto).
 * Compromissos internos usam o pastel do profissional (ou neutro, sem profissional)
 * com borda TRACEJADA para se diferenciarem das consultas.
 */
import {
  STATUS_LABELS,
  type AppointmentRecord,
  type AppointmentStatus,
  isCompromisso,
  compromissoTitulo,
} from '@/services/appointments'
import { durationMinutes } from '@/services/appointments'
import { categorizeAppointment, CATEGORY_STYLES, CATEGORY_LABELS } from '@/lib/appointment-category'
import { professionalPastel, NEUTRAL_PASTEL } from '@/lib/professional-colors'
import { isSlotFree } from '@/lib/agenda-status'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { CalendarClock, GripVertical } from 'lucide-react'
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
  return groupChipsInner(appointments, iso, professionalId, slots, workEnd, false)
}

/**
 * Igual a groupChips, mas incluindo compromissos internos SEM profissional em TODAS
 * as colunas (compromisso de clínica bloqueia o horário para todos os profissionais).
 * Compromissos COM profissional aparecem só na coluna do seu profissional.
 */
export function groupChipsWithClinicCompromissos(
  appointments: AppointmentRecord[],
  iso: string,
  professionalId: string,
  slots: number[],
  workEnd: number,
): ChipGroup[] {
  return groupChipsInner(appointments, iso, professionalId, slots, workEnd, true)
}

function groupChipsInner(
  appointments: AppointmentRecord[],
  iso: string,
  professionalId: string,
  slots: number[],
  workEnd: number,
  includeClinicCompromissos: boolean,
): ChipGroup[] {
  const first = slots[0]
  if (first === undefined) return []
  const lastRow = slots.length

  const groups = new Map<number, ChipGroup>()
  for (const app of appointments) {
    if ((app.date || '').slice(0, 10) !== iso) continue
    if (isSlotFree(app)) continue
    if (isCompromisso(app)) {
      // Dia inteiro NÃO vira chip de horário — tem faixa própria na grade.
      if (app.is_all_day) continue
      // Compromisso de outro profissional não bloqueia esta coluna; o da clínica
      // (sem profissional) bloqueia todas as colunas quando solicitado.
      if (
        professionalId &&
        app.professional !== professionalId &&
        !(includeClinicCompromissos && !app.professional)
      )
        continue
    } else {
      // Na visão de dia (coluna por profissional) a ocupação é POR COLUNA:
      // agendamento de outro profissional não bloqueia esta coluna.
      if (professionalId && app.professional !== professionalId) continue
    }

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

/** Selo compacto do STATUS dentro do chip (ponto no canto, legível sobre pastel). */
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
 * Chip da grade: FUNDO na cor pastel do profissional (ou neutro p/ compromisso),
 * barra lateral fina com a cor da CATEGORIA e selo de STATUS no canto.
 */
export function AppointmentChip({
  app,
  span,
  onOpenDetail,
  onReschedule,
}: {
  app: AppointmentRecord
  span: number
  onOpenDetail: (app: AppointmentRecord) => void
  /** Menu de contexto (botão direito): remarcar para outro horário/dia. */
  onReschedule?: (app: AppointmentRecord) => void
}) {
  const compromisso = isCompromisso(app)
  const cat = categorizeAppointment(app)
  const catStyle = CATEGORY_STYLES[cat]
  const pastel = professionalPastel(app.professional)
  const end = app.end_time ? `–${app.end_time.slice(0, 5)}` : ''

  const mainText = compromisso
    ? `${compromissoTitulo(app)}`
    : app.expand?.patient?.name || 'Paciente'
  const subText = compromisso
    ? app.is_all_day
      ? 'Dia inteiro · Compromisso'
      : `${(app.start_time || '').slice(0, 5)}${end} · Compromisso`
    : `${(app.start_time || '').slice(0, 5)}${end} · ${
        app.expand?.procedure?.name || 'Atendimento Geral'
      }`
  const tooltip = compromisso
    ? `${compromissoTitulo(app)} — ${(app.start_time || '').slice(0, 5)}${end}${
        app.is_all_day ? ' (dia inteiro)' : ''
      }`
    : `${app.expand?.patient?.name || 'Paciente'} — ${(app.start_time || '').slice(0, 5)}${end} — ${
        app.expand?.procedure?.name || 'Atendimento Geral'
      } — ${CATEGORY_LABELS[cat]} — Status: ${STATUS_LABELS[app.status]}`

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            // O id viaja no dataTransfer; a célula de destino resolve o agendamento.
            e.dataTransfer.setData('text/plain', app.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          className={cn(
            'relative w-full text-left border rounded-md px-1.5 py-0.5 pl-2 truncate hover:shadow-sm transition-shadow overflow-hidden cursor-grab active:cursor-grabbing',
            compromisso && 'border-dashed',
          )}
          style={{
            backgroundColor: pastel.bg,
            borderColor: pastel.border,
            color: pastel.text,
            height: `${span * 2.25 - 0.15}rem`,
          }}
          title={`${tooltip} — arraste para remarcar ou clique com o botão direito`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetail(app)
          }}
        >
          {/* Barra lateral fina: cor da CATEGORIA (consultas) ou cinza (compromissos) */}
          <span
            aria-hidden
            className={cn('absolute left-0 top-0 bottom-0 w-1', !compromisso && catStyle.stripe)}
            style={compromisso ? { backgroundColor: pastel.dot } : undefined}
          />
          <span className="block text-[10px] font-semibold leading-tight truncate pr-2">
            {mainText}
          </span>
          <span className="block text-[9px] opacity-80 leading-tight truncate pr-2">{subText}</span>
          {!compromisso && (
            <span
              className="absolute right-1 top-0.5"
              title={`Status: ${STATUS_LABELS[app.status]}`}
            >
              <StatusSeal status={app.status} />
            </span>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={() => onOpenDetail(app)} className="text-xs text-[#2D1B14] gap-2">
          <GripVertical className="w-3.5 h-3.5 text-[#6B4F42]" /> Ver detalhes
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!onReschedule}
          onClick={() => onReschedule?.(app)}
          className="text-xs text-[#2D1B14] gap-2"
        >
          <CalendarClock className="w-3.5 h-3.5 text-[#C66B4D]" /> Remarcar para outro horário
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
