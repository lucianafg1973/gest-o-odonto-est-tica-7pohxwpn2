import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Barcode, Copy, Check, Printer } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BoletoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName?: string
  amount: number
  description: string
}

export function BoletoModal({
  open,
  onOpenChange,
  patientName,
  amount,
  description,
}: BoletoModalProps) {
  const [copied, setCopied] = useState(false)

  const barcodeLine =
    '23793.38128 60000.123456 01000.654321 8 94520000' + amount.toFixed(2).replace('.', '')

  const handleCopy = () => {
    navigator.clipboard.writeText(barcodeLine)
    setCopied(true)
    toast({
      title: 'Linha digitável copiada!',
      description: 'Armazenada na área de transferência.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[#C66B4D]" /> Emissão de Boleto Bancário
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Registro e linha digitável para pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#EDE3D8]">
            <div className="flex justify-between items-center text-xs text-[#6B4F42] border-b border-[#EDE3D8] pb-2 mb-2">
              <span>Sacado: {patientName || 'Cliente sem nome'}</span>
              <span>
                Vencimento: {new Date(Date.now() + 5 * 86400000).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="text-xl font-bold text-[#C66B4D]">R$ {amount.toFixed(2)}</p>
            <p className="text-xs text-[#2D1B14] mt-1">{description}</p>
          </div>

          <div className="p-4 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl text-center">
            <div className="font-mono text-2xl tracking-widest text-[#2D1B14] select-all my-2 font-bold">
              ||||| ||| ||||||| || |||||||| ||||
            </div>
            <p className="text-[11px] font-mono text-gray-600 mt-2 break-all bg-white p-2 border rounded">
              {barcodeLine}
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Linha Digitável'}
          </Button>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[#EDE3D8]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button className="btn-terracotta-gold font-medium" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir Boleto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
