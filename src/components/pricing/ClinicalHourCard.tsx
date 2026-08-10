import { useState } from 'react'
import {
  ClinicalHourConfig,
  updateClinicalHourConfig,
  recalculateClinicalHour,
} from '@/services/clinical-hour'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Clock, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/price-calculation'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

interface Props {
  config: ClinicalHourConfig | null
  onUpdate: () => void
}

export function ClinicalHourCard({ config, onUpdate }: Props) {
  const [monthlyCost, setMonthlyCost] = useState(String(config?.monthly_operating_cost ?? ''))
  const [clinicalHours, setClinicalHours] = useState(String(config?.available_clinical_hours ?? ''))
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    setErrors({})

    const cost = parseFloat(monthlyCost)
    const hours = parseFloat(clinicalHours)

    if (isNaN(cost) || cost < 0) {
      setErrors({ monthly_operating_cost: 'Informe um valor válido (maior ou igual a zero)' })
      return
    }
    if (isNaN(hours) || hours <= 0) {
      setErrors({ available_clinical_hours: 'Informe um valor válido (maior que zero)' })
      return
    }

    setSaving(true)
    try {
      await updateClinicalHourConfig(config.id, {
        monthly_operating_cost: cost,
        available_clinical_hours: hours,
      })
      await recalculateClinicalHour()
      toast({ title: 'Configuração salva e preços recalculados!' })
      onUpdate()
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await recalculateClinicalHour()
      toast({ title: 'Preços recalculados!' })
      onUpdate()
    } catch {
      toast({ title: 'Erro ao recalcular', variant: 'destructive' })
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <Card className="card-warm">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C66B4D]" />
          Hora Clínica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
            <p className="text-[10px] text-[#6B4F42] uppercase">Valor da Hora Clínica</p>
            <p className="text-lg font-bold text-[#C66B4D]">
              {formatCurrency(config?.clinical_hour_value || 0)}
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
            <p className="text-[10px] text-[#6B4F42] uppercase">Período</p>
            <p className="text-lg font-bold text-[#2D1B14]">{config?.period || '—'}</p>
          </div>
          <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
            <p className="text-[10px] text-[#6B4F42] uppercase">Última Atualização</p>
            <p className="text-lg font-bold text-[#2D1B14]">{config?.last_updated || '—'}</p>
          </div>
        </div>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold">Custo Operacional Mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              className="bg-[#FFFDF9] border-[#EDE3D8]"
            />
            {errors.monthly_operating_cost && (
              <p className="text-xs text-red-500 mt-1">{errors.monthly_operating_cost}</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold">Horas Clínicas Disponíveis</Label>
            <Input
              type="number"
              step="0.5"
              value={clinicalHours}
              onChange={(e) => setClinicalHours(e.target.value)}
              className="bg-[#FFFDF9] border-[#EDE3D8]"
            />
            {errors.available_clinical_hours && (
              <p className="text-xs text-red-500 mt-1">{errors.available_clinical_hours}</p>
            )}
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" className="btn-terracotta-gold text-xs" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar e Recalcular'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
