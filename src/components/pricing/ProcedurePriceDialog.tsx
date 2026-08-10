import { useState, useEffect, useMemo } from 'react'
import { ProcedureRecord, updateProcedure } from '@/services/procedures'
import {
  calculateFinalPrice,
  formatCurrency,
  calculateClinicalHourPortion,
} from '@/lib/price-calculation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

interface Props {
  procedure: ProcedureRecord | null
  clinicalHourValue: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const FIELD_DEFS = [
  { key: 'card_fee_percent', label: 'Taxa de Cartão (%)' },
  { key: 'ir_percent', label: 'Taxa de IR (%)' },
  { key: 'material_cost', label: 'Material Específico (R$)' },
  { key: 'sales_commission_percent', label: 'Comissão de Venda (%)' },
  { key: 'executor_percent', label: 'Repasse ao Executor (%)' },
  { key: 'rework_cost', label: 'Retrabalho (R$)' },
  { key: 'lab_price', label: 'Preço do Laboratório (R$)' },
]

export function ProcedurePriceDialog({
  procedure,
  clinicalHourValue,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [useManual, setUseManual] = useState(false)
  const [manualPrice, setManualPrice] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (procedure) {
      const initial: Record<string, string> = {}
      FIELD_DEFS.forEach((f) => {
        initial[f.key] = String((procedure as any)[f.key] ?? '')
      })
      setForm(initial)
      setUseManual(procedure.use_manual_price ?? false)
      setManualPrice(String(procedure.manual_price ?? ''))
    }
    setErrors({})
  }, [procedure])

  const numVal = (key: string) => parseFloat(form[key]) || 0

  const clinicalHourPortion = useMemo(
    () => calculateClinicalHourPortion(clinicalHourValue, procedure?.duration_minutes || 0),
    [clinicalHourValue, procedure?.duration_minutes],
  )

  const computedPrice = useMemo(() => {
    if (!procedure) return 0
    return calculateFinalPrice({
      clinical_hour_value: clinicalHourValue,
      duration_minutes: procedure.duration_minutes || 0,
      card_fee_percent: numVal('card_fee_percent'),
      ir_percent: numVal('ir_percent'),
      material_cost: numVal('material_cost'),
      sales_commission_percent: numVal('sales_commission_percent'),
      executor_percent: numVal('executor_percent'),
      rework_cost: numVal('rework_cost'),
      lab_price: numVal('lab_price'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, clinicalHourValue, procedure])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!procedure) return
    setErrors({})

    const newErrors: FieldErrors = {}
    FIELD_DEFS.forEach((f) => {
      if (form[f.key] && numVal(f.key) < 0) {
        newErrors[f.key] = 'O valor não pode ser negativo'
      }
    })
    if (useManual && (!manualPrice || parseFloat(manualPrice) <= 0)) {
      newErrors.manual_price = 'Informe um preço manual válido'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    try {
      await updateProcedure(procedure.id, {
        card_fee_percent: numVal('card_fee_percent'),
        ir_percent: numVal('ir_percent'),
        material_cost: numVal('material_cost'),
        sales_commission_percent: numVal('sales_commission_percent'),
        executor_percent: numVal('executor_percent'),
        rework_cost: numVal('rework_cost'),
        lab_price: numVal('lab_price'),
        use_manual_price: useManual,
        manual_price: useManual ? parseFloat(manualPrice) || 0 : 0,
        computed_price: computedPrice,
        price: useManual ? parseFloat(manualPrice) || 0 : computedPrice,
      })
      toast({ title: 'Preço atualizado!' })
      onOpenChange(false)
      onSaved()
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!procedure) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-[#EDE3D8] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">{procedure.name}</DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Duração: {procedure.duration_minutes || 0} min • Categoria: {procedure.category}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B4F42]">
                Hora Clínica ({procedure.duration_minutes || 0}min ×{' '}
                {formatCurrency(clinicalHourValue)})
              </p>
              <p className="text-lg font-bold text-[#C66B4D]">
                {formatCurrency(clinicalHourPortion)}
              </p>
            </div>
            <Badge className="bg-[#D4AF37] text-[#2D1B14]">Automático</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELD_DEFS.map((f) => (
              <div key={f.key}>
                <Label className="text-xs font-semibold">{f.label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="bg-[#FFFDF9] border-[#EDE3D8]"
                />
                {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
              </div>
            ))}
          </div>
          <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#2D1B14]">Preço Calculado</p>
              <p className="text-xl font-bold text-[#2D1B14]">{formatCurrency(computedPrice)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#EDE3D8]">
              <div className="flex items-center gap-2">
                <Switch checked={useManual} onCheckedChange={setUseManual} />
                <Label className="text-xs font-semibold cursor-pointer">Definir preço manual</Label>
              </div>
              {useManual && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B4F42]">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-28 bg-[#FFFDF9] border-[#EDE3D8]"
                  />
                </div>
              )}
            </div>
            {errors.manual_price && (
              <p className="text-xs text-red-500 mt-1">{errors.manual_price}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-terracotta-gold" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
