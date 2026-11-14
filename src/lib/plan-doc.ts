import { orcamentoCents } from '@/lib/orcamento'
import { formatCurrency } from '@/lib/price-calculation'

/**
 * Motor de documento do planejamento (impressão / PDF / WhatsApp).
 * Os dados vêm SEMPRE do snapshot salvo no planejamento (virtual_plans) —
 * nunca da tabela de preços atual — garantindo que documentos já gerados
 * ou assinados não mudem quando a tabela mudar (T9/T12).
 * Cálculos em centavos via lib/orcamento (protocolo global não soma duas vezes — T10).
 */

export type DocModo = 'detalhado' | 'resumido'

export interface DocItem {
  procedureName?: string
  tooth?: string
  region?: string
  faces?: string[]
  price?: number
  quantity?: number
  categoria?: string
  status?: string
  professionalName?: string
  incluidoNoGlobal?: boolean
  modalidadePreco?: 'global' | 'individual'
  arcada?: string
}

export interface DocInstallment {
  id?: string
  kind?: 'entrada' | 'parcela'
  method?: string
  amount?: number
  due_date?: string
  installments_count?: number
}

export interface PlanDocSnapshot {
  planId: string
  kind: 'hof' | 'odontologico'
  title?: string
  pacienteNome?: string
  pacienteCpf?: string
  profissionalNome?: string
  approvalStatus?: 'rascunho' | 'aprovado'
  approvedAt?: string | null
  approvedBy?: string | null
  treatments: DocItem[]
  paymentPlan: DocInstallment[]
  desconto?: number
  /** Versão do planejamento (incrementa quando o plano é alterado após aprovação). */
  versao?: number
}

export interface DocOptions {
  modo: DocModo
  hideValues: boolean
  signature: boolean
  /** Nome do usuário responsável pela emissão. */
  emitidoPor?: string
  /** Data de emissão ISO — fixa em documentos arquivados. */
  emitidoEm?: string
}

export interface ClinicConfig {
  name: string
  subtitle: string
  phone: string
  address: string
  professional: string
  cro: string
  logoDataUrl?: string
}

export const DECLARACAO_ACEITE =
  'Declaro que recebi e compreendi as informações referentes ao planejamento de tratamento apresentado, incluindo os procedimentos propostos e as condições comerciais descritas neste documento, e manifesto minha concordância com a contratação nas condições aqui registradas.'

export const DEFAULT_CLINIC: ClinicConfig = {
  name: 'Clínica LFG Estética Odontológica',
  subtitle: 'Odontologia Avançada e Estética Facial',
  phone: '',
  address: '',
  professional: 'Dra. Luciana F. G.',
  cro: '',
}

/** Identidade da clínica cadastrada (Configurações) — nunca marca fixa do software. */
export const getClinicConfig = (): ClinicConfig => {
  try {
    const raw = localStorage.getItem('lfg_clinic_config')
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object') return { ...DEFAULT_CLINIC, ...p }
    }
  } catch {
    /* config inválida — usa padrão */
  }
  return DEFAULT_CLINIC
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

const addMonthsISO = (iso: string, months: number) => {
  const d = new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) return iso
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const localLabel = (t: DocItem) => {
  if (t.tooth) return `Dente ${t.tooth}${t.faces?.length ? ` (faces ${t.faces.join(', ')})` : ''}`
  if (t.region) return t.region
  return '—'
}

const localShort = (t: DocItem) => (t.tooth ? `Dente ${t.tooth}` : t.region || '—')

const ativos = (treatments: DocItem[]) => (treatments || []).filter((t) => t.status !== 'cancelado')

