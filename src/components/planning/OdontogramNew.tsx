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
import { Trash2, Plus, Lock } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { procedureTablePrice, treatmentFromProcedure } from '@/lib/planning'
import { TreatmentItem } from '@/components/planning/TreatmentList'

/**
 * Visual odontograma: permanentes 18-11 / 21-28 / 48-41 / 31-38 e decíduos
 * 55-51 / 61-65 / 85-81 / 71-75. Cada dente é desenhado como um dente (coroa +
 * raízes) e as arcadas ficam em fileiras horizontais retas e paralelas —
 * fileira superior com coroas para baixo, fileira inferior com coroas para
 * cima. Dente clicável, múltiplos tratamentos por dente, preço da tabela
 * pré-preenchido e editável, dente colorido conforme os tratamentos.
 * Quando `locked` (plano aprovado), o odontograma fica somente leitura.
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
  planned: '#D4AF37', // dourado — 1 tratamento planejado
  multi: '#C66B4D', // terracota — múltiplos tratamentos
}

type ToothColorKey = keyof typeof TOOTH_COLORS

const TOOTH_WIDTH = 30
const TOOTH_HEIGHT = 44
const TOOTH_GAP = 4

function toothFill(color: string) {
  return color === TOOTH_COLORS.none ? '#FFFFFF' : `${color}55`
}

function toothStroke(color: string) {
  return color === TOOTH_COLORS.none ? '#C9B8A8' : color
}

/**
 * Desenho de um dente isolado, em coordenadas locais 0..30 x 0..44:
 * coroa (parte larga, arredondada, borda incisal/oclusal embaixo) + duas
 * raízes afiladas na ponta (em cima). O grupo é espelhado para a arcada
 * inferior.
 */
const TOOTH_PATH = [
  // Coroa: base larga levemente ondulada (borda incisal/oclusal)
  'M 3 44',
  'Q 0 42 0 36',
  'L 0 26',
  'Q 0 20 4 17',
  // Pescoço (cervical) e raízes
  'Q 6 12 6 9',
  'Q 6 3 9 1',
  'Q 11 0 13 3',
  'Q 15 5 15 9',
  'Q 15 5 17 3',
  'Q 19 0 21 1',
  'Q 24 3 24 9',
  'Q 24 12 26 17',
  'Q 30 20 30 26',
  'L 30 36',
  'Q 30 42 27 44',
  'Q 15 40 3 44',
  'Z',
].join(' ')

function ToothSvg({
  number,
  color,
  isUpper,
  locked = false,
  onToothClick,
}: {
  number: number
  color: string
  isUpper: boolean
  locked?: boolean
  onToothClick: (n: number) => void
}) {
  return (
    <svg
      width={TOOTH_WIDTH}
      height={TOOTH_HEIGHT}
      viewBox={`0 0 ${TOOTH_WIDTH} ${TOOTH_HEIGHT}`}
      role="img"
      aria-label={`Dente ${number}`}
      className={locked ? '' : 'cursor-pointer transition-transform hover:scale-110'}
      onClick={locked ? undefined : () => onToothClick(number)}
    >
      <title>{`Dente ${number}`}</title>
      <g transform={isUpper ? undefined : 'rotate(180 15 22)'}>
        <path
          d={TOOTH_PATH}
          fill={toothFill(color)}
          stroke={toothStroke(color)}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Linha cervical sutil separando coroa e raízes */}
        <path
          d="M 4 17 Q 15 21 26 17"
          fill="none"
          stroke={toothStroke(color)}
          strokeWidth="0.9"
          opacity="0.7"
        />
      </g>
    </svg>
  )
}

/**
 * Uma fileira reta de dentes (metade direita + separador da linha média +
 * metade esquerda), com a numeração junto a cada dente. Fileiras superior e
 * inferior ficam paralelas, uma sob a outra.
 */
