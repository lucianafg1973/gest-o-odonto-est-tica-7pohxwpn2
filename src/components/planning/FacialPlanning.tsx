import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CanvasAnnotator } from '@/components/virtual-planning/CanvasAnnotator'
import { toast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { procedureTablePrice, treatmentFromProcedure } from '@/lib/planning'
import { TreatmentItem } from '@/components/planning/TreatmentList'

interface Props {
  procedures: ProcedureRecord[]
  items: TreatmentItem[]
  onChange: (items: TreatmentItem[]) => void
  /** Foto do paciente exibida para referência/desenho livre (CanvasAnnotator). */
  patientPhotoUrl?: string | null
}

/**
 * Planejamento HOF: foto da face/pescoço (sem áreas clicáveis sobrepostas),
 * com anotação/desenho livre quando uma foto foi escolhida na galeria, e uma
 * tabela abaixo da foto para inserir procedimentos com preço editável.
 */
export function FacialPlanning({ procedures, items, onChange, patientPhotoUrl }: Props) {
  const [newProcedureId, setNewProcedureId] = useState<string>(procedures[0]?.id || '')
  const [newPrice, setNewPrice] = useState<string>('')

  const addTreatment = () => {
    const proc = procedures.find((p) => p.id === newProcedureId) || procedures[0]
    if (!proc) return
    const item = treatmentFromProcedure(proc)
    item.price = newPrice !== '' ? Number(newPrice) : item.price
    onChange([...items, item])
    setNewPrice('')
    setNewProcedureId(procedures[0]?.id || '')
  }

  return (
    <Card className="card-warm p-4 space-y-4">
      <div>
        <CardHeader className="p-0 pb-1">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Planejamento HOF — Face e Pescoço
          </CardTitle>
        </CardHeader>
        <p className="text-[11px] text-[#6B4F42]">
          {patientPhotoUrl
            ? 'Use o desenho livre abaixo para anotar sobre a foto do paciente. Insira os procedimentos na tabela abaixo (o preço vem da tabela e pode ser editado).'
            : 'Selecione uma foto na aba "Fotografias e Radiografias" para anotar sobre a foto. Insira os procedimentos na tabela abaixo (o preço vem da tabela e pode ser editado).'}
        </p>
      </div>

      <div className="w-full max-w-md mx-auto select-none">
        {patientPhotoUrl ? (
          <CanvasAnnotator
            imageUrl={patientPhotoUrl}
            onSave={() => toast({ title: 'Planejamento HOF salvo com sucesso!' })}
          />
        ) : (
          <img
            src="https://img.usecurling.com/p/600/800?q=face+neck+profile"
            alt="Referência facial"
            className="w-full rounded-xl object-cover"
          />
        )}
      </div>

      {/* Tabela de inserção de procedimentos (padrão TreatmentList) */}
      <div className="space-y-2 border-t border-[#EDE3D8] pt-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs font-semibold">Procedimento da tabela</Label>
            <Select
              value={newProcedureId}
              onValueChange={(v) => {
                setNewProcedureId(v)
                setNewPrice('')
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
          <div className="w-28 space-y-1">
            <Label className="text-xs font-semibold">Valor (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              placeholder={
                procedures.find((p) => p.id === newProcedureId)
                  ? String(procedureTablePrice(procedures.find((p) => p.id === newProcedureId)))
                  : '0.00'
              }
              onChange={(e) => setNewPrice(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="btn-terracotta-gold text-xs"
            onClick={addTreatment}
            disabled={procedures.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" /> Incluir
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-[11px] text-[#6B4F42]">
            Nenhum procedimento planejado ainda — use a linha acima para inserir.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-white border border-[#EDE3D8] rounded-xl p-2"
              >
                <div className="sm:col-span-7 space-y-1">
                  <Label className="text-[10px] font-semibold">Procedimento</Label>
                  <Select
                    value={it.procedureId}
                    onValueChange={(v) => {
                      const proc = procedures.find((p) => p.id === v)
                      onChange(
                        items.map((x) =>
                          x.id === it.id
                            ? {
                                ...x,
                                procedureId: v,
                                procedureName: proc?.name || '',
                                price: procedureTablePrice(proc),
                              }
                            : x,
                        ),
                      )
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
                  <Label className="text-[10px] font-semibold">Valor (R$) — editável</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.price}
                    onChange={(e) =>
                      onChange(
                        items.map((x) =>
                          x.id === it.id ? { ...x, price: Number(e.target.value) } : x,
                        ),
                      )
                    }
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    className="w-9 px-0 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                    title="Remover"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end items-center gap-2 border-t border-[#EDE3D8] pt-2">
              <p className="text-xs text-[#6B4F42]">Valor total do planejamento HOF:</p>
              <p className="text-sm font-bold text-[#C66B4D]">
                {formatCurrency(items.reduce((s, t) => s + (t.price || 0), 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
