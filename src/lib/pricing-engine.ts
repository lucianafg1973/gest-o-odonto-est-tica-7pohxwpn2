import pb from '@/lib/pocketbase/client'
import { ProcedureRecord } from '@/services/procedures'

/** Especialidades configuráveis do catálogo único. */
export const SPECIALTIES = [
  'Cirurgia oral',
  'Implantodontia',
  'Prótese',
  'Dentística',
  'Endodontia',
  'Periodontia',
  'Ortodontia',
  'Odontopediatria',
  'Harmonização orofacial',
  'Estética facial',
  'Radiologia e diagnóstico',
  'Prevenção',
  'Reabilitação oral',
  'Outras',
] as const

/** Famílias padrão por especialidade (editáveis — o campo family aceita texto livre). */
export const FAMILY_SUGGESTIONS: Record<string, string[]> = {
  Dentística: ['Restauração', 'Clareamento', 'Facetas e lentes', 'Dentística'],
  Implantodontia: ['Implantes', 'Coroas', 'Protocolos', 'Enxertos', 'Implantodontia'],
  'Cirurgia oral': ['Extração', 'Cirurgia oral'],
  Endodontia: ['Tratamento de canal', 'Endodontia'],
  Periodontia: ['Raspagem', 'Cirurgia periodontal', 'Periodontia'],
  Ortodontia: ['Alinhadores', 'Aparelhos', 'Contenções', 'Ortodontia'],
  Prótese: ['Coroas', 'Pinos e núcleos', 'Prótese', 'Prótese removível'],
  'Radiologia e diagnóstico': ['Radiografias', 'Diagnóstico e radiologia'],
  Prevenção: ['Prevenção e terapias', 'Profilaxia'],
  'Harmonização orofacial': ['HOF e estética facial'],
  'Estética facial': ['HOF e estética facial'],
}

/** Mapa de normalização categoria_sugerida → especialidade do catálogo. */
const SPECIALTY_ALIASES: Record<string, string> = {
  'cirurgia oral': 'Cirurgia oral',
  implantodontia: 'Implantodontia',
  prótese: 'Prótese',
  protese: 'Prótese',
  dentística: 'Dentística',
  dentistica: 'Dentística',
  endodontia: 'Endodontia',
  periodontia: 'Periodontia',
  ortodontia: 'Ortodontia',
  odontopediatria: 'Odontopediatria',
  'harmonização orofacial': 'Harmonização orofacial',
  'harmonizacao orofacial': 'Harmonização orofacial',
  hof: 'Harmonização orofacial',
  'estética facial': 'Estética facial',
  'estetica facial': 'Estética facial',
  'radiologia e diagnóstico': 'Radiologia e diagnóstico',
  'radiologia e diagnostico': 'Radiologia e diagnóstico',
  'diagnóstico e radiologia': 'Radiologia e diagnóstico',
  'diagnostico e radiologia': 'Radiologia e diagnóstico',
  prevenção: 'Prevenção',
  prevencao: 'Prevenção',
  'prevenção e terapias': 'Prevenção',
  'prevencao e terapias': 'Prevenção',
  'reabilitação oral': 'Reabilitação oral',
  'reabilitacao oral': 'Reabilitação oral',
  outras: 'Outras',
  'outros — revisar': 'Outras',
  outros: 'Outras',
}

export const normalizeSpecialty = (raw: string): string => {
  const key = (raw || '').trim().toLowerCase()
  if (!key) return 'Outras'
  if (SPECIALTY_ALIASES[key]) return SPECIALTY_ALIASES[key]
  const match = SPECIALTIES.find((s) => s.toLowerCase() === key)
  return match || raw.trim() || 'Outras'
}

export interface ProcPricingConfig {
  margemDesejada: number // %
  margemMinima: number // %
  descontoPlanejado: number // %
  descontoMaximo: number // %
  impostosPercent: number // % s/ receita
  taxaPagamentoPercent: number // % s/ receita
  comissaoPercent: number // % s/ receita
}

export const DEFAULT_PRICING_CONFIG: ProcPricingConfig = {
  margemDesejada: 30,
  margemMinima: 15,
  descontoPlanejado: 0,
  descontoMaximo: 10,
  impostosPercent: 0,
  taxaPagamentoPercent: 4,
  comissaoPercent: 0,
}

/**
 * Precificação inteligente de um procedimento.
 * Distinção fixos × diretos × percentuais: o custo da hora clínica já embute
 * os FIXOS (a planilha Formação da Hora Clínica) — aqui entram apenas os
 * DIRETOS (material, laboratório, executor, outros) e os PERCENTUAIS sobre
 * receita (impostos, taxa de pagamento, comissão) — sem duplicar custos.
 * Faltando a hora clínica ou o tempo → cálculo pendente.
 */
export interface Precificacao {
  pendente: boolean
  motivoPendente: string
  custosDiretos: number
  custoHora: number
  custoOperacional: number // proporcional ao tempo (hora clínica)
  custoTotal: number
  percentuais: number // % somados sobre receita
  precoOficial: number
  margemAtual: number // %
  markupAtual: number // %
  precoMinimo: number // preserva margem mínima
  precoRecomendado: // atinge margem desejada
  number
  precoTabelaComDesconto: number // com desconto planejado ainda ≥ margem desejada
  lucroEstimado: number
  abaixoMargemMinima: boolean
}

