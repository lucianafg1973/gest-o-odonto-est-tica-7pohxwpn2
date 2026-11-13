import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { procedureTablePrice, treatmentFromProcedure } from '@/lib/planning'
import { TreatmentItem } from '@/components/planning/TreatmentList'

/**
 * Visual odontogram: permanent teeth 18-11 / 21-28 / 48-41 / 31-38 and
 * deciduous 55-51 / 61-65 / 85-81 / 71-75, drawn as tooth shapes. Clicking a
 * tooth opens treatment selection (multiple treatments accumulate per tooth)
 * and the tooth is colored by its treatments.
 */

const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const PERMANENT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
const PERMANENT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]

const DECIDUOUS_UPPER_RIGHT = [55, 54, 53, 52, 51]
const DECIDUOUS_UPPER_LEFT = [61, 62, 63, 64, 65]
const DECIDUOUS_LOWER_RIGHT = [85, 84, 83, 82, 81]
const DECIDUOUS_LOWER_LEFT = [71, 72, 73, 74, 75]

const TOOTH_COLORS = {
  none: '#FDF9F3',
  planned: '#D4AF37', // dourado — planejado
  multi: '#C66B4D', // terracota — múltiplos tratamentos
}

type ToothColorKey = keyof typeof TOOTH_COLORS

function ToothShape({ n, color, onClick }: { n: number; color: string; onClick: () => void }) {
  const isUpper = n < 40 || (n >= 50 && n < 80)
  const stroke = color === TOOTH_COLORS.none ? '#C9B8A8' : color
  const fill = color === TOOTH_COLORS.none ? '#FFFFFF' : `${color}33`
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-0.5 focus:outline-none"
      title={`Dente ${n}`}
    >
      <svg viewBox="0 0 20 26" className="w-6 h-7">
        {/* crown */}
        <path
          d={
            isUpper
              ? 'M4 2 Q10 -1 16 2 Q18 6 16 11 Q10 13 4 11 Q2 6 4 2 Z'
              : 'M5 15 Q10 13 15 15 Q17 20 14 24 Q10 26 6 24 Q3 20 5 15 Z'
          }
          fill={fill}
          stroke={stroke}
          strokeWidth="1.4"
        />
        {isUpper && <path d="M4 11 Q10 13 16 11" fill="none" stroke={stroke} strokeWidth="1" />}
      </svg>
      <span className="text-[8px] font-semibold text-[#6B4F42] group-hover:text-[#C66B4D]">
        {n}
      </span>
    </button>
  )
}

interface Props {
  procedures: ProcedureRecord[]
  items: TreatmentItem[]
  onChange: (items: TreatmentItem[]) => void
}

