import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

/**
 * Planilha editável de custos/despesas mensais da clínica, separada por grupo
 * (operacional / pessoal / provisão / reserva — sem duplicidade: só os grupos
 * operacional e pessoal alimentam a hora clínica).
 */

export type CostGroup = 'operacional' | 'pessoal' | 'provisao' | 'reserva'

export const GROUP_LABELS: Record<CostGroup, string> = {
  operacional: 'Custos operacionais',
  pessoal: 'Pessoal e encargos',
  provisao: 'Provisões',
  reserva: 'Reservas',
}

export const GROUP_DESCRIPTIONS: Record<CostGroup, string> = {
  operacional:
    'Aluguel, condomínio, energia, água, marketing, contabilidade, software, manutenção, materiais…',
  pessoal: 'Pró-labore, salários, encargos.',
  provisao: 'Provisões mensais (férias, 13º, impostos a recolher) — entram na hora clínica.',
  reserva: 'Reservas e investimentos — NÃO entram na hora clínica.',
}

export interface ClinicCostItem {
  id: string
  description: string
  group: CostGroup
  category: string
  amount: number
  period_month: string
  active: boolean
  created: string
  updated: string
}

export const COST_GROUPS: CostGroup[] = ['operacional', 'pessoal', 'provisao', 'reserva']

/** Itens que somam na hora clínica: operacional + pessoal + provisões. */
export const somaHoraClinica = (items: ClinicCostItem[]) =>
  items
    .filter((i) => i.active !== false && i.group !== 'reserva')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0)

export const getClinicCostItems = (period?: string) =>
  pb.collection('clinic_cost_items').getFullList<ClinicCostItem>({
    filter: period ? `period_month="${period}"` : 'period_month!=""',
    sort: 'group,description',
  })

export const createClinicCostItem = (data: Partial<ClinicCostItem>) =>
  pb.collection('clinic_cost_items').create<ClinicCostItem>(data)

export const updateClinicCostItem = (id: string, data: Partial<ClinicCostItem>) =>
  pb.collection('clinic_cost_items').update<ClinicCostItem>(id, data)

export const deleteClinicCostItem = (id: string) => pb.collection('clinic_cost_items').delete(id)

export const currentPeriod = () => new Date().toISOString().slice(0, 7)

export const useCostItemsSync = () => {
  const { toast } = useToast()
  const toastRef = toast
  const { user } = useAuth()
  void toastRef
  void user
}
