import { PlanDocSnapshot } from '@/lib/plan-doc'

/**
 * Resumo dos tratamentos ativos do snapshot (aprovação e documentos) —
 * sem valores: o valor final aparece uma única vez ("Investimento total").
 */
export interface AtivoResumo {
  nome: string
  local: string
  qtd: number
  incluidoNoGlobal?: boolean
}

/** Itens não cancelados, no formato resumido para exibição em listas. */
export function ativosResumo(treatments: PlanDocSnapshot['treatments']): AtivoResumo[] {
  return (treatments || [])
    .filter((t) => t.status !== 'cancelado')
    .map((t) => ({
      nome: t.procedureName || 'Procedimento',
      local: t.tooth
        ? `Dente ${t.tooth}${t.faces?.length ? ` (faces ${t.faces.join(', ')})` : ''}`
        : t.region || '—',
      qtd: t.quantity || 1,
      incluidoNoGlobal: t.incluidoNoGlobal,
    }))
}
