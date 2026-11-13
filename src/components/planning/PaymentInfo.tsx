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
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import { formatCurrency as fmtDefault } from '@/lib/price-calculation'
import { toCents, fromCents, splitCents, conferencia, novoId, addDaysISO } from '@/lib/payment-calc'

export interface PaymentInstallment {
  id: string
  /** Entrada ou parcela. */
  kind: 'entrada' | 'parcela'
  method: string
  amount: number
  /** Data de vencimento (YYYY-MM-DD). */
  due_date: string
  /** Nº de parcelas daquele meio (1 = parcela única) — mantido por compatibilidade. */
  installments_count?: number
}

export interface PaymentPlan {
  installments: PaymentInstallment[]
}

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * Converte planos salvos em versões antigas (uma única linha com
 * installments_count = N) em parcelas individuais, preservando valores.
 * Usada ao REABRIR um planejamento salvo antes desta refatoração.
 */
export function normalizePlan(plan: PaymentPlan): PaymentPlan {
  const out: PaymentInstallment[] = []
  for (const i of plan.installments || []) {
    const n = i.kind === 'parcela' ? Math.max(1, i.installments_count ?? 1) : 1
    if (n === 1) {
      out.push({ ...i, installments_count: 1 })
    } else {
      const valores = splitCents(toCents(i.amount), n)
      valores.forEach((c, k) =>
        out.push({
          id: `${i.id}-${k + 1}`,
          kind: 'parcela',
          method: i.method,
          amount: fromCents(c),
          due_date: addDaysISO(i.due_date, 30 * k),
          installments_count: 1,
        }),
      )
    }
  }
  return { installments: out }
}

interface Props {
  plan: PaymentPlan
  onPlanChange: (plan: PaymentPlan) => void
  /** Total do planejamento (reais) — soma dos procedimentos selecionados. */
  total: number
  formatCurrency?: (n: number) => string
  /** Quando o plano está aprovado, todos os campos ficam somente leitura. */
  locked?: boolean
}

const MAX_PARCELAS = 24

