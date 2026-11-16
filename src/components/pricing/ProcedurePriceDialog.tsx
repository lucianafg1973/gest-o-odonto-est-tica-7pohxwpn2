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
import { SPECIALTIES, FAMILY_SUGGESTIONS } from '@/lib/pricing-engine'

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
  const [maxDesconto, setMaxDesconto] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [family, setFamily] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (procedure) {
      const initial: Record<string, string> = {}
      FIELD_DEFS.forEach((f) => {
        initial[f.key] = String((procedure as any)[f.key] ?? '')
      })
      setForm(initial)
      setSpecialty(procedure.specialty || '')
      setFamily(procedure.family || '')
      setUseManual(procedure.use_manual_price ?? false)
      setManualPrice(String(procedure.manual_price ?? ''))
      setMaxDesconto(
        procedure.max_discount_percent != null ? String(procedure.max_discount_percent) : '',
      )
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
    if (maxDesconto && (parseFloat(maxDesconto) < 0 || parseFloat(maxDesconto) > 100)) {
      newErrors.max_discount_percent = 'Informe um percentual entre 0 e 100'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    try {
      await updateProcedure(procedure.id, {
        specialty,
        family,
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
        max_discount_percent: maxDesconto.trim() === '' ? null : parseFloat(maxDesconto),
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Especialidade</Label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                <option value="">—</option>
                {opcoesEspecialidade(procedure).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Família</Label>
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                <option value="">—</option>
                {opcoesFamilia(procedure).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#6B4F42] mt-1">
                Reflete na cascata do “Adicionar procedimento” do planejamento.
              </p>
            </div>
          </div>
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
          <div>
            <Label className="text-xs font-semibold">Desconto máximo permitido (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={maxDesconto}
              onChange={(e) => setMaxDesconto(e.target.value)}
              placeholder="0"
              className="bg-[#FFFDF9] border-[#EDE3D8]"
            />
            <p className="text-[10px] text-[#6B4F42] mt-1">
              Limite gerencial de desconto sobre o preço oficial deste procedimento.
            </p>
            {errors.max_discount_percent && (
              <p className="text-xs text-red-500 mt-1">{errors.max_discount_percent}</p>
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

function opcoesEspecialidade(procedure: ProcedureRecord): string[] {
  const base = Array.from(new Set(SPECIALTIES as readonly string[]))
  if (procedure.specialty && !base.includes(procedure.specialty)) base.push(procedure.specialty)
  return base.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function opcoesFamilia(procedure: ProcedureRecord): string[] {
  const base = Array.from(new Set(Object.values(FAMILY_SUGGESTIONS).flat() as readonly string[]))
  if (procedure.family && !base.includes(procedure.family)) base.push(procedure.family)
  return base.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
