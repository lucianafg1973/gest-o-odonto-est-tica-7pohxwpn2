import pb from '@/lib/pocketbase/client'
import { formatCurrency } from '@/lib/price-calculation'
import { FinancialTransactionRecord } from '@/services/financial'
import { PatientRecord } from '@/services/patients'

export type ReceiptType = 'individual' | 'consolidado'

export interface PaymentReceiptRecord {
  id: string
  patient: string
  receipt_type: ReceiptType
  transaction?: string
  amount: number
  title: string
  notes?: string
  receipt_date?: string
  created: string
  updated: string
}

export const getReceipts = (patientId: string) =>
  pb.collection('payment_receipts').getFullList<PaymentReceiptRecord>({
    filter: `patient="${patientId}"`,
    sort: '-created',
  })

export const createReceipt = (data: Partial<PaymentReceiptRecord>) =>
  pb.collection('payment_receipts').create<PaymentReceiptRecord>(data)

export const deleteReceipt = (id: string) => pb.collection('payment_receipts').delete(id)

/** Soma BRUTA dos pagamentos confirmados (status 'pago') — SEM descontar taxas de operadora. */
export const totalPagoBruto = (transactions: FinancialTransactionRecord[]) =>
  Math.round(
    100 *
      transactions
        .filter((t) => t.status === 'pago' && t.transaction_type === 'receita')
        .reduce((s, t) => s + (t.amount || 0), 0),
  ) / 100

/** Saldo pendente = total contratado − total pago bruto (taxas NÃO entram). */
export const saldoPendente = (
  transactions: FinancialTransactionRecord[],
  totalContratado: number,
) => Math.round(100 * (totalContratado - totalPagoBruto(transactions))) / 100

const CLINICA = 'CLÍNICA ODONTO ESTÉTICA'
const SUB = 'Odontologia Avançada e Estética Facial — Dra. Luciana F. G.'

const openPrintWindow = (html: string) => {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
  return true
}

/**
 * Recibo de UM pagamento confirmado. Valor bruto pago pelo paciente,
 * sem descontar taxas de operadora (que ficam como despesa interna).
 */
export function printIndividualReceipt(
  transaction: FinancialTransactionRecord,
  patient: PatientRecord,
): boolean {
  const valor = Math.round(100 * (transaction.amount || 0)) / 100
  const descricao = transaction.description || 'Pagamento'
  const data = (transaction.transaction_date || new Date().toISOString().slice(0, 10))
    .split(' ')[0]
    .split('-')
    .reverse()
    .join('/')
  const hoje = new Date().toLocaleDateString('pt-BR')

  return openPrintWindow(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><title>Recibo — ${patient.name}</title>
<style>
  body { font-family: Georgia, serif; padding: 40px; color: #2D1B14; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 4px; }
  .sub { text-align: center; color: #6B4F42; font-size: 12px; margin-bottom: 18px; }
  .rule { border-bottom: 2px solid #C66B4D; margin: 12px 0 20px; }
  h2 { text-align: center; font-size: 16px; color: #C66B4D; margin: 18px 0 12px; }
  .box { border: 1px solid #EDE3D8; border-radius: 8px; padding: 16px; background: #FBF3DC; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; flex-wrap: wrap; gap: 4px; }
  .valor { font-size: 22px; font-weight: bold; text-align: center; margin: 20px 0; }
  .assin { margin-top: 60px; text-align: center; font-size: 12px; }
  .assin .linha { border-top: 1px solid #2D1B14; padding-top: 6px; width: 280px; margin: 0 auto; }
</style></head><body>
<h1>${CLINICA}</h1>
<p class="sub">${SUB}</p>
<div class="rule"></div>
<h2>RECIBO DE PAGAMENTO</h2>
<div class="box">
  <div class="row"><span><strong>Paciente:</strong> ${patient.name}</span><span><strong>Data do pagamento:</strong> ${data}</span></div>
  <div class="row"><span><strong>Descrição:</strong> ${descricao}</span><span><strong>Emitido em:</strong> ${hoje}</span></div>
</div>
<p style="font-size:13px">Recebemos de <strong>${patient.name}</strong> o valor de
<strong>${formatCurrency(valor)}</strong> referente ao pagamento descrito acima.
Valor bruto pago pelo paciente, sem dedução de taxas.</p>
<div class="valor">${formatCurrency(valor)}</div>
<div class="assin"><div class="linha"><strong>Dra. Luciana F. G.</strong><br/>Responsável Técnico</div></div>
</body></html>`)
}

/**
 * Recibo CONSOLIDADO de todos os pagamentos confirmados ainda sem recibo
 * (nenhum valor é duplicado: os já receiptados individualmente ficam de fora).
 */
export function printConsolidatedReceipt(
  faltantes: FinancialTransactionRecord[],
  valorTotal: number,
  patient: PatientRecord,
): boolean {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const linhas = faltantes
    .map(
      (t) =>
        `<li>${t.description || 'Pagamento'} — ${formatCurrency(t.amount || 0)} (${(t.transaction_date || '').split(' ')[0].split('-').reverse().join('/')})</li>`,
    )
    .join('')

  return openPrintWindow(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><title>Recibo Consolidado — ${patient.name}</title>
<style>
  body { font-family: Georgia, serif; padding: 40px; color: #2D1B14; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 4px; }
  .sub { text-align: center; color: #6B4F42; font-size: 12px; margin-bottom: 18px; }
  .rule { border-bottom: 2px solid #C66B4D; margin: 12px 0 20px; }
  h2 { text-align: center; font-size: 16px; color: #C66B4D; margin: 18px 0 12px; }
  ul { font-size: 13px; padding-left: 20px; }
  .box { border: 1px solid #EDE3D8; border-radius: 8px; padding: 16px; background: #FBF3DC; margin-bottom: 16px; }
  .valor { font-size: 22px; font-weight: bold; text-align: center; margin: 20px 0; }
  .assin { margin-top: 60px; text-align: center; font-size: 12px; }
  .assin .linha { border-top: 1px solid #2D1B14; padding-top: 6px; width: 280px; margin: 0 auto; }
</style></head><body>
<h1>${CLINICA}</h1>
<p class="sub">${SUB}</p>
<div class="rule"></div>
<h2>RECIBO CONSOLIDADO DE PAGAMENTOS</h2>
<div class="box">
  <div class="row"><span><strong>Paciente:</strong> ${patient.name}</span><span><strong>Emitido em:</strong> ${hoje}</span></div>
  <div class="row"><span><strong>Pagamentos incluídos:</strong> ${faltantes.length}</span></div>
</div>
<ul>${linhas}</ul>
<p style="font-size:13px">Recebemos de <strong>${patient.name}</strong> o valor total de
<strong>${formatCurrency(valorTotal)}</strong>, referente aos ${faltantes.length} pagamento(s) confirmado(s)
listados acima. Valor bruto pago pelo paciente, sem dedução de taxas.</p>
<div class="valor">${formatCurrency(valorTotal)}</div>
<div class="assin"><div class="linha"><strong>Dra. Luciana F. G.</strong><br/>Responsável Técnico</div></div>
</body></html>`)
}
