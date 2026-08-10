import pb from '@/lib/pocketbase/client'

export interface GoalRecord {
  id: string
  professional?: string
  period: string
  target_value: number
  current_value?: number
  goal_type: 'faturamento' | 'producao' | 'conversao' | 'novos_pacientes'
  created: string
  expand?: { professional?: any }
}

export const getGoals = (filter?: string) =>
  pb
    .collection('goals')
    .getFullList<GoalRecord>({ filter, sort: '-created', expand: 'professional' })
export const createGoal = (data: Partial<GoalRecord>) =>
  pb.collection('goals').create<GoalRecord>(data)
export const updateGoal = (id: string, data: Partial<GoalRecord>) =>
  pb.collection('goals').update<GoalRecord>(id, data)