export function precificar(
  proc: Partial<ProcedureRecord> & { tempoMinutos?: number },
  horaClinica: number,
  cfg: ProcPricingConfig = DEFAULT_PRICING_CONFIG,
): Precificacao {
  const tempo = Number(proc.tempoMinutos ?? proc.duration_minutes ?? 0)
  const precoOficial = Number(proc.price ?? 0)
  const materiais = Number(proc.material_cost ?? 0)
  const lab = Number(proc.lab_price ?? 0)
  const executor = Number(proc.executor_cost ?? 0)
  const outros = Number(proc.other_direct_cost ?? 0)

  const semHora = !(horaClinica > 0) || tempo <= 0
  const motivo = semHora
    ? 'Cálculo pendente — informe tempo clínico e a Formação da Hora Clínica.'
    : ''

  const custoOperacional = semHora ? 0 : horaClinica * (tempo / 60)
  const custosDiretos = materiais + lab + executor + outros
  const percentuais = cfg.impostosPercent + cfg.taxaPagamentoPercent + cfg.comissaoPercent
  const custoTotal = custoOperacional + custosDiretos

  if (semHora || precoOficial <= 0) {
    return {
      pendente: true,
      motivoPendente: semHora ? motivo : 'Cálculo pendente — informe o preço oficial.',
      custosDiretos,
      custoHora: horaClinica,
      custoOperacional,
      custoTotal,
      percentuais,
      precoOficial,
      margemAtual: 0,
      markupAtual: 0,
      precoMinimo: 0,
      precoRecomendado: 0,
      precoTabelaComDesconto: 0,
      lucroEstimado: 0,
      abaixoMargemMinima: false,
    }
  }

  // Receita necessária para atingir uma margem-alvo com percentuais sobre
  // receita: R = (custoTotal) / (1 - margem% - percentuais%)
  const receitaPara = (margemAlvo: number) => {
    const denominador = 1 - margemAlvo / 100 - percentuais / 100
    if (denominador <= 0) return custoTotal / 0.01 // guard: margens inviáveis
    return custoTotal / denominador
  }

  const precoMinimo = receitaPara(cfg.margemMinima)
  const precoRecomendado = receitaPara(cfg.margemDesejada)
  // Preço de tabela com espaço para o desconto planejado: após desconto ainda
  // preserva a margem desejada.
  const fatorDesconto = 1 - cfg.descontoPlanejado / 100
  const precoTabelaComDesconto =
    fatorDesconto > 0 ? precoRecomendado / fatorDesconto : precoRecomendado

  const lucroEstimado = precoOficial * (1 - percentuais / 100) - custoTotal
  const margemAtual = (lucroEstimado / precoOficial) * 100
  const markupAtual = custoTotal > 0 ? ((precoOficial - custoTotal) / custoTotal) * 100 : 0
  const limiteMinimo = precoOficial * (1 - cfg.descontoMaximo / 100)

  return {
    pendente: false,
    motivoPendente: '',
    custosDiretos,
    custoHora: horaClinica,
    custoOperacional,
    custoTotal,
    percentuais,
    precoOficial,
    margemAtual,
    markupAtual,
    precoMinimo,
    precoRecomendado,
    precoTabelaComDesconto,
    lucroEstimado,
    abaixoMargemMinima: margemAtual < cfg.margemMinima,
  }
}

/** Simulação de desconto sobre um procedimento (NÃO altera a tabela oficial). */
export interface SimulacaoDesconto {
  precoOficial: number
  descontoValor: number
  precoFinal: number
  lucroEstimado: number
  margemAposDesconto: number
  limiteMinimoGerencial: number
  abaixoDoLimite: boolean
}

export function simularDesconto(
  p: Precificacao,
  desconto: number,
  tipo: 'valor' | 'percentual',
  cfg: ProcPricingConfig = DEFAULT_PRICING_CONFIG,
): SimulacaoDesconto {
  const descontoValor = tipo === 'percentual' ? (p.precoOficial * desconto) / 100 : desconto
  const precoFinal = Math.max(0, p.precoOficial - descontoValor)
  const lucro = precoFinal * (1 - p.percentuais / 100) - p.custoTotal
  const margem = precoFinal > 0 ? (lucro / precoFinal) * 100 : 0
  const limiteMinimoGerencial = p.precoOficial * (1 - cfg.descontoMaximo / 100)
  return {
    precoOficial: p.precoOficial,
    descontoValor,
    precoFinal,
    lucroEstimado: lucro,
    margemAposDesconto: margem,
    limiteMinimoGerencial,
    abaixoDoLimite: precoFinal < limiteMinimoGerencial || margem < cfg.margemMinima,
  }
}

/** Preço efetivo de um procedimento (manual > oficial) para o planejamento. */
export const precoEfetivo = (proc: Partial<ProcedureRecord>) =>
  proc.use_manual_price && proc.manual_price != null
    ? Number(proc.manual_price)
    : Number(proc.price ?? 0)
