import pb from '@/lib/pocketbase/client'

export interface ClinicalHourConfig {
  id: string
  monthly_operating_cost: number
  available_clinical_hours: number
  clinical_hour_value: number
  period: string
  last_updated?: string
}

export const getClinicalHourConfig = async () => {
  const list = await pb.collection('clinical_hour_config').getFullList<ClinicalHourConfig>({
    sort: '-period',
  })
  return list[0] || null
}

export const updateClinicalHourConfig = async (id: string, data: Partial<ClinicalHourConfig>) => {
  const updated = { ...data }
  if (data.monthly_operating_cost !== undefined && data.available_clinical_hours !== undefined) {
    updated.clinical_hour_value = data.monthly_operating_cost / data.available_clinical_hours
  }
  return pb.collection('clinical_hour_config').update<ClinicalHourConfig>(id, updated)
}

export const recalculateClinicalHour = () =>
  pb.send('/backend/v1/clinical-hour/recalculate', { method: 'POST' })