export function OdontogramNew({ procedures, items, onChange }: Props) {
  const [activeTooth, setActiveTooth] = useState<number | null>(null)
  const [newProcedureId, setNewProcedureId] = useState<string>('')

  const byTooth = useMemo(() => {
    const map: Record<string, TreatmentItem[]> = {}
    items.forEach((it) => {
      const key = String(it.tooth || '').trim()
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(it)
    })
    return map
  }, [items])

  const toothColor = (n: number): ToothColorKey => {
    const list = byTooth[String(n)]
    if (!list || list.length === 0) return 'none'
    return list.length > 1 ? 'multi' : 'planned'
  }

  const activeItems = activeTooth != null ? byTooth[String(activeTooth)] || [] : []
  const activeTotal = activeItems.reduce((s, it) => s + (it.price || 0), 0)

  const openTooth = (n: number) => {
    setActiveTooth(n)
    setNewProcedureId(procedures[0]?.id || '')
  }

  const addTreatment = () => {
    if (activeTooth == null) return
    const proc = procedures.find((p) => p.id === newProcedureId) || procedures[0]
    if (!proc) return
    const item = {
      ...treatmentFromProcedure(proc),
      tooth: String(activeTooth),
      region: String(activeTooth),
    }
    onChange([...items, item])
  }

  const removeItem = (itemId: string) => onChange(items.filter((it) => it.id !== itemId))

  const updatePrice = (itemId: string, price: number) =>
    onChange(items.map((it) => (it.id === itemId ? { ...it, price } : it)))

  const Row = ({ nums }: { nums: number[] }) => (
    <div className="flex gap-1">
      {nums.map((n) => (
        <ToothShape
          key={n}
          n={n}
          color={TOOTH_COLORS[toothColor(n)]}
          onClick={() => openTooth(n)}
        />
      ))}
    </div>
  )

  return (
    <Card className="card-warm p-4 space-y-4">
      <div>
        <CardHeader className="p-0 pb-1">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Odontograma — Planejamento Odontológico
          </CardTitle>
        </CardHeader>
        <p className="text-[11px] text-[#6B4F42]">
          Clique em um dente para adicionar tratamentos (canal, restauração, pino etc.). O preço vem
          da tabela e é editável; o dente fica colorido conforme os tratamentos marcados.
        </p>
      </div>

      {/* Permanent dentition */}
      <div className="space-y-1 overflow-x-auto">
        <div className="flex gap-4 justify-center">
          <Row nums={PERMANENT_UPPER_RIGHT} />
          <div className="w-px bg-[#EDE3D8]" />
          <Row nums={PERMANENT_UPPER_LEFT} />
        </div>
        <div className="flex gap-4 justify-center">
          <Row nums={PERMANENT_LOWER_RIGHT} />
          <div className="w-px bg-[#EDE3D8]" />
          <Row nums={PERMANENT_LOWER_LEFT} />
        </div>
      </div>

      {/* Deciduous dentition */}
      <div className="space-y-1 overflow-x-auto pt-2 border-t border-dashed border-[#EDE3D8]">
        <p className="text-[10px] font-bold uppercase text-[#6B4F42] text-center">
          Dentição Decídua (infantil)
        </p>
        <div className="flex gap-4 justify-center">
          <Row nums={DECIDUOUS_UPPER_RIGHT} />
          <div className="w-px bg-[#EDE3D8]" />
          <Row nums={DECIDUOUS_UPPER_LEFT} />
        </div>
        <div className="flex gap-4 justify-center">
          <Row nums={DECIDUOUS_LOWER_RIGHT} />
          <div className="w-px bg-[#EDE3D8]" />
          <Row nums={DECIDUOUS_LOWER_LEFT} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-[#6B4F42]">
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded border border-[#D4AF37]"
            style={{ backgroundColor: `${TOOTH_COLORS.planned}33` }}
          />
          1 tratamento
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded border border-[#C66B4D]"
            style={{ backgroundColor: `${TOOTH_COLORS.multi}33` }}
          />
          múltiplos tratamentos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-[#C9B8A8] bg-white" />
          sem planejamento
        </span>
      </div>

      {items.length > 0 && (
        <div className="border-t border-[#EDE3D8] pt-2 space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-xs">
              <Badge className="bg-[#2D1B14] text-white text-[9px] px-1.5">Dente {it.tooth}</Badge>
              <span className="text-[#2D1B14]">{it.procedureName}</span>
              <span className="ml-auto font-bold text-[#2D1B14]">{formatCurrency(it.price)}</span>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                onClick={() => removeItem(it.id)}
                title="Remover"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex justify-end items-center gap-2 border-t border-[#EDE3D8] pt-2">
            <p className="text-xs text-[#6B4F42]">Valor total do planejamento odontológico:</p>
            <p className="text-sm font-bold text-[#C66B4D]">
              {formatCurrency(items.reduce((s, t) => s + t.price, 0))}
            </p>
          </div>
        </div>
      )}

      <Dialog open={activeTooth != null} onOpenChange={(o) => !o && setActiveTooth(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Dente {activeTooth}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Adicione vários tratamentos para este dente (canal, restauração, bloco, pino…). Preço
              editável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold">Tratamento da tabela</Label>
                <Select value={newProcedureId} onValueChange={setNewProcedureId}>
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

            {activeItems.length === 0 && (
              <p className="text-[11px] text-[#6B4F42]">Nenhum tratamento neste dente ainda.</p>
            )}

            <div className="space-y-2">
              {activeItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 bg-[#FAF6F0] rounded-lg p-2 border border-[#EDE3D8]"
                >
                  <span className="text-xs font-semibold text-[#2D1B14] flex-1 min-w-0 truncate">
                    {it.procedureName}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.price}
                    onChange={(e) => updatePrice(it.id, Number(e.target.value))}
                    className="w-28 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                    onClick={() => removeItem(it.id)}
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {activeItems.length > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[#EDE3D8]">
                <span className="text-[#6B4F42]">Subtotal do dente:</span>
                <span className="font-bold text-[#C66B4D]">{formatCurrency(activeTotal)}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
