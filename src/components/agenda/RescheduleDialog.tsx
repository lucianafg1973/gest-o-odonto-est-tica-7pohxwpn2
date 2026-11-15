import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CalendarClock } from 'lucide-react'
import type { AppointmentRecord, RescheduleHistoryEntry } from '@/services/appointments'

/**
 * Diálogo de remarcação: nova data/horário + motivo opcional.
 * Preserva o vínculo com o agendamento original (rescheduled_from) e o histórico.
 */
export default function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  existingAppointments,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: AppointmentRecord | null
  existingAppointments: AppointmentRecord[]
  onConfirm: (newDate: string, newTime: string, reason: string) => void
}) {
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    if (open && appointment) {
      setNewDate((appointment.date || '').slice(0, 10))
      setNewTime(appointment.start_time || '09:00')
      setReason('')
      setConflict(null)
    }
  }, [open, appointment])

  const confirm = () => {
    if (!appointment) return
    if (!newDate || !newTime) {
      setConflict('Informe a nova data e o horário.')
      return
    }
    // evitar duplicidade: mesmo paciente + data + horário em agendamento ATIVO
    const dup = existingAppointments.some(
      (a) =>
        a.id !== appointment.id &&
        a.patient === appointment.patient &&
        (a.date || '').slice(0, 10) === newDate &&
        a.start_time === newTime &&
        !['desmarcado_clinica', 'desmarcado_paciente', 'remarcou'].includes(a.status),
    )
    if (dup) {
      setConflict('Este paciente já possui um agendamento ativo nessa data e horário.')
      return
    }
    onConfirm(newDate, newTime, reason.trim())
  }

  const history: RescheduleHistoryEntry[] = appointment?.reschedule_history || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#C66B4D]" /> Remarcar consulta
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            O agendamento original é preservado no histórico e o novo fica vinculado a ele (nunca é
            excluído).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs bg-[#FAF6F0] border border-[#EDE3D8] rounded-lg p-3 text-[#6B4F42]">
            <p className="font-semibold text-[#2D1B14]">
              {appointment?.expand?.patient?.name || 'Paciente'}
            </p>
            <p>
              Atual: {(appointment?.date || '').slice(0, 10)} às {appointment?.start_time}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nova data *</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Novo horário *</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Motivo da remarcação</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: paciente pediu para trocar para a semana seguinte..."
              rows={2}
            />
          </div>

          {conflict && <p className="text-xs text-red-600">{conflict}</p>}

          {history.length > 0 && (
            <div className="text-xs text-[#6B4F42] space-y-1">
              <p className="font-semibold text-[#2D1B14]">Histórico de remarcações:</p>
              {history.map((h, i) => (
                <p key={i}>
                  • {h.from_date?.slice(0, 10)} {h.from_time} → {h.to_date?.slice(0, 10)}{' '}
                  {h.to_time}
                  {h.by ? ` (por ${h.by})` : ''}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            className="bg-[#C66B4D] text-white hover:bg-[#B25A3E]"
            disabled={!newDate || !newTime}
            onClick={confirm}
          >
            Confirmar remarcação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
