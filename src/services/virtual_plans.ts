import pb from '@/lib/pocketbase/client'

export type PlanKind = 'hof' | 'odontologico'
export type PlanApprovalStatus = 'rascunho' | 'aprovado'

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
  title?: string
  treatments?: TreatmentItemRecord[] | null
  payment_plan?: PaymentInstallmentRecord[] | null
  /** Anotações de desenho livre sobre a foto (JSON do CanvasAnnotator). */
  annotations?: string | null
  /** Fluxo de aprovação: rascunho (editável) ou aprovado (bloqueado). */
  approval_status?: PlanApprovalStatus
  approved_at?: string | null
  /** Data do planejamento (para a lista do mais recente → mais antigo). */
  plan_date?: string | null
  created: string
  updated: string
}

/** Lista TODOS os planejamentos do paciente, do mais recente para o mais antigo. */
export const getVirtualPlans = (patientId: string) =>
  pb.collection('virtual_plans').getFullList<VirtualPlanRecord>({
    filter: `patient="${patientId}"`,
    sort: '-created',
  })

export const createVirtualPlan = (data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').create<VirtualPlanRecord>(data)

export const updateVirtualPlan = (id: string, data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').update<VirtualPlanRecord>(id, data)

/** Data ISO (yyyy-mm-dd) usada na ordenação da lista de planejamentos. */
const todayISO = () => new Date().toISOString().slice(0, 10)

/** Título padrão de um novo planejamento. */
export const defaultPlanTitle = (kind: PlanKind, dateISO: string) =>
  `Planejamento ${kind === 'hof' ? 'HOF' : 'Odontológico'} — ${dateISO.split('-').reverse().join('/')}`

/**
 * Cria um NOVO planejamento vazio para o paciente (botão "Novo planejamento").
 * Um paciente pode ter vários planejamentos do mesmo tipo — cada um com sua
 * própria data, tratamentos, pagamento e fluxo de aprovação.
 */
export const createNewPlan = (patientId: string, kind: PlanKind): Promise<VirtualPlanRecord> => {
  const dateISO = todayISO()
  return createVirtualPlan({
    patient: patientId,
    kind,
    title: defaultPlanTitle(kind, dateISO),
    treatments: [],
    payment_plan: [],
    annotations: null,
    approval_status: 'rascunho',
    plan_date: dateISO,
  })
}

/** Carrega um planejamento específico já criado. */
export const loadPlanningState = (
  plan: VirtualPlanRecord,
): { plan: VirtualPlanRecord; state: PlanningState } => ({
  plan,
  state: {
    treatments: Array.isArray(plan.treatments) ? plan.treatments : [],
    paymentPlan: Array.isArray(plan.payment_plan) ? plan.payment_plan : [],
    annotations: typeof plan.annotations === 'string' ? plan.annotations : null,
  },
})

/** Salva (debounce externo) os tratamentos e o plano de pagamento do plano. */
export const savePlanningState = (
  plan: VirtualPlanRecord,
  state: PlanningState,
): Promise<VirtualPlanRecord> =>
  updateVirtualPlan(plan.id, {
    treatments: state.treatments,
    payment_plan: state.paymentPlan,
    ...(state.annotations !== undefined ? { annotations: state.annotations } : {}),
  })
