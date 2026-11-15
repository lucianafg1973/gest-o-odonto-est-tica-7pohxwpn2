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
  /** Nome do usuário que aprovou (migração 0013). */
  approved_by?: string | null
  /** Nº da versão do planejamento (migração 0013). */
  plan_version?: number | null
  /** Assinatura do PACIENTE — independente da aprovação (migração 0014). */
  signature_status?: 'nao_assinado' | 'assinado' | null
  signed_at?: string | null
  signed_by?: string | null
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

/** Exclui definitivamente um planejamento (e seus tratamentos, que vivem no JSON dele). */
export const deleteVirtualPlan = (id: string) => pb.collection('virtual_plans').delete(id)

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
export const loadPlanningState = (plan: VirtualPlanRecord): PlanningState => ({
  treatments: Array.isArray(plan.treatments) ? plan.treatments : [],
  paymentPlan: Array.isArray(plan.payment_plan) ? plan.payment_plan : [],
  annotations: typeof plan.annotations === 'string' ? plan.annotations : null,
})

/** Espera `ms` milissegundos (usado no backoff do 429). */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Salva os tratamentos e o plano de pagamento do plano, com:
 * - repetição automática quando o servidor recusa com "Too Many Requests" (429),
 *   em backoff crescente (400ms → 800ms → 1,6s → 3,2s);
 * - guard contra salvar um plano que acabou de ser excluído (404 é tratado como
 *   "plano já não existe" e NÃO fica em loop de retry).
 */
export const savePlanningState = async (
  plan: VirtualPlanRecord,
  state: PlanningState,
): Promise<VirtualPlanRecord> => {
  const maxAttempts = 4
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(400 * Math.pow(2, attempt - 1))
    try {
      return await updateVirtualPlan(plan.id, {
        treatments: state.treatments,
        payment_plan: state.paymentPlan,
        ...(state.annotations !== undefined ? { annotations: state.annotations } : {}),
      })
    } catch (err: any) {
      lastError = err
      const status = err?.status ?? err?.response?.status ?? err?.originalError?.status
      // 404 = plano foi excluído enquanto isso → não adianta insistir.
      if (status === 404) throw err
      if (status === 429) continue // "Too Many Requests" → tenta de novo no backoff
      throw err
    }
  }
  throw lastError
}
