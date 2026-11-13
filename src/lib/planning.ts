import { ProcedureRecord } from '@/services/procedures'
import { TreatmentItem } from '@/components/planning/TreatmentList'

/** Preço de tabela do procedimento: manual (se definido) senão o calculado/price. */
export function procedureTablePrice(p?: ProcedureRecord | null): number {
  if (!p) return 0
  if (p.use_manual_price && p.manual_price != null) return p.manual_price
  return p.price ?? p.computed_price ?? p.manual_price ?? 0
}

export function newTreatmentId() {
  return `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`
}

/** Cria um item de tratamento a partir de um procedimento, já com o preço da tabela. */
export function treatmentFromProcedure(p: ProcedureRecord): TreatmentItem {
  return {
    id: newTreatmentId(),
    procedureId: p.id,
    procedureName: p.name,
    tooth: '',
    region: '',
    faces: [],
    price: procedureTablePrice(p),
  }
}
