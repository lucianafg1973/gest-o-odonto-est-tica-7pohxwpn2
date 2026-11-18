import pb from '@/lib/pocketbase/client'

/**
 * Configuração GLOBAL de percentuais da aba Precificação (planilha
 * "Situação Atual"). Coleção pricing_config (migração 20251117100004), linha
 * única: cartão, comissão, inadimplência e imposto são percentuais POR COLUNA,
 * editáveis no cabeçalho da tabela — as células das linhas são calculadas.
 */
export interface PricingConfigRecord {
  id: string
  card_fee_percent?: number
  sales_commission_percent?: number
  default_percent?: number
  tax_percent?: number
}

/** Fallbacks: mesmos valores do seed de procedimentos (10/3/4/12). */
export const PCT_PADRAO = {
  cartao: 10,
  comissao: 3,
  inadimplencia: 4,
  imposto: 12,
} as const

/** Carrega a linha única de configuração (ou null quando ainda não existe). */
export async function getPricingConfig(): Promise<PricingConfigRecord | null> {
  try {
    return await pb.collection('pricing_config').getFirstListItem<PricingConfigRecord>('')
  } catch {
    return null
  }
}

export const updatePricingConfig = (id: string, data: Partial<PricingConfigRecord>) =>
  pb.collection('pricing_config').update<PricingConfigRecord>(id, data)

/** Cria a linha única com os percentuais padrão (usada ao editar sem registro). */
export async function ensurePricingConfig(): Promise<PricingConfigRecord> {
  const existente = await getPricingConfig()
  if (existente) return existente
  return pb.collection('pricing_config').create<PricingConfigRecord>(PCT_PADRAO)
}
