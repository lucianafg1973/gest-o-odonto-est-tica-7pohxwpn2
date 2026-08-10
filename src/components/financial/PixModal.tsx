import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, Copy, Check, DollarSign } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PixModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName?: string
  amount: number
  description: string
  onConfirmPayment?: () => void
}

export function PixModal({
  open,
  onOpenChange,
  patientName,
  amount,
  description,
  onConfirmPayment,
}: PixModalProps) {
  const [copied, setCopied] = useState(false)

  const pixCode = `00020126580014br.gov.bcb.pix0136clinicaodontoestetica@pix.com.br520400005303986540${amount.toFixed(2).replace('.', '')}5802BR5925CLINICA ODONTO ESTETICA6009SAO PAULO62070503***6304E8A2`

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode)
    setCopied(true)
    toast({
      title: 'Código Pix copiado!',
      description: 'Chave copia e cola armazenada na área de transferência.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#C66B4D]" /> Cobrança via Pix
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Gere o QR Code ou código copia e cola para o recebimento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-full bg-[#FAF6F0] p-4 rounded-xl border border-[#EDE3D8] text-center">
            <p className="text-xs text-[#6B4F42] uppercase font-medium">Valor da Transação</p>
            <p className="text-2xl font-bold text-[#C66B4D] mt-1">R$ {amount.toFixed(2)}</p>
            <p className="text-xs text-[#2D1B14] mt-1 font-medium">{description}</p>
            {patientName && <p className="text-xs text-gray-500">Paciente: {patientName}</p>}
          </div>

          <div className="p-4 bg-white border-2 border-[#D4AF37] rounded-2xl shadow-sm flex flex-col items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`}
              alt="QR Code Pix"
              className="w-44 h-44 rounded"
            />
            <p className="text-[10px] text-gray-400 mt-2">Escaneie com o app do banco do cliente</p>
          </div>

          <div className="w-full">
            <p className="text-xs font-semibold text-[#2D1B14] mb-1">Código Pix Copia e Cola:</p>
            <div className="flex items-center gap-2 bg-[#FFFDF9] border border-[#EDE3D8] p-2 rounded-lg">
              <input
                type="text"
                readOnly
                value={pixCode}
                className="text-xs font-mono flex-1 bg-transparent border-none focus:outline-none text-ellipsis overflow-hidden"
              />
              <Button size="sm" className="bg-[#C66B4D] text-white shrink-0" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-2 border-t border-[#EDE3D8]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onConfirmPayment && (
            <Button className="btn-terracotta-gold font-medium" onClick={onConfirmPayment}>
              <DollarSign className="w-4 h-4 mr-1" /> Marcar como Pago
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