/** Parcelas expandidas (parcela com N repetições vira N linhas mensais). */
export function parcelasExpandidas(plan: DocInstallment[]): {
  label: string
  method: string
  venc: string
  amountCents: number
}[] {
  const out: { label: string; method: string; venc: string; amountCents: number }[] = []
  ;(plan || []).forEach((i) => {
    const cents = Math.round((i.amount || 0) * 100)
    const method = i.method || ''
    if (i.kind === 'parcela' && (i.installments_count || 1) > 1) {
      const n = i.installments_count || 1
      for (let k = 0; k < n; k++) {
        out.push({
          label: `Parcela ${k + 1}/${n}`,
          method,
          venc: addMonthsISO(i.due_date || new Date().toISOString().slice(0, 10), k),
          amountCents:
            Math.floor(cents / n) + (k === n - 1 ? cents - Math.floor(cents / n) * n : 0),
        })
      }
    } else {
      out.push({
        label: i.kind === 'entrada' ? 'Entrada' : 'Parcela',
        method,
        venc: i.due_date || '',
        amountCents: cents,
      })
    }
  })
  return out
}

const methodLabel = (v: string) => {
  const map: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    boleto: 'Boleto',
    transferencia: 'Transferência',
  }
  return map[v] || v
}

export function planoKindsLabel(kind: 'hof' | 'odontologico') {
  return kind === 'hof' ? 'Planejamento HOF — Face e Pescoço' : 'Planejamento Odontológico'
}

export function numeroPlanejamento(planId: string) {
  return `PL-${planId.slice(-6).toUpperCase()}`
}

/** Título do documento — nunca "contrato aceito" quando não aprovado (T4). */
export function tituloDoc(s: PlanDocSnapshot, signature: boolean) {
  const num = numeroPlanejamento(s.planId)
  if (s.approvalStatus !== 'aprovado') return `PROPOSTA DE TRATAMENTO — ${num}`
  return signature
    ? `TERMO DE ACEITE E CONTRATAÇÃO — ${num}`
    : `PLANEJAMENTO DE TRATAMENTO APROVADO — ${num}`
}

/** Status textual exibido no documento. */
export function statusDocLabel(s: PlanDocSnapshot) {
  if (s.approvalStatus === 'aprovado')
    return `APROVADO${s.approvedAt ? ` em ${fmtDate(s.approvedAt)}` : ''}${
      s.approvedBy ? ` — por ${s.approvedBy}` : ''
    }`
  return 'PROPOSTA — AGUARDANDO APROVAÇÃO DO PACIENTE'
}

/** Cálculo do total (centavos) com o desconto do planejamento. */
export function totalDocCents(s: PlanDocSnapshot) {
  const orc = orcamentoCents(s.treatments as Parameters<typeof orcamentoCents>[0])
  const desc = Math.min(orc, Math.max(0, Math.round((s.desconto || 0) * 100)))
  return orc - desc
}

