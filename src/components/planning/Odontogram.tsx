import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ToothType = 'permanente' | 'deciduo'

interface ToothDef {
  code: string
  quadrant: number
  position: number
  type: ToothType
}

const PERMANENT: ToothDef[] = []
for (let q = 1; q <= 4; q++) {
  for (let pos = 1; pos <= 8; pos++) {
    PERMANENT.push({ code: `${q}${pos}`, quadrant: q, position: pos, type: 'permanente' })
  }
}
const DECIDUOUS: ToothDef[] = []
for (let q = 5; q <= 8; q++) {
  for (let pos = 1; pos <= 5; pos++) {
    DECIDUOUS.push({ code: `${q}${pos}`, quadrant: q, position: pos, type: 'deciduo' })
  }
}

export const TOOTH_STATUS = [
  { value: 'saudavel', label: 'Saudável', color: '#FFFFFF' },
  { value: 'carie', label: 'Cárie', color: '#E74C3C' },
  { value: 'restaurado', label: 'Restaurado', color: '#3498DB' },
  { value: 'implante', label: 'Implante', color: '#9B59B6' },
  { value: 'coroa', label: 'Coroa/Prótese', color: '#F1C40F' },
  { value: 'canal', label: 'Tratamento de Canal', color: '#E67E22' },
  { value: 'extraido', label: 'Extraído', color: '#7F8C8D' },
] as const

export type ToothStatus = (typeof TOOTH_STATUS)[number]['value']

export interface ToothState {
  code: string
  status: ToothStatus
  faces: string[] // e.g. ['M', 'O', 'D', 'V', 'L', 'I']
}

export const FACE_LABELS: Record<string, string> = {
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Lingual/Palatina',
  O: 'Oclusal/Incisal',
  I: 'Cervical',
}

export const ALL_FACES = ['M', 'D', 'V', 'L', 'O', 'I']

export function QuadrantRow({
  teeth,
  selected,
  onToggle,
  onSelect,
}: {
  teeth: ToothDef[]
  selected: ToothState[]
  onToggle: (code: string) => void
  onSelect: (code: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {teeth.map((t) => {
        const st = selected.find((s) => s.code === t.code)
        const statusInfo = TOOTH_STATUS.find((s) => s.value === st?.status)
        return (
          <button
            key={t.code}
            type="button"
            title={`Dente ${t.code}${statusInfo ? ` — ${statusInfo.label}` : ''}`}
            onClick={() => onSelect(t.code)}
            onDoubleClick={() => onToggle(t.code)}
            className={`w-8 h-8 rounded border text-[9px] font-bold flex items-center justify-center transition-colors ${
              st
                ? 'border-[#C66B4D] text-white'
                : 'border-[#EDE3D8] bg-white text-[#6B4F42] hover:bg-[#FAF6F0]'
            }`}
            style={st ? { backgroundColor: statusInfo?.color || '#C66B4D' } : undefined}
          >
            {t.code}
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  teeth: ToothState[]
  onChange: (teeth: ToothState[]) => void
}

export function Odontogram({ teeth, onChange }: Props) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)
  const [mode, setMode] = useState<ToothStatus>('carie')

  const setTooth = (code: string, update: Partial<ToothState>) => {
    const existing = teeth.find((t) => t.code === code)
    if (existing) {
      onChange(teeth.map((t) => (t.code === code ? { ...t, ...update } : t)))
    } else {
      onChange([...teeth, { code, status: mode, faces: [], ...update }])
    }
  }

  const removeFromTooth = (code: string) => onChange(teeth.filter((t) => t.code !== code))

  const toggleFace = (code: string, face: string) => {
    const tooth = teeth.find((t) => t.code === code)
    const faces = tooth?.faces || []
    const updated = faces.includes(face) ? faces.filter((f) => f !== face) : [...faces, face]
    setTooth(code, { faces: updated })
  }

  const selected = teeth.find((t) => t.code === selectedTooth)

  const renderArch = (type: ToothType) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase text-[#6B4F42]">
        {type === 'permanente' ? 'Dentes Permanentes (11–48)' : 'Dentes Decíduos (51–85)'}
      </p>
      {type === 'permanente' ? (
        <>
          <div className="flex flex-wrap gap-4">
            <QuadrantRow
              teeth={PERMANENT.filter((t) => t.quadrant === 1)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
            <QuadrantRow
              teeth={PERMANENT.filter((t) => t.quadrant === 2)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <QuadrantRow
              teeth={PERMANENT.filter((t) => t.quadrant === 4)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
            <QuadrantRow
              teeth={PERMANENT.filter((t) => t.quadrant === 3)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <QuadrantRow
              teeth={DECIDUOUS.filter((t) => t.quadrant === 5)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
            <QuadrantRow
              teeth={DECIDUOUS.filter((t) => t.quadrant === 6)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <QuadrantRow
              teeth={DECIDUOUS.filter((t) => t.quadrant === 8)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
            <QuadrantRow
              teeth={DECIDUOUS.filter((t) => t.quadrant === 7)}
              selected={teeth}
              onToggle={(c) => removeFromTooth(c)}
              onSelect={setSelectedTooth}
            />
          </div>
        </>
      )}
    </div>
  )

  return (
    <Card className="card-warm p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
          Odontograma — Dentes Permanentes e Decíduos
        </h3>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">Condição:</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as ToothStatus)}>
            <SelectTrigger className="w-44 bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOOTH_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {renderArch('permanente')}
        {renderArch('deciduo')}
      </div>

      {selectedTooth && selected && (
        <div className="border-t border-[#EDE3D8] pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#2D1B14]">
              Dente {selectedTooth} — condição:{' '}
              <span className="text-[#C66B4D]">
                {TOOTH_STATUS.find((s) => s.value === selected.status)?.label || '—'}
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] text-red-600"
              onClick={() => {
                removeFromTooth(selectedTooth)
                setSelectedTooth(null)
              }}
            >
              Limpar dente
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_FACES.map((f) => {
              const on = selected.faces.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  className={`px-2 py-1 rounded border text-[10px] font-semibold ${
                    on
                      ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                      : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                  }`}
                  onClick={() => toggleFace(selectedTooth, f)}
                  title={FACE_LABELS[f]}
                >
                  {f} — {FACE_LABELS[f]}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {TOOTH_STATUS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`px-2 py-1 rounded border text-[10px] font-semibold ${
                  selected.status === s.value
                    ? 'border-[#C66B4D] text-white'
                    : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                }`}
                style={selected.status === s.value ? { backgroundColor: s.color } : undefined}
                onClick={() => setTooth(selectedTooth, { status: s.value })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!selectedTooth && (
        <p className="text-[10px] text-[#6B4F42]">
          Clique em um dente para detalhar condição e faces. Duplo clique remove a marcação.
        </p>
      )}
    </Card>
  )
}
