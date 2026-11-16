import pb from '@/lib/pocketbase/client'

// Livro caixa — Receitas e Despesas (Financeiro > Receitas e Despesas).
// REGRA: as RECEITAS não têm fonte própria — vêm dos pagamentos já existentes
// (financial_transactions status 'pago' tipo 'receita', com recibos em
// payment_receipts). Só as DESPESAS são CRUD próprio, na mesma coleção.
import { FinancialTransactionRecord } from '@/services/financial'
import { PatientRecord } from '@/services/patients'

export interface CaixaDespesaValues {
  description: string
  amount: number
  doc_number?: string
  due_date?: string
  transaction_date: string // data de pagamento
  category?: string
}

export interface LinhaReceita {
  id: string
  patientName: string
  amount: number
  date: string
  paymentMethod: string
  parcela: string
  description: string
}

export interface LinhaDespesa {
  id: string
  description: string
  docNumber: string
  dueDate: string
  payDate: string
  amount: number
  paidAmount: number
  /** true quando pago após o vencimento (juros estimados incluídos no pago). */
  pagoComJuros: boolean
  status: 'pago' | 'pendente'
}

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
}

export const formaPagamentoLabel = (m?: string) => METHOD_LABEL[m || ''] || (m ? m : '—')

export const toISODate = (d?: string) => (d || '').split(' ')[0].slice(0, 10)

/** Nº da parcela a partir da descrição ("Parcela 2/10", "entrada 1/3"…). */
function parcelaDaDescricao(desc?: string): string {
  if (!desc) return '—'
  const m = desc.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)
  if (m) return `${m[1]}/${m[2]}`
  const lower = desc.toLowerCase()
  if (lower.includes('entrada')) return 'entrada'
  return '—'
}

/** Receitas = pagamentos confirmados que já existem (status 'pago'). */
export function linhasReceitas(
  txs: FinancialTransactionRecord[],
  patients: PatientRecord[],
): LinhaReceita[] {
  const nome = new Map(patients.map((p) => [p.id, p.name]))
  return txs
    .filter((t) => t.transaction_type === 'receita' && t.status === 'pago')
    .map((t) => ({
      id: t.id,
      patientName: (t.patient && nome.get(t.patient)) || t.expand?.patient?.name || '—',
      amount: Math.round(100 * (t.amount || 0)) / 100,
      date: toISODate(t.transaction_date),
      paymentMethod: formaPagamentoLabel(t.payment_method),
      parcela: parcelaDaDescricao(t.description),
      description: t.description || 'Pagamento',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Despesas = transações tipo 'despesa' (com nº documento, vencimento e juros). */
export function linhasDespesas(txs: FinancialTransactionRecord[]): LinhaDespesa[] {
  return txs
    .filter((t) => t.transaction_type === 'despesa' && t.status !== 'cancelado')
    .map((t) => {
      const due = toISODate((t as any).due_date)
      const pay = toISODate(t.transaction_date)
      const pago = t.status === 'pago'
      const pagoComJuros = pago && !!due && !!pay && pay > due
      const amount = Math.round(100 * (t.amount || 0)) / 100
      const paidAmount =
        t.paid_amount != null ? Math.round(100 * t.paid_amount) / 100 : pago ? amount : 0
      return {
        id: t.id,
        description: t.description || 'Despesa',
        docNumber: (t as any).doc_number || '',
        dueDate: due,
        payDate: pago ? pay : '',
        amount,
        paidAmount,
        pagoComJuros,
        status: (pago ? 'pago' : 'pendente') as 'pago' | 'pendente',
      }
    })
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
}

export const totalDespesas = (l: LinhaDespesa[]) =>
  Math.round(100 * l.reduce((s, d) => s + (d.paidAmount || d.amount), 0)) / 100

export const totalReceitas = (l: LinhaReceita[]) =>
  Math.round(100 * l.reduce((s, r) => s + r.amount, 0)) / 100

/** Histórico de lucratividade por mês (receitas recebidas − despesas pagas). */
export interface MesLucratividade {
  mes: string // 'YYYY-MM'
  label: string
  receitas: number
  despesas: number
  resultado: number
}

const MES_LABEL = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

export function historicoLucratividade(
  receitas: LinhaReceita[],
  despesas: LinhaDespesa[],
): MesLucratividade[] {
  const meses = new Map<string, MesLucratividade>()
  const push = (mes: string) => {
    if (!meses.has(mes)) {
      const [y, m] = mes.split('-')
      meses.set(mes, {
        mes,
        label: `${MES_LABEL[Number(m) - 1] || m}/${y}`,
        receitas: 0,
        despesas: 0,
        resultado: 0,
      })
    }
    return meses.get(mes)!
  }
  receitas.forEach((r) => {
    if (!r.date) return
    push(r.date.slice(0, 7)).receitas += r.amount
  })
  // Lucro usa só despesas PAGAS (não confundir faturamento recebido com lucro)
  despesas
    .filter((d) => d.status === 'pago')
    .forEach((d) => {
      const mes = (d.payDate || d.dueDate || '').slice(0, 7)
      if (mes) push(mes).despesas += d.paidAmount || d.amount
    })
  return Array.from(meses.values())
    .map((m) => ({
      ...m,
      receitas: Math.round(100 * m.receitas) / 100,
      despesas: Math.round(100 * m.despesas) / 100,
      resultado: Math.round(100 * (m.receitas - m.despesas)) / 100,
    }))
    .sort((a, b) => (a.mes < b.mes ? 1 : -1))
}

// ---------- CRUD de despesas ----------

export const createDespesa = (data: Partial<FinancialTransactionRecord>) =>
  pb.collection('financial_transactions').create<FinancialTransactionRecord>(data)

export const updateDespesa = (id: string, data: Partial<FinancialTransactionRecord>) =>
  pb.collection('financial_transactions').update<FinancialTransactionRecord>(id, data)

export const deleteDespesa = (id: string) => pb.collection('financial_transactions').delete(id)