/** Linhas de texto do documento (base do PDF simples do WhatsApp). */
export function buildPlanDocLines(s: PlanDocSnapshot, o: DocOptions): string[] {
  const clinic = getClinicConfig()
  const linhas: string[] = []
  const hide = o.hideValues
  linhas.push(clinic.name.toUpperCase())
  linhas.push(clinic.subtitle)
  if (clinic.phone || clinic.address)
    linhas.push([clinic.phone, clinic.address].filter(Boolean).join(' — '))
  linhas.push('')
  linhas.push(tituloDoc(s, o.signature))
  linhas.push(`Planejamento: ${planoKindsLabel(s.kind)}`)
  linhas.push(`Status: ${statusDocLabel(s)}`)
  linhas.push(
    `Emitido em: ${fmtDate(o.emitidoEm || new Date().toISOString())}   Responsável: ${o.emitidoPor || clinic.professional}`,
  )
  linhas.push('')
  linhas.push('TRATAMENTOS PLANEJADOS')
  const list = ativos(s.treatments)
  if (list.length === 0) linhas.push('  Nenhum tratamento planejado.')
  list.forEach((t, i) => {
    const nome = t.procedureName || 'Procedimento'
    const local = localShort(t)
    const qtd = (t.quantity || 1) > 1 ? ` — ${t.quantity}x` : ''
    const global = t.incluidoNoGlobal ? ' (incluído no protocolo global)' : ''
    linhas.push(`  ${i + 1}. ${nome} — ${local}${qtd}${global}`)
    if (!hide && o.modo === 'detalhado' && !t.incluidoNoGlobal) {
      linhas.push(
        `     Valor unit.: ${formatCurrency(t.price || 0)}  Subtotal: ${formatCurrency((t.price || 0) * (t.quantity || 1))}`,
      )
    }
  })
  if (!hide) {
    const orc = orcamentoCents(s.treatments as Parameters<typeof orcamentoCents>[0])
    linhas.push('')
    if (o.modo === 'detalhado') linhas.push(`Subtotal: ${formatCurrency(orc / 100)}`)
    if (s.desconto) linhas.push(`Desconto: -${formatCurrency(s.desconto)}`)
    linhas.push(`Investimento total: ${formatCurrency(totalDocCents(s) / 100)}`)
    const parcelas = parcelasExpandidas(s.paymentPlan)
    if (parcelas.length) {
      linhas.push('')
      linhas.push('CONDIÇÕES DE PAGAMENTO')
      parcelas.forEach((p) =>
        linhas.push(
          `  ${p.label} — ${methodLabel(p.method)} — venc. ${fmtDate(p.venc) || '—'} — ${formatCurrency(p.amountCents / 100)}`,
        ),
      )
    }
  } else {
    linhas.push('')
    linhas.push('(Documento clínico — valores comerciais não exibidos.)')
  }
  if (o.signature) {
    linhas.push('')
    linhas.push('DECLARAÇÃO DE CONCORDÂNCIA')
    linhas.push(DECLARACAO_ACEITE)
    linhas.push(
      '(Este aceite comercial não substitui o Termo de Consentimento Livre e Esclarecido.)',
    )
    linhas.push('')
    linhas.push('Local e data: ________________________________')
    linhas.push('')
    linhas.push('____________________________________________')
    linhas.push(`Assinatura do paciente / responsável legal`)
    linhas.push('')
    linhas.push('____________________________________________')
    linhas.push(
      `Representante da clínica — ${clinic.professional}${clinic.cro ? ` (CRO ${clinic.cro})` : ''}`,
    )
  }
  return linhas
}