export function PaymentInfo({
  plan,
  onPlanChange,
  total,
  formatCurrency = fmtDefault,
  locked = false,
}: Props) {
  const fmt = formatCurrency
  const items = plan.installments || []
  const totalC = toCents(total)
  const temProcedimentos = totalC > 0

  const entradas = items.filter((i) => i.kind === 'entrada')
  const parcelas = items.filter((i) => i.kind === 'parcela')
  const entrada = entradas[0]
  const entradaC = entrada ? toCents(entrada.amount) : 0
  const saldo = Math.max(0, totalC - entradaC)
  const somaParcelasC = parcelas.reduce((s, p) => s + toCents(p.amount), 0)
  const conf = conferencia(plan, total)

  const setPlan = (installments: PaymentInstallment[]) => onPlanChange({ installments })

  /** Edita UM campo de UMA parcela — nunca recalcula as demais. */
  const updateParcela = (id: string, patch: Partial<PaymentInstallment>) =>
    setPlan(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  /**
   * Entrada: cria/atualiza a linha de entrada e RECALCULA a distribuição
   * completa do saldo restante entre TODAS as parcelas existentes.
   */
  const onEntradaChange = (valorReais: number) => {
    if (locked) return
    const cent = Math.min(Math.max(0, toCents(valorReais)), totalC)
    const novaEntrada: PaymentInstallment = {
      id: entrada?.id ?? novoId(),
      kind: 'entrada',
      method: entrada?.method || 'pix',
      amount: fromCents(cent),
      due_date: entrada?.due_date || todayISO(),
    }
    const resto = totalC - cent
    if (resto <= 0) {
      // A entrada quitou o total — não há saldo para parcelar.
      setPlan([novaEntrada])
      return
    }
    if (parcelas.length > 0) {
      const valores = splitCents(resto, parcelas.length)
      const novas = parcelas.map((p, i) => ({ ...p, amount: fromCents(valores[i]) }))
      setPlan([novaEntrada, ...novas])
    } else {
      // Sem parcelas ainda — o usuário escolhe o número no seletor abaixo.
      setPlan([novaEntrada])
    }
  }

  const removeEntrada = () => {
    if (locked) return
    if (parcelas.length > 0) {
      // Recalcula as parcelas para o total integral (sem entrada).
      const valores = splitCents(totalC, parcelas.length)
      const novas = parcelas.map((p, i) => ({ ...p, amount: fromCents(valores[i]) }))
      setPlan(novas)
    } else {
      setPlan([])
    }
  }

  /**
   * ÚNICO seletor de número de parcelas: regenera a lista a partir do saldo,
   * distribuindo em centavos inteiros (resto na última) — nunca duplica valores.
   */
  const onChangeNumParcelas = (n: number) => {
    if (locked || !temProcedimentos) return
    if (saldo <= 0) {
      setPlan(items.filter((i) => i.kind !== 'parcela'))
      return
    }
    const count = Math.min(Math.max(1, Math.floor(n)), MAX_PARCELAS)
    const valores = splitCents(saldo, count)
    const method = parcelas[0]?.method || 'boleto'
    const firstDue = parcelas[0]?.due_date || addDaysISO(todayISO(), 30)
    const novas: PaymentInstallment[] = valores.map((c, i) => ({
      id: parcelas[i]?.id ?? novoId(),
      kind: 'parcela',
      method,
      amount: fromCents(c),
      due_date: addDaysISO(firstDue, 30 * i),
      installments_count: 1,
    }))
    setPlan([...entradas, ...novas])
  }

  /** Forma padrão: aplica o meio escolhido a todas as parcelas de uma vez. */
  const onChangeFormaPadrao = (v: string) =>
    setPlan(items.map((i) => (i.kind === 'parcela' ? { ...i, method: v } : i)))

  const removeParcela = (id: string) => setPlan(items.filter((i) => i.id !== id))

  const nParcelas = parcelas.length
  const formaPadrao = parcelas[0]?.method || 'boleto'
  const seloOk = conf.ok
  const temPlano = !!entrada || parcelas.length > 0

  return (
    <Card className="card-warm p-4 space-y-3">
      <CardHeader className="p-0 pb-1">
        <CardTitle className="font-serif-title text-base text-[#2D1B14]">
          Condições de Pagamento
        </CardTitle>
      </CardHeader>

      {/* 1 · Valor total do planejamento */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-[#EDE3D8] rounded-xl p-3">
        <div>
          <Label className="text-[10px] font-semibold text-[#6B4F42]">
            Valor total do planejamento
          </Label>
          <p className="text-lg font-bold text-[#C66B4D] leading-tight">{fmt(total)}</p>
          <p className="text-[10px] text-[#6B4F42]">
            Calculado automaticamente a partir dos procedimentos selecionados.
          </p>
        </div>
      </div>
      {!temProcedimentos && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Não há procedimentos com valor neste planejamento (ou os preços estão zerados). Adicione
          tratamentos com valor — o parcelamento fica disponível assim que o total for maior que
          zero.
        </p>
      )}

      {/* 2 · Entrada opcional + 3 · Forma de pagamento da entrada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">Entrada (opcional)</Label>
          <Input
            type="number"
            min={0}
            max={total || undefined}
            step="0.01"
            placeholder="Sem entrada"
            value={entrada?.amount ?? ''}
            disabled={locked || !temProcedimentos}
            onChange={(e) => onEntradaChange(Number(e.target.value) || 0)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">Forma de pagamento da entrada</Label>
          {entrada ? (
            <div className="flex items-center gap-2">
              <Select
                value={entrada.method || 'pix'}
                disabled={locked}
                onValueChange={(v) =>
                  setPlan(items.map((i) => (i.kind === 'entrada' ? { ...i, method: v } : i)))
                }
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!locked && (
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="w-8 h-8 p-0 text-red-600 hover:bg-red-50 shrink-0"
                  onClick={removeEntrada}
                  title="Remover entrada"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#6B4F42] pt-2">
              Sem entrada — o valor total será financiado em parcelas.
            </p>
          )}
        </div>
      </div>

      {/* 4 · Saldo restante */}
      <div className="flex items-center justify-between bg-white border border-[#EDE3D8] rounded-xl px-3 py-2">
        <Label className="text-[10px] font-semibold text-[#6B4F42]">
          Saldo restante a parcelar
        </Label>
        <p className="text-sm font-bold text-[#2D1B14]">{fmt(fromCents(saldo))}</p>
      </div>

      {/* 5 · Número de parcelas (seletor único) + 6 · Forma padrão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">Número de parcelas</Label>
          <Select
            value={String(nParcelas || '')}
            disabled={locked || !temProcedimentos || saldo <= 0}
            onValueChange={(v) => onChangeNumParcelas(Number(v))}
          >
            <SelectTrigger className="w-full bg-white text-xs">
              <SelectValue placeholder={saldo <= 0 ? '—' : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}x — {fmt(fromCents(saldo) / n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">
            Forma de pagamento padrão das parcelas
          </Label>
          <Select
            value={formaPadrao}
            disabled={locked || parcelas.length === 0}
            onValueChange={onChangeFormaPadrao}
          >
            <SelectTrigger className="w-full bg-white text-xs">
              <SelectValue />
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
      </div>

      {/* 7 · Lista de parcelas — editáveis individualmente */}
      {parcelas.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold text-[#6B4F42]">
            Parcelas — valor, vencimento e modalidade editáveis individualmente
          </Label>
          {parcelas.map((p, idx) => (
            <div
              key={p.id}
              className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-white border border-[#EDE3D8] rounded-xl p-2"
            >
              <div className="sm:col-span-1 flex items-center h-9 text-xs font-bold text-[#C66B4D]">
                {idx + 1}ª
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[10px] font-semibold">Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.amount}
                  disabled={locked}
                  onChange={(e) => updateParcela(p.id, { amount: Number(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[10px] font-semibold">Vencimento</Label>
                <Input
                  type="date"
                  value={p.due_date}
                  disabled={locked}
                  onChange={(e) => updateParcela(p.id, { due_date: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[10px] font-semibold">Modalidade</Label>
                <Select
                  value={p.method}
                  disabled={locked}
                  onValueChange={(v) => updateParcela(p.id, { method: v })}
                >
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
              <div className="sm:col-span-1 flex justify-end">
                {!locked && (
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="w-8 h-8 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => removeParcela(p.id)}
                    title="Remover parcela"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!temPlano && temProcedimentos && (
        <p className="text-[11px] text-[#6B4F42]">
          Defina uma entrada (opcional) e o número de parcelas — os valores são calculados
          automaticamente.
        </p>
      )}

      {/* 8 · Conferência automática */}
      <div className="flex flex-wrap justify-end items-center gap-3 border-t border-[#EDE3D8] pt-2 text-xs">
        <span className="text-[#6B4F42]">
          Entrada: <strong className="text-[#2D1B14]">{fmt(entrada ? entrada.amount : 0)}</strong>
        </span>
        <span className="text-[#6B4F42]">
          Parcelas ({nParcelas}):{' '}
          <strong className="text-[#2D1B14]">{fmt(fromCents(somaParcelasC))}</strong>
        </span>
        <span
          className={`px-2 py-0.5 rounded-full font-semibold ${
            seloOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {seloOk
            ? '✓ Conferido: entrada + parcelas = total'
            : `Diferença de ${fmt(Math.abs(conf.diffCents) / 100)} (${conf.direcao})`}
        </span>
      </div>
    </Card>
  )
}
