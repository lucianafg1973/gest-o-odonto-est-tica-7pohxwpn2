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

/**
 * Diálogo de desmarcar: quem desmarcou + motivo.
 * Aberto pelo seletor de status quando a clínica ou o paciente desmarca.
 */
export default function CancelDialog({
  open,
  onOpenChange,
  patientName,
  actorKind,
  currentUser,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  actorKind: 'clinica' | 'paciente'
  currentUser: string
  onConfirm: (who: string, reason: string) => void
}) {
  const [who, setWho] = useState(currentUser)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setWho(currentUser)
      setReason('')
    }
  }, [open, currentUser])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            Desmarcar consulta — {patientName}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            {actorKind === 'clinica'
              ? 'A clínica está desmarcando esta consulta. O horário ficará livre para novos agendamentos e o histórico será preservado.'
              : 'O paciente pediu para desmarcar. O horário ficará livre e o histórico será preservado.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Quem desmarcou *</Label>
            <Input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Ex.: Recepção — Ana / Dr.ª Luciana"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Motivo</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actorKind === 'clinica'
                  ? 'Ex.: conflito de agenda, emergência...'
                  : 'Ex.: imprevisto do paciente, viagem...'
              }
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            className="bg-[#C66B4D] text-white hover:bg-[#B25A3E]"
            disabled={!who.trim()}
            onClick={() => onConfirm(who.trim(), reason.trim())}
          >
            Confirmar desmarque
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
