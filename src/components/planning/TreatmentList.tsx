import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { procedureTablePrice, treatmentFromProcedure } from '@/lib/planning'

export interface TreatmentItem {
  id: string
  procedureId: string
  procedureName: string
  tooth: string
  /** Região da face/pescoço (usada no Planejamento HOF). */
  region: string
  faces: string[]
  price: number
}

interface Props {
  title: string
  description?: string
  procedures: ProcedureRecord[]
  items: TreatmentItem[]
  onChange: (items: TreatmentItem[]) => void
  /** Rótulo do campo de localização (ex.: "Dente(s)" ou "Região"). */
  locationLabel?: string
  locationPlaceholder?: string
}

export function TreatmentList({
  title,
  description,
  procedures,
  items,
  onChange,
  locationLabel = 'Localização',
  locationPlaceholder = 'Ex.: 11, 12 ou região',
}: Props) {
  const addItem = () => {
    const first = procedures[0]
    if (!first) return
    onChange([...items, treatmentFromProcedure(first)])
  }

  const updateItem = (id: string, patch: Partial<TreatmentItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const removeItem = (id: string) => onChange(items.filter((it) => it.id !== id))

  return (
    <Card className="card-warm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            {title}
          </CardTitle>
          {description && <p className="text-[11px] text-[#6B4F42] mt-1">{description}</p>}
        </div>
        <Button
          size="sm"
          type="button"
          className="btn-terracotta-gold text-xs"
          onClick={addItem}
          disabled={procedures.length === 0}
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar Tratamento
        </Button>
      </div>

      {procedures.length === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Nenhum procedimento cadastrado na tabela de preços. Cadastre procedimentos na aba
          &quot;Tabela de Preços&quot;.
        </p>
      )}

      {items.length === 0 && procedures.length > 0 && (
        <p className="text-[11px] text-[#6B4F42]">
          Nenhum tratamento adicionado a este planejamento ainda.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-[#EDE3D8] rounded-xl p-3 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
          >
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[10px] font-semibold">Procedimento</Label>
              <Select
                value={item.procedureId}
                onValueChange={(v) => {
                  const proc = procedures.find((p) => p.id === v)
                  updateItem(item.id, {
                    procedureId: v,
                    procedureName: proc?.name || '',
                    price: procedureTablePrice(proc),
                  })
                }}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} — {formatCurrency(procedureTablePrice(p))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-[10px] font-semibold">{locationLabel}</Label>
              <Input
                value={item.region || item.tooth}
                onChange={(e) =>
                  updateItem(item.id, { region: e.target.value, tooth: e.target.value })
                }
                placeholder={locationPlaceholder}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-[10px] font-semibold">Valor (R$) — editável</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="w-9 px-0 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => removeItem(item.id)}
                title="Remover tratamento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex justify-end items-center gap-2 border-t border-[#EDE3D8] pt-2">
          <p className="text-xs text-[#6B4F42]">Valor total do planejamento:</p>
          <p className="text-sm font-bold text-[#C66B4D]">
            {formatCurrency(items.reduce((s, it) => s + (it.price || 0), 0))}
          </p>
        </div>
      )}
    </Card>
  )
}
