import { PaymentInstallment, PaymentPlan, PAYMENT_METHODS } from '@/components/planning/PaymentInfo'
import { TreatmentItem } from '@/components/planning/TreatmentList'
import { formatCurrency } from '@/lib/price-calculation'
import { PlanKind, VirtualPlanRecord } from '@/services/virtual_plans'

/** Rótulo legível do meio de pagamento. */
export const paymentMethodLabel = (v: string) =>
  PAYMENT_METHODS.find((m) => m.value === v)?.label || v

const round2 = (n: number) => Math.round(n * 100) / 100

/** Soma da(s) entrada(s) do plano de pagamento. */
export const entradaTotal = (plan: PaymentPlan) =>
  round2(
    (plan.installments || [])
      .filter((i) => i.kind === 'entrada')
      .reduce((s, i) => s + (i.amount || 0), 0),
  )

/** Total que sobra para as parcelas: total do plano menos a entrada. */
export const saldoParaParcelas = (plan: PaymentPlan, total: number) =>
  Math.max(0, round2(total - entradaTotal(plan)))

/**
 * Gera o conteúdo HTML do planejamento para impressão (janela de impressão
 * do navegador — o usuário escolhe "Salvar como PDF"). Usado quando o plano
 * está APROVADO.
 */
export function printPlan(plan: VirtualPlanRecord, patientName: string) {
  const kindLabel =
    plan.kind === 'hof' ? 'Planejamento HOF — Face e Pescoço' : 'Planejamento Odontológico'
  const treatments = (plan.treatments || []) as TreatmentItem[]
  const installments = (plan.payment_plan || []) as PaymentInstallment[]
  const total = treatments.reduce((s, t) => s + (t.price || 0), 0)

  const rows = treatments
    .map(
      (t) =>
        `<tr><td>${t.procedureName}</td><td>${t.tooth || t.region || '—'}</td><td style="text-align:right">${formatCurrency(t.price)}</td></tr>`,
    )
    .join('')

  const payRows = installments
    .map((i) => {
      const n = i.kind === 'parcela' ? (i.installments_count ?? 1) : 1
      const cada = n > 1 ? ` (${n}x de ${formatCurrency(round2(i.amount / n))})` : ''
      const data = i.due_date ? i.due_date.split('-').reverse().join('/') : '—'
      return `<tr><td>${i.kind === 'entrada' ? 'Entrada' : 'Parcela'}</td><td>${paymentMethodLabel(i.method)}${cada}</td><td>${data}</td><td style="text-align:right">${formatCurrency(i.amount)}</td></tr>`
    })
    .join('')

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><title>${kindLabel} — ${patientName}</title>
<style>
  body { font-family: Georgia, serif; padding: 32px; color: #2D1B14; }
  h1 { text-align: center; font-size: 20px; color: #2D1B14; margin: 0 0 4px; }
  .sub { text-align: center; color: #6B4F42; font-size: 12px; margin-bottom: 18px; }
  .rule { border-bottom: 2px solid #C66B4D; margin: 12px 0 20px; }
  h2 { font-size: 15px; color: #C66B4D; margin: 18px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #EDE3D8; padding: 6px 8px; text-align: left; }
  th { background: #FBF3DC; color: #2D1B14; }
  .total { text-align: right; font-size: 14px; font-weight: bold; margin-top: 8px; }
  .status { display: inline-block; background: #2E8B57; color: white; padding: 3px 10px; border-radius: 999px; font-size: 11px; }
  .sig { display: flex; justify-content: space-around; margin-top: 64px; font-size: 12px; page-break-inside: avoid; }
  .sig div { width: 40%; text-align: center; border-top: 1px solid #2D1B14; padding-top: 6px; }
</style></head><body>
<h1>CLÍNICA ODONTO ESTÉTICA</h1>
<p class="sub">Odontologia Avançada e Estética Facial — Dra. Luciana F. G.</p>
<div class="rule"></div>
<p><strong>Paciente:</strong> ${patientName} &nbsp;|&nbsp; <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
<h2>${kindLabel} — <span class="status">APROVADO</span></h2>
<h2>Tratamentos Planejados</h2>
<table><thead><tr><th>Procedimento</th><th>Localização</th><th style="text-align:right">Valor</th></tr></thead>
<tbody>${rows || '<tr><td colspan="3">Nenhum tratamento planejado.</td></tr>'}</tbody></table>
${treatments.length > 0 ? `<p class="total">Valor total do planejamento: ${formatCurrency(total)}</p>` : ''}
<h2>Forma de Pagamento</h2>
<table><thead><tr><th>Tipo</th><th>Meio</th><th>Vencimento</th><th style="text-align:right">Valor</th></tr></thead>
<tbody>${payRows || '<tr><td colspan="4">Nenhuma condição de pagamento definida.</td></tr>'}</tbody></table>
<div class="sig">
  <div><strong>${patientName}</strong><br/>Assinatura do Paciente</div>
  <div><strong>Dra. Luciana F. G.</strong><br/>Responsável Técnico</div>
</div>
</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
