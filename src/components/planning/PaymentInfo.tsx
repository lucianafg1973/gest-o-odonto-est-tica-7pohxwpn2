import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface PaymentInfo {
  payment_method: string
  installments: number
}

interface Props {
  paymentMethod: string
  onPaymentMethodChange: (v: string) => void
  installments: number
  onInstallmentsChange: (n: number) => void
  total: number
  formatCurrency: (n: number) => string
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'convenio', label: 'Convênio' },
]

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 10, 12]

export function PaymentInfo({
  paymentMethod,
  onPaymentMethodChange,
  installments,
  onInstallmentsChange,
  total,
  formatCurrency,
}: Props) {
  return (
    <Card className="card-warm p-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="font-serif-title text-base text-[#2D1B14]">
          Forma de Pagamento (registrada à parte do preço)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Forma de Pagamento</Label>
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger className="w-full bg-white text-xs">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Parcelas</Label>
          <Select
            value={String(installments)}
            onValueChange={(v) => onInstallmentsChange(Number(v))}
          >
            <SelectTrigger className="w-full bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTALLMENT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Valor Total</Label>
          <p className="text-sm font-bold text-[#C66B4D] pt-2">{formatCurrency(total)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
