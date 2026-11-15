import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown } from 'lucide-react'
import { STATUS_LABELS, STATUS_STYLES, type AppointmentStatus } from '@/services/appointments'

/**
 * Seletor rápido de status direto na agenda: EXATAMENTE 9 opções, cor distinta por status,
 * salvamento automático (sem botão salvar). Ao escolher desmarcar clínica/paciente,
 * chama onRequestCancel para abrir o diálogo (quem + motivo) antes de persistir.
 */
export default function AppointmentStatusBadge({
  status,
  patientName,
  disabled,
  onStatusSelect,
  onRequestCancel,
}: {
  status: AppointmentStatus
  patientName: string
  disabled?: boolean
  onStatusSelect: (s: AppointmentStatus) => void
  onRequestCancel: (kind: 'clinica' | 'paciente') => void
}) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLES[status] || STATUS_STYLES.agendado

  const pick = (s: AppointmentStatus) => {
    setOpen(false)
    if (s === 'desmarcado_clinica') return onRequestCancel('clinica')
    if (s === 'desmarcado_paciente') return onRequestCancel('paciente')
    onStatusSelect(s)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          size="sm"
          variant="outline"
          title={`Status: ${STATUS_LABELS[status]} — alterar (paciente: ${patientName})`}
          className={`h-7 px-2 text-[11px] font-semibold border ${style.chip}`}
        >
          <span className={`w-2 h-2 rounded-full mr-1.5 ${style.dot}`} />
          {STATUS_LABELS[status]}
          <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
        {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((s) => {
          const st = STATUS_STYLES[s] || STATUS_STYLES.agendado
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => pick(s)}
              className={`text-xs gap-2 ${s === status ? 'bg-[#FAF6F0]' : ''}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />
              <span className="flex-1">{STATUS_LABELS[s]}</span>
              {s === status && <Check className="w-3.5 h-3.5 text-[#C66B4D]" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
