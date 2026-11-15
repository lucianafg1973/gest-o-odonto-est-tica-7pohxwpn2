import pb from '@/lib/pocketbase/client'
import { ProcedureRecord } from '@/services/procedures'

/**
 * PRECIFICAÇÃO — planilhas da proprietária (aba "Precificação" do Financeiro).
 *
 * Seção A: custos e despesas fixas → coleção clinic_cost_items (existente,
 * migração 0016), com as linhas da planilha "Custos e Despesas Fixas" semeadas
 * idempotentemente pela migração 20251115120000_precificacao_seed.js.
 * Seção B: derivação da hora clínica → clinical_hour_config (existente):
 * horas disponíveis, % ociosidade e fator de avaliação — calculado por
 * calcularHoraClinica() (src/services/clinical-hour.ts), nunca duplicado.
 * Seção C: lucratividade por procedimento → coleção procedures (existente):
 * cada coluna da planilha "Situação Atual" tem campo próprio (migração
 * 20251115120000: cartão %, comissão %, inadimplência %, material, laboratório,
 * imposto %, outros custos diretos, minutos) — editável aqui, centavos na UI.
 * Painel inteligente: preço sugerido (margem alvo) e desconto máximo
 * (margem mínima) — configuráveis por procedimento, sem tocar o preço oficial.
 */

/** Parâmetros de custo usados na planilha 2 da proprietária. */
export const PCT = {
  cartao: 10,
  comissao: 3,
  inadimplencia: 4,
  imposto: 12,
} as const

export interface CustosProcedimento {
  preco: number
  minutos: number
  custoMinuto: number
  custoHoraTotal: number
  cartao: number
  laboratorio: number
  comissao: number
  inadimplencia: number
  material: number
  imposto: number
  outros: number
  custosTotais: number
  lucro: number
  margem: number
}

/** Linha da planilha "Situação Atual" em centavos (como em payment-calc). */
export function custosProcedimento(p: ProcedureRecord, custoMinuto: number): CustosProcedimento {
  const precoC = Math.round((Number(p.price) || 0) * 100)
  const minutos = Number(p.duration_minutes) || 0
  const custoHoraTotalC = Math.round(custoMinuto * minutos * 100)
  const pctCartao = Number(p.card_fee_percent ?? PCT.cartao) || 0
  const pctComissao = Number(p.sales_commission_percent ?? PCT.comissao) || 0
  const pctInad = Number(p.default_percent ?? PCT.inadimplencia) || 0
  const pctImposto = Number(p.tax_percent ?? PCT.imposto) || 0
  const labC = Math.round((Number(p.lab_price) || 0) * 100)
  const matC = Math.round((Number(p.material_cost) || 0) * 100)
  const outrosC = Math.round((Number(p.other_direct_cost) || 0) * 100)

  const cartaoC = Math.round((precoC * pctCartao) / 100)
  const comissaoC = Math.round((precoC * pctComissao) / 100)
  const inadC = Math.round((precoC * pctInad) / 100)
  const impostoC = Math.round((precoC * pctImposto) / 100)
  const custosTotaisC =
    custoHoraTotalC + cartaoC + labC + comissaoC + inadC + matC + impostoC + outrosC
  const lucroC = precoC - custosTotaisC

  return {
    preco: precoC / 100,
    minutos,
    custoMinuto,
    custoHoraTotal: custoHoraTotalC / 100,
    cartao: cartaoC / 100,
    laboratorio: labC / 100,
    comissao: comissaoC / 100,
    inadimplencia: inadC / 100,
    material: matC / 100,
    imposto: impostoC / 100,
    outros: outrosC / 100,
    custosTotais: custosTotaisC / 100,
    lucro: lucroC / 100,
    margem: precoC > 0 ? (lucroC / precoC) * 100 : 0,
  }
}

/** Densidade de centavos → reais nas interfaces (evita binário quebrado). */
export const c = (v: number) => Math.round((Number(v) || 0) * 100)

/**
 * Desconto máximo (0..100) que mantém o lucro ≥ margemMínima % do preço
 * praticado. Preço com desconto d: P′ = P·(1−d/100). Resolvendo
 * lucro(P′)/P′ = m: d = 100 − (custosVariáveis/100)/(1 − m/100), onde
 * custosVariáveis = custo hora + lab + material + outros (% de preço ficam
 * de fora: cartão/comissão/inadimplência/imposto caem junto com o preço).
 */
export function descontoMaximoC(ct: CustosProcedimento, margemMinima: number): number | null {
  const fixosC = c(ct.custoHoraTotal) + c(ct.laboratorio) + c(ct.material) + c(ct.outros)
  const m = Math.min(Math.max(Number(margemMinima) || 0, 0), 99)
  const denominador = 1 - m / 100
  if (denominador <= 0) return null
  const precoLimiteC = fixosC / denominador
  const precoAtualC = c(ct.preco)
  if (precoAtualC <= 0) return null
  const d = 100 - (precoLimiteC / precoAtualC) * 100
  if (d < 0) return 0 // nem a preço cheio atinge a margem mínima
  if (d > 100) return 100
  return d
}

/** Preço sugerido para atingir a margem alvo (lucro/alvo = margem % do preço). */
export function precoSugeridoC(ct: CustosProcedimento, margemAlvo: number): number | null {
  const fixosC = c(ct.custoHoraTotal) + c(ct.laboratorio) + c(ct.material) + c(ct.outros)
  const pctVariaveis =
    (Number(pctCartaoDe(ct)) +
      Number(pctComissaoDe(ct)) +
      Number(pctInadimplenciaDe(ct)) +
      Number(pctImpostoDe(ct))) /
    100
  const denominador = 1 - margemAlvo / 100 - pctVariaveis
  if (denominador <= 0.01) return null
  return fixosC / 100 / denominador
}

const pctCartaoDe = (ct: CustosProcedimento) =>
  ct.preco > 0 ? (c(ct.cartao) / c(ct.preco)) * 100 : PCT.cartao
const pctComissaoDe = (ct: CustosProcedimento) =>
  ct.preco > 0 ? (c(ct.comissao) / c(ct.preco)) * 100 : PCT.comissao
const pctInadimplenciaDe = (ct: CustosProcedimento) =>
  ct.preco > 0 ? (c(ct.inadimplencia) / c(ct.preco)) * 100 : PCT.inadimplencia
const pctImpostoDe = (ct: CustosProcedimento) =>
  ct.preco > 0 ? (c(ct.imposto) / c(ct.preco)) * 100 : PCT.imposto
