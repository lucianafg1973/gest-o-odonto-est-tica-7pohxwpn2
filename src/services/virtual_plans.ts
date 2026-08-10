import pb from '@/lib/pocketbase/client'

export interface VirtualPlanRecord {
  id: string
  patient: string
  image?: string
  title: string
  annotations?: string
  plan_content?: string
  created: string
  expand?: {
    image?: any
    patient?: any
  }
}

export const getVirtualPlans = (patientId?: string) =>
  pb.collection('virtual_plans').getFullList<VirtualPlanRecord>({
    filter: patientId ? `patient = "${patientId}"` : '',
    sort: '-created',
    expand: 'image,patient',
  })

export const createVirtualPlan = (data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').create<VirtualPlanRecord>(data)
export const updateVirtualPlan = (id: string, data: Partial<VirtualPlanRecord>) =>
  pb.collection('virtual_plans').update<VirtualPlanRecord>(id, data)
