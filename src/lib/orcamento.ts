/**
 * Utilitários do orçamento — regra dos protocolos globais.
 * (Teste 3: protocolo com preço global não soma novamente os itens incluídos;
 * Teste 4: subtotais por arcada e total geral.)
 */

export interface OrcamentoItem {
  id: string
  price: number
  quantity: number
  categoria?: string
  modalidadePreco?: 'global' | 'individual'
  incluidoNoGlobal?: boolean
  arcada?: 'superior' | 'inferior' | 'ambas'
  status?: string
}

export const itemCents = (it: OrcamentoItem) =>
  Math.round((it.price || 0) * 100) * Math.max(1, it.quantity || 1)

/**
 * Itens que entram no orçamento: não cancelados e não "incluídos no global"
 * (o valor global do protocolo já cobre esses itens).
 */
export function itensOrcamentaveis(items: OrcamentoItem[]): OrcamentoItem[] {
  return items.filter(
    (it) =>
      it.status !== 'cancelado' &&
      !(it.incluidoNoGlobal === true && it.modalidadePreco === 'global'),
  )
}

/** Total do orçamento em centavos. */
export function orcamentoCents(items: OrcamentoItem[]): number {
  return itensOrcamentaveis(items).reduce((s, it) => s + itemCents(it), 0)
}

/** Total do orçamento em reais. */
export const orcamentoTotal = (items: OrcamentoItem[]) => Math.round(orcamentoCents(items)) / 100

/** Subtotal por arcada (reais) — apenas protocolos, para o painel por arcada. */
export function subtotaisPorArcada(items: OrcamentoItem[]) {
  const acc: Record<'superior' | 'inferior' | 'ambas', number> = {
    superior: 0,
    inferior: 0,
    ambas: 0,
  }
  items
    .filter((it) => it.categoria === 'protocolo' && it.status !== 'cancelado')
    .forEach((it) => {
      const key = it.arcada || 'ambas'
      acc[key] = acc[key] + itemCents(it)
    })
  return {
    superiorCents: acc.superior,
    inferiorCents: acc.inferior,
    ambasCents: acc.ambas,
    superior: Math.round(acc.superior) / 100,
    inferior: Math.round(acc.inferior) / 100,
    ambas: Math.round(acc.ambas) / 100,
  }
}

/** Mensagem do painel financeiro quando não há itens ou preços. */
export function mensagemOrcamento(items: OrcamentoItem[]): string | null {
  const ativos = items.filter((it) => it.status !== 'cancelado')
  if (ativos.length === 0) {
    return 'Nenhum procedimento adicionado ao planejamento. Selecione dentes no odontograma ou use "Adicionar tratamento" para começar o orçamento.'
  }
  const orc = itensOrcamentaveis(ativos)
  if (orc.every((it) => !it.price || it.price <= 0)) {
    return 'Existem procedimentos no planejamento, mas todos sem preço. Preencha o valor unitário de cada item (ou cadastre preços na Tabela de Preços) — o total não pode ser R$ 0,00 com itens válidos.'
  }
  return null
}
