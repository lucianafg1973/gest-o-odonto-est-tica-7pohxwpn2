import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Trash2, Plus, MapPin } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { procedureTablePrice, treatmentFromProcedure } from '@/lib/planning'
import { TreatmentItem } from '@/components/planning/TreatmentList'

/**
 * Regions of the face and neck (HOF planning). Percent-based clickable areas
 * laid over a reference image / the patient photo.
 */
export const FACE_REGIONS = [
  { id: 'testeira', label: 'Testeira / Testa', x: 50, y: 12, w: 30, h: 10 },
  { id: 'glabela', label: 'Glabela', x: 50, y: 20, w: 10, h: 5 },
  { id: 'sobrancelhas', label: 'Sobrancelhas', x: 50, y: 25, w: 34, h: 5 },
  { id: 'olhos', label: 'Região Periocular', x: 50, y: 31, w: 36, h: 7 },
  { id: 'malar', label: 'Malar (Maçã do Rosto)', x: 50, y: 39, w: 34, h: 8 },
  { id: 'nariz', label: 'Nariz / Base Nasal', x: 50, y: 45, w: 12, h: 7 },
  { id: 'lbios', label: 'Lábios / Contorno Labial', x: 50, y: 53, w: 18, h: 8 },
  { id: 'sulcos', label: 'Sulcos Nasogenianos', x: 50, y: 47, w: 34, h: 5 },
  { id: 'mento', label: 'Mento (Queixo)', x: 50, y: 63, w: 18, h: 8 },
  { id: 'mandibula', label: 'Linha Mandibular / Contorno', x: 50, y: 68, w: 40, h: 7 },
  { id: 'pescoco_anterior', label: 'Pescoço Anterior', x: 50, y: 79, w: 24, h: 12 },
  { id: 'pescoco_lateral', label: 'Pescoço Lateral', x: 50, y: 82, w: 52, h: 10 },
  { id: 'orelhas', label: 'Orelhas / Prótese Auricular', x: 50, y: 38, w: 60, h: 6 },
] as const

export type FaceRegionId = (typeof FACE_REGIONS)[number]['id']

const REGION_COLORS = [
  '#C66B4D', // terracota
  '#D4AF37', // dourado
  '#8B6914', // dourado escuro
  '#A0522D', // marrom
  '#BC8F6F', // marrom claro
]

interface Props {
  procedures: ProcedureRecord[]
  items: TreatmentItem[]
  onChange: (items: TreatmentItem[]) => void
  /** Optional patient photo shown behind the clickable regions. */
  patientPhotoUrl?: string | null
}

export function FacialPlanning({ procedures, items, onChange, patientPhotoUrl }: Props) {
  const [activeRegion, setActiveRegion] = useState<FaceRegionId | null>(null)
  const [newProcedureId, setNewProcedureId] = useState<string>('')

  const regionItems = useMemo(() => {
    const map: Record<string, TreatmentItem[]> = {}
    items.forEach((it) => {
      const key = it.region || ''
      if (!map[key]) map[key] = []
      map[key].push(it)
    })
    return map
  }, [items])

  const activeDef = FACE_REGIONS.find((r) => r.id === activeRegion)
  const activeItems = activeRegion ? regionItems[activeRegion] || [] : []
  const activeTotal = activeItems.reduce((s, it) => s + (it.price || 0), 0)

  const openRegion = (id: FaceRegionId) => {
    setActiveRegion(id)
    const first = procedures[0]
    setNewProcedureId(first?.id || '')
  }

  const addTreatmentToRegion = () => {
    if (!activeRegion) return
    const proc = procedures.find((p) => p.id === newProcedureId) || procedures[0]
    if (!proc) return
    const item = { ...treatmentFromProcedure(proc), region: activeRegion }
    onChange([...items, item])
  }

  const removeItem = (itemId: string) => onChange(items.filter((it) => it.id !== itemId))

  const updatePrice = (itemId: string, price: number) =>
    onChange(items.map((it) => (it.id === itemId ? { ...it, price } : it)))

  const hasRegionTreatments = (id: string) => (regionItems[id] || []).length > 0

  return (
    <Card className="card-warm p-4 space-y-4">
      <div>
        <CardHeader className="p-0 pb-1">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Mapa Facial HOF — Face e Pescoço
          </CardTitle>
        </CardHeader>
        <p className="text-[11px] text-[#6B4F42]">
          Clique em uma região da face ou do pescoço para planejar procedimentos (o preço vem da
          tabela e pode ser editado).
        </p>
      </div>

      <div className="relative w-full max-w-md mx-auto select-none">
        {patientPhotoUrl ? (
          <img
            src={patientPhotoUrl}
            alt="Foto do paciente"
            className="w-full rounded-xl object-cover opacity-90"
          />
        ) : (
          <img
            src="https://img.usecurling.com/p/600/800?q=face+neck+profile"
            alt="Referência facial"
            className="w-full rounded-xl object-cover"
          />
        )}
        {FACE_REGIONS.map((r, idx) => {
          const count = (regionItems[r.id] || []).length
          const color = REGION_COLORS[idx % REGION_COLORS.length]
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => openRegion(r.id)}
              title={r.label}
              className="absolute rounded-lg border-2 transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                left: `${r.x - r.w / 2}%`,
                top: `${r.y - r.h / 2}%`,
                width: `${r.w}%`,
                height: `${r.h}%`,
                borderColor: color,
                backgroundColor: count > 0 ? `${color}55` : 'transparent',
              }}
            >
              {count > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow"
                  style={{ backgroundColor: color }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {FACE_REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => openRegion(r.id)}
            className={`px-2 py-1 rounded-full border text-[10px] font-semibold transition-colors ${
              hasRegionTreatments(r.id)
                ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                : 'bg-white text-[#6B4F42] border-[#EDE3D8] hover:bg-[#FAF6F0]'
            }`}
          >
            <MapPin className="w-3 h-3 inline mr-0.5" />
            {r.label}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="border-t border-[#EDE3D8] pt-2 space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-xs">
              <span className="text-[#C66B4D] font-semibold">
                {FACE_REGIONS.find((r) => r.id === it.region)?.label || it.region || '—'}
              </span>
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
            <p className="text-xs text-[#6B4F42]">Valor total do planejamento HOF:</p>
            <p className="text-sm font-bold text-[#C66B4D]">
              {formatCurrency(items.reduce((s, t) => s + t.price, 0))}
            </p>
          </div>
        </div>
      )}

      <Dialog open={!!activeRegion} onOpenChange={(o) => !o && setActiveRegion(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              {activeDef?.label}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Adicione procedimentos planejados para esta região. O preço inicial vem da tabela e é
              editável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold">Procedimento da tabela</Label>
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
                onClick={addTreatmentToRegion}
                disabled={procedures.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" /> Incluir
              </Button>
            </div>

            {activeItems.length === 0 && (
              <p className="text-[11px] text-[#6B4F42]">Nenhum procedimento nesta região ainda.</p>
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
                <span className="text-[#6B4F42]">Subtotal da região:</span>
                <span className="font-bold text-[#C66B4D]">{formatCurrency(activeTotal)}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
