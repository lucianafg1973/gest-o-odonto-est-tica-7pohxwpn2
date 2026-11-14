import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FileSignature, FileUp } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface AttachSignedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nome do planejamento/paciente para contexto. */
  contexto: string
  /** Cria o documento "assinado" com o PDF digitalizado (data + usuário). */
  onConfirm: (file: File, signedDate: string, assinadoPor: string) => Promise<void>
}

/**
 * Passo 2 do assistente de assinatura: anexar o PDF digitalizado assinado pelo
 * paciente. Registra a data da assinatura e o usuário responsável — a assinatura
 * do paciente é um registro SEPARADO da aprovação do planejamento.
 */
export function AttachSignedDialog({
  open,
  onOpenChange,
  contexto,
  onConfirm,
}: AttachSignedDialogProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    if (!file) return
    setSaving(true)
    try {
      await onConfirm(file, data, user?.name || '—')
      setFile(null)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] text-base flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-[#C66B4D]" /> Anexar documento assinado
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            {contexto} — o PDF digitalizado com a assinatura do paciente é arquivado junto ao
            planejamento (não altera o conteúdo já salvo).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-xs font-semibold">Documento digitalizado (PDF/imagem)</Label>
          <Input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
          <Label className="text-xs font-semibold">Data da assinatura</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="text-xs"
          />
          <p className="text-[10px] text-[#6B4F42]">
            Registrado em nome de <strong>{user?.name || '—'}</strong>.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs font-semibold"
            disabled={!file || saving}
            onClick={confirmar}
          >
            <FileUp className="w-3.5 h-3.5 mr-1" /> {saving ? 'Anexando...' : 'Anexar documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
