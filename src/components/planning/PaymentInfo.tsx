import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

export interface PaymentInstallment {
  id: string
  /** Entrada ou parcela. */
  kind: 'entrada' | 'parcela'
  method: string
  amount: number
  /** Data de vencimento preestabelecida (YYYY-MM-DD). */
  due_date: string
}

export interface PaymentPlan {
  installments: PaymentInstallment[]
}

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'convenio', label: 'Convênio' },
  { value: 'outro', label: 'Outro' },
]

const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label || v

const newId = () => `pi${Date.now()}${Math.random().toString(36).slice(2, 6)}`

const addDaysISO = (base: string, days: number) => {
  const d = base ? new Date(`${base}T12:00:00`) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Gera um plano padrão: entrada em Pix hoje + 1 parcela em 30 dias. */
export function defaultPaymentPlan(total: number): PaymentPlan {
  const today = new Date().toISOString().slice(0, 10)
  const entrada = Math.round(total * 0.3 * 100) / 100
  return {
    installments: [
      { id: newId(), kind: 'entrada', method: 'pix', amount: entrada, due_date: today },
      {
        id: newId(),
        kind: 'parcela',
        method: 'boleto',
        amount: Math.round((total - entrada) * 100) / 100,
        due_date: addDaysISO(today, 30),
      },
    ],
  }
}

/** Distribui o total restante em N parcelas iguais, com vencimentos mensais a partir da entrada. */
export function splitIntoInstallments(
  plan: PaymentPlan,
  total: number,
  count: number,
  method: string,
  firstDueDate: string,
): PaymentPlan {
  const entradas = plan.installments.filter((i) => i.kind === 'entrada')
  const entradaTotal = entradas.reduce((s, i) => s + (i.amount || 0), 0)
  const restante = Math.max(0, Math.round((total - entradaTotal) * 100) / 100)
  const per = Math.round((restante / count) * 100) / 100
  const parcelas: PaymentInstallment[] = Array.from({ length: count }, (_, i) => ({
    id: newId(),
    kind: 'parcela' as const,
    method,
    amount: per,
    due_date: addDaysISO(firstDueDate, 30 * (i + 1)),
  }))
  return { installments: [...entradas, ...parcelas] }
}

interface Props {
  plan: PaymentPlan
  onPlanChange: (plan: PaymentPlan) => void
  total: number
  formatCurrency: (n: number) => string
}

export function PaymentInfo({ plan, onPlanChange, total, formatCurrency }: Props) {
  const items = plan.installments || []
  const plannedTotal = items.reduce((s, i) => s + (i.amount || 0), 0)
  const diff = Math.round((total - plannedTotal) * 100) / 100

  const update = (id: string, patch: Partial<PaymentInstallment>) =>
    onPlanChange({
      installments: items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })

  const remove = (id: string) => onPlanChange({ installments: items.filter((i) => i.id !== id) })

  const addEntrada = () =>
    onPlanChange({
      installments: [
        ...items,
        {
          id: newId(),
          kind: 'entrada',
          method: 'pix',
          amount: 0,
          due_date: new Date().toISOString().slice(0, 10),
        },
      ],
    })

  const addParcela = () =>
    onPlanChange({
      installments: [
        ...items,
        {
          id: newId(),
          kind: 'parcela',
          method: 'boleto',
          amount: 0,
          due_date: addDaysISO(new Date().toISOString().slice(0, 10), 30),
        },
      ],
    })

  return (
    <Card className="card-warm p-4 space-y-3">
      <CardHeader className="p-0 pb-1">
        <CardTitle className="font-serif-title text-base text-[#2D1B14]">
          Forma de Pagamento (com ou sem entrada)
        </CardTitle>
      </CardHeader>
      <p className="text-[11px] text-[#6B4F42]">
        Monte condições combinadas, ex.: entrada de R$ 300 no Pix + 3 boletos de R$ 400 + 5x no
        cartão — com datas de vencimento definidas por parcela.
      </p>

      <div className="flex gap-2">
        <Button size="sm" type="button" variant="outline" className="text-xs" onClick={addEntrada}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Entrada
        </Button>
        <Button size="sm" type="button" variant="outline" className="text-xs" onClick={addParcela}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Parcela
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-[11px] text-[#6B4F42]">Nenhuma condição de pagamento adicionada.</p>
      )}

      <div className="space-y-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-white border border-[#EDE3D8] rounded-xl p-2"
          >
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px] font-semibold">Tipo</Label>
              <Select
                value={i.kind}
                onValueChange={(v) => update(i.id, { kind: v as 'entrada' | 'parcela' })}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada" className="text-xs">
                    Entrada
                  </SelectItem>
                  <SelectItem value="parcela" className="text-xs">
                    Parcela
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-[10px] font-semibold">Meio</Label>
              <Select value={i.method} onValueChange={(v) => update(i.id, { method: v })}>
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
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px] font-semibold">Valor (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={i.amount}
                onChange={(e) => update(i.id, { amount: Number(e.target.value) })}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-4 space-y-1">
              <Label className="text-[10px] font-semibold">Vencimento</Label>
              <Input
                type="date"
                value={i.due_date}
                onChange={(e) => update(i.id, { due_date: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="w-8 h-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => remove(i.id)}
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-3 border-t border-[#EDE3D8] pt-2 text-xs">
        <span className="text-[#6B4F42]">
          Total planejado:{' '}
          <strong className="text-[#2D1B14]">{formatCurrency(plannedTotal)}</strong>
        </span>
        <span className="text-[#6B4F42]">
          Valor do orçamento: <strong className="text-[#C66B4D]">{formatCurrency(total)}</strong>
        </span>
        {Math.abs(diff) > 0.009 && (
          <span
            className={`px-2 py-0.5 rounded-full font-semibold ${
              diff > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
            }`}
          >
            {diff > 0 ? 'Faltam ' : 'Excedem '} {formatCurrency(Math.abs(diff))}
          </span>
        )}
      </div>
      <p className="text-[10px] text-[#6B4F42]">
        Resumo: {items.filter((i) => i.kind === 'entrada').length} entrada(s) ·{' '}
        {items.filter((i) => i.kind === 'parcela').length} parcela(s) —{' '}
        {[...new Set(items.map((i) => methodLabel(i.method)))].join(', ') || '—'}
      </p>
    </Card>
  )
}
