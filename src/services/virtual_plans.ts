import pb from '@/lib/pocketbase/client'

export type PlanKind = 'hof' | 'odontologico'

export interface TreatmentItemRecord {
  id: string
  procedureId: string
  procedureName: string
  tooth: string
  region: string
  faces: string[]
  price: number
}

export interface PaymentInstallmentRecord {
  id: string
  kind: 'entrada' | 'parcela'
  method: string
  amount: number
  due_date: string
  installments_count?: number
}

export interface PlanningState {
  treatments: TreatmentItemRecord[]
  paymentPlan: PaymentInstallmentRecord[]
  /** Anotações de desenho livre sobre a foto (JSON do CanvasAnnotator). */
  annotations?: string | null
}

export interface VirtualPlanRecord {
  id: string
  patient: string
  kind?: PlanKind
  treatments?: TreatmentItemRecord[] | null
  payment_plan?: PaymentInstallmentRecord[] | null
  /** Anotações de desenho livre sobre a foto (JSON do CanvasAnnotator). */
  annotations?: string | null
  created: string
  updated: string
}

export const getVirtualPlans = (patientId: string) =>
  pb.collection('virtual_plans').getFullList<VirtualPlanRecord>({
    filter: `patient="${patientId}"`,
    sort: '-created',
  })

export const createVirtualPlan = (data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').create<VirtualPlanRecord>(data)

export const updateVirtualPlan = (id: string, data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').update<VirtualPlanRecord>(id, data)

/**
 * Carrega (ou cria) o plano persistido de um tipo ('hof' | 'odontologico')
 * para o paciente. Um registro por paciente/tipo.
 */
export const loadPlanningState = async (
  patientId: string,
  kind: PlanKind,
): Promise<{ plan: VirtualPlanRecord; state: PlanningState }> => {
  const plans = await getVirtualPlans(patientId)
  let plan = plans.find((p) => p.kind === kind)
  if (!plan) {
    plan = await createVirtualPlan({ patient: patientId, kind, treatments: [], payment_plan: [] })
  }
  return {
    plan,
    state: {
      treatments: Array.isArray(plan.treatments) ? plan.treatments : [],
      paymentPlan: Array.isArray(plan.payment_plan) ? plan.payment_plan : [],
      annotations: typeof plan.annotations === 'string' ? plan.annotations : null,
    },
  }
}

/** Salva (debounce externo) os tratamentos e o plano de pagamento do tipo. */
export const savePlanningState = (
  plan: VirtualPlanRecord,
  state: PlanningState,
): Promise<VirtualPlanRecord> =>
  updateVirtualPlan(plan.id, {
    treatments: state.treatments,
    payment_plan: state.paymentPlan,
    ...(state.annotations !== undefined ? { annotations: state.annotations } : {}),
  })