/** HTML A4 completo do documento — usado na prévia, impressão e PDF. */
export function buildPlanDocHtml(s: PlanDocSnapshot, o: DocOptions): string {
  const clinic = getClinicConfig()
  const hide = o.hideValues
  const orc = orcamentoCents(s.treatments as Parameters<typeof orcamentoCents>[0])
  const totalC = totalDocCents(s)
  const list = ativos(s.treatments)

  const logo = clinic.logoDataUrl
    ? `<img src="${clinic.logoDataUrl}" alt="Logomarca" style="height:52px;object-fit:contain"/>`
    : `<div class="logo-fallback">${esc(clinic.name.split(' ').slice(0, 3).join(' '))}</div>`

  const procRows = list
    .map((t) => {
      const nome = esc(t.procedureName || 'Procedimento')
      const qtd = (t.quantity || 1) > 1 ? `${t.quantity}x` : '1'
      const globalTag = t.incluidoNoGlobal
        ? `<span class="tag-global">incluído no protocolo global</span>`
        : ''
      const proto =
        t.categoria === 'protocolo'
          ? `<span class="tag-proto">${t.modalidadePreco === 'global' ? 'preço global' : ''}</span>`
          : ''
      if (o.modo === 'resumido') {
        return `<tr><td>${nome}${globalTag}${proto}</td><td>${esc(localLabel(t))}</td><td class="c">${qtd}</td></tr>`
      }
      const valor = t.incluidoNoGlobal
        ? '<span class="muted">—</span>'
        : formatCurrency(t.price || 0)
      const sub = t.incluidoNoGlobal
        ? '<span class="muted">—</span>'
        : formatCurrency((t.price || 0) * (t.quantity || 1))
      return `<tr><td>${nome}${globalTag}${proto}</td><td>${esc(localLabel(t))}</td><td class="c">${qtd}</td><td class="r">${valor}</td><td class="r">${sub}</td></tr>`
    })
    .join('')

  const tableHeadDet = `<tr><th>Procedimento</th><th>Dente / Região</th><th>Qtd</th><th class="r">Valor unit.</th><th class="r">Subtotal</th></tr>`
  const tableHeadRes = `<tr><th>Procedimento</th><th>Dente / Região</th><th>Qtd</th></tr>`

  const financeiro = hide
    ? `<p class="clinical-note">Documento clínico — condições comerciais não exibidas nesta versão.</p>`
    : `<table class="fin">
        ${o.modo === 'detalhado' ? `<tr><td>Subtotal</td><td class="r">${formatCurrency(orc / 100)}</td></tr>` : ''}
        ${s.desconto ? `<tr><td>Desconto</td><td class="r">- ${formatCurrency(s.desconto)}</td></tr>` : ''}
        <tr class="total-row"><td>Investimento total</td><td class="r">${formatCurrency(totalC / 100)}</td></tr>
      </table>`

  const parcelas = hide
    ? ''
    : (() => {
        const exp = parcelasExpandidas(s.paymentPlan)
        if (!exp.length) return ''
        const rows = exp
          .map(
            (p) =>
              `<tr><td>${esc(p.label)}</td><td>${esc(methodLabel(p.method))}</td><td>${fmtDate(p.venc) || '—'}</td><td class="r">${formatCurrency(p.amountCents / 100)}</td></tr>`,
          )
          .join('')
        return `<h2>Condições de pagamento</h2><table class="pay"><thead><tr><th>Tipo</th><th>Modalidade</th><th>Vencimento</th><th class="r">Valor</th></tr></thead><tbody>${rows}</tbody></table>`
      })()

  const assinatura = o.signature
    ? `<div class="aceite">
        <h2>Declaração de concordância</h2>
        <p class="declaracao">"${esc(DECLARACAO_ACEITE)}"</p>
        <p class="obs">Este aceite comercial não substitui o Termo de Consentimento Livre e Esclarecido (TCLE).</p>
        <p class="local-data">Local e data: ______________________________________________</p>
        <div class="sigs">
          <div class="sig"><div class="line"></div><strong>${esc(s.pacienteNome || 'Paciente')}</strong><span>Assinatura do paciente / responsável legal</span></div>
          <div class="sig"><div class="line"></div><strong>${esc(clinic.professional)}</strong><span>Representante da clínica${clinic.cro ? ` — CRO ${esc(clinic.cro)}` : ''}</span></div>
        </div>
      </div>`
    : ''

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${esc(tituloDoc(s, o.signature))}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2D1B14; margin: 0; background: #fff; }
  .sheet { max-width: 186mm; margin: 0 auto; padding: 4mm; background: #FFFEFB; }
  .head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #C66B4D; padding-bottom: 10px; }
  .head img { height: 52px; }
  .logo-fallback { font-family: Georgia, serif; font-size: 15px; font-weight: bold; color: #8B6914; border: 1.5px solid #D4AF37; border-radius: 8px; padding: 6px 10px; }
  .head-info { flex: 1; }
  .head-info h1 { margin: 0; font-size: 16px; color: #2D1B14; }
  .head-info p { margin: 2px 0 0; font-size: 11px; color: #6B4F42; }
  .doc-title { text-align: center; font-size: 15px; letter-spacing: 1.5px; font-weight: bold; color: #7A3B25; margin: 16px 0 4px; }
  .doc-status { text-align: center; font-size: 10.5px; color: #6B4F42; margin-bottom: 12px; }
  .doc-status b { color: #2E8B57; }
  .meta { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; }
  .meta td { padding: 3px 6px; border-bottom: 1px solid #EDE3D8; }
  .meta td:first-child { color: #6B4F42; width: 120px; }
  h2 { font-size: 12.5px; color: #7A3B25; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #D4AF37; padding-bottom: 3px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #EDE3D8; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #FBF3DC; color: #2D1B14; font-size: 10px; text-transform: uppercase; }
  .c { text-align: center; } .r { text-align: right; } .muted { color: #9a8f88; }
  .tag-global, .tag-proto { display: inline-block; font-size: 8.5px; font-weight: bold; border-radius: 999px; padding: 0 6px; margin-left: 4px; }
  .tag-global { background: #E8F5EE; color: #2E8B57; border: 1px solid #2E8B57; }
  .tag-proto { background: #FBF3DC; color: #8B6914; border: 1px solid #D4AF37; }
  table.fin { margin-top: 12px; width: 60%; margin-left: auto; }
  table.fin td { border: none; border-bottom: 1px dotted #D4AF37; padding: 4px 6px; font-size: 12px; }
  .total-row td { font-weight: bold; font-size: 14px; color: #7A3B25; border-bottom: 2px solid #C66B4D; }
  .clinical-note { font-size: 11px; color: #6B4F42; background: #FBF3DC; border: 1px solid #D4AF37; border-radius: 6px; padding: 8px 10px; margin-top: 14px; }
  .aceite { margin-top: 20px; page-break-inside: avoid; }
  .declaracao { font-size: 11.5px; text-align: justify; line-height: 1.55; background: #FFFEFB; border: 1px solid #EDE3D8; border-left: 3px solid #C66B4D; padding: 10px 12px; }
  .obs { font-size: 9.5px; color: #6B4F42; font-style: italic; }
  .local-data { font-size: 11.5px; margin-top: 26px; }
  .sigs { display: flex; justify-content: space-between; margin-top: 46px; page-break-inside: avoid; }
  .sig { width: 44%; text-align: center; font-size: 11px; }
  .sig .line { border-top: 1px solid #2D1B14; margin-bottom: 4px; }
  .sig span { display: block; color: #6B4F42; font-size: 10px; }
  .footer { margin-top: 24px; border-top: 1px solid #D4AF37; padding-top: 6px; font-size: 9px; color: #6B4F42; text-align: center; }
  @media print { .sheet { padding: 0; } }
</style></head><body><div class="sheet">
  <div class="head">
    ${logo}
    <div class="head-info">
      <h1>${esc(clinic.name)}</h1>
      <p>${esc(clinic.subtitle)}${clinic.phone ? ` — ${esc(clinic.phone)}` : ''}${clinic.address ? ` — ${esc(clinic.address)}` : ''}</p>
    </div>
  </div>
  <div class="doc-title">${esc(tituloDoc(s, o.signature))}</div>
  <div class="doc-status">Status: <b>${esc(statusDocLabel(s))}</b> — Versão ${s.versao || 1}</div>
  <table class="meta">
    <tr><td>Paciente</td><td>${esc(s.pacienteNome || '—')}</td><td>CPF</td><td>${esc(s.pacienteCpf || '—')}</td></tr>
    <tr><td>Nº do planejamento</td><td>${esc(numeroPlanejamento(s.planId))}</td><td>Tipo</td><td>${esc(planoKindsLabel(s.kind))}</td></tr>
    <tr><td>Data de emissão</td><td>${fmtDate(o.emitidoEm || new Date().toISOString())}</td><td>Responsável</td><td>${esc(o.emitidoPor || clinic.professional)}</td></tr>
  </table>
  <h2>Tratamentos planejados</h2>
  <table><thead>${o.modo === 'detalhado' ? tableHeadDet : tableHeadRes}</thead><tbody>
    ${procRows || '<tr><td colspan="5">Nenhum tratamento planejado.</td></tr>'}
  </tbody></table>
  ${financeiro}
  ${parcelas}
  ${assinatura}
  <div class="footer">${esc(clinic.name)} • Documento gerado pelo sistema de gestão — Nº ${esc(numeroPlanejamento(s.planId))} • Versão ${s.versao || 1}</div>
</div></body></html>`
}