function ArchRow({
  teeth,
  isUpper,
  deciduous = false,
  colorFor,
  onToothClick,
  locked = false,
}: {
  teeth: number[]
  isUpper: boolean
  deciduous?: boolean
  colorFor: (n: number) => string
  onToothClick: (n: number) => void
  locked?: boolean
}) {
  const mid = Math.ceil(teeth.length / 2)
  const scale = deciduous ? 0.82 : 1
  const renderTooth = (n: number, isUpperRow: boolean, leftSide: boolean) => (
    <div key={n} className="flex flex-col items-center" style={{ width: TOOTH_WIDTH * scale }}>
      {isUpperRow ? (
        <>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <ToothSvg
              number={n}
              color={colorFor(n)}
              isUpper={true}
              locked={locked}
              onToothClick={onToothClick}
            />
          </div>
          <span
            className="text-[#6B4F42] font-semibold mt-0.5"
            style={{ fontSize: deciduous ? 8 : 9 }}
          >
            {n}
          </span>
        </>
      ) : (
        <>
          <span
            className="text-[#6B4F42] font-semibold mb-0.5"
            style={{ fontSize: deciduous ? 8 : 9 }}
          >
            {n}
          </span>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center' }}>
            <ToothSvg
              number={n}
              color={colorFor(n)}
              isUpper={false}
              locked={locked}
              onToothClick={onToothClick}
            />
          </div>
        </>
      )}
      {/* `leftSide` mantém a ordem visual original (direita primeiro) */}
      {leftSide ? null : null}
    </div>
  )

  return (
    <div className="flex justify-center items-center w-full">
      <div className="flex items-center" style={{ gap: `${TOOTH_GAP}px` }}>
        {teeth.slice(0, mid).map((n) => renderTooth(n, isUpper, true))}
      </div>
      <div className="w-px h-10 bg-[#EDE3D8] mx-1 shrink-0" />
      <div className="flex items-center" style={{ gap: `${TOOTH_GAP}px` }}>
        {teeth.slice(mid).map((n) => renderTooth(n, isUpper, false))}
      </div>
    </div>
  )
}

interface Props {
  procedures: ProcedureRecord[]
  items: TreatmentItem[]
  onChange: (items: TreatmentItem[]) => void
  /** Quando o planejamento está aprovado, o odontograma fica somente leitura. */
  locked?: boolean
}

export function OdontogramNew({ procedures, items, onChange, locked = false }: Props) {
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
    if (locked) return
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

  const colorFor = (n: number) => TOOTH_COLORS[toothColor(n)]

  // Fileiras: direita | esquerda, com separador central (linha média)
  const upperPermanent = [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT]
  const lowerPermanent = [...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT]
  const upperDeciduous = [...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_UPPER_LEFT]
  const lowerDeciduous = [...DECIDUOUS_LOWER_RIGHT, ...DECIDUOUS_LOWER_LEFT]

  return (
    <Card className="card-warm p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <CardHeader className="p-0 pb-1">
            <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
              Odontograma — Planejamento Odontológico
            </CardTitle>
          </CardHeader>
          {locked && (
            <Badge className="bg-[#2E8B57] text-white text-[10px] gap-1">
              <Lock className="w-3 h-3" /> Aprovado — somente leitura
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-[#6B4F42]">
          Clique em um dente para adicionar tratamentos (canal, restauração, pino etc.). O preço vem
          da tabela e é editável; o dente fica colorido conforme os tratamentos marcados.
        </p>
      </div>

      {/* Dentição permanente — duas fileiras retas paralelas */}
      <div className="space-y-3 overflow-x-auto">
        <p className="text-[10px] font-bold uppercase text-[#6B4F42]">Dentição Permanente</p>
        <ArchRow
          teeth={upperPermanent}
          isUpper={true}
          colorFor={colorFor}
          onToothClick={openTooth}
          locked={locked}
        />
        <div className="border-t border-[#EDE3D8] my-1" />
        <ArchRow
          teeth={lowerPermanent}
          isUpper={false}
          colorFor={colorFor}
          onToothClick={openTooth}
          locked={locked}
        />
      </div>

      {/* Dentição decídua — também em fileiras paralelas, menor */}
      <div className="space-y-3 overflow-x-auto pt-2 border-t border-dashed border-[#EDE3D8]">
        <p className="text-[10px] font-bold uppercase text-[#6B4F42]">Dentição Decídua</p>
        <ArchRow
          teeth={upperDeciduous}
          isUpper={true}
          deciduous={true}
          colorFor={colorFor}
          onToothClick={openTooth}
          locked={locked}
        />
        <div className="border-t border-[#EDE3D8] my-1" />
        <ArchRow
          teeth={lowerDeciduous}
          isUpper={false}
          deciduous={true}
          colorFor={colorFor}
          onToothClick={openTooth}
          locked={locked}
        />
      </div>

      {items.length > 0 && (
        <div className="border-t border-[#EDE3D8] pt-2 space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-xs">
              <Badge className="bg-[#2D1B14] text-white text-[9px] px-1.5">Dente {it.tooth}</Badge>
              <span className="text-[#2D1B14] flex-1 min-w-0 truncate">{it.procedureName}</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={it.price}
                disabled={locked}
                onChange={(e) => updatePrice(it.id, Number(e.target.value) || 0)}
                className="w-28 h-7 text-xs bg-white"
                title="Valor editável — o total e as parcelas recalculam automaticamente"
              />
              {!locked && (
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                  onClick={() => removeItem(it.id)}
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
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
                <Select value={newProcedureId} disabled={locked} onValueChange={setNewProcedureId}>
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
                disabled={locked || procedures.length === 0}
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
                    disabled={locked}
                    onChange={(e) => updatePrice(it.id, Number(e.target.value))}
                    className="w-28 h-8 text-xs"
                  />
                  {!locked && (
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
                  )}
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
