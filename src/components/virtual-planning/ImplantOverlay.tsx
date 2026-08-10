import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Save, Move } from 'lucide-react'
import type { ImplantRecord } from '@/services/implants'

interface PlacedImplant {
  implantId: string
  label: string
  x: number
  y: number
}

interface ImplantOverlayProps {
  imageUrl: string
  implants: ImplantRecord[]
  onSave: (data: string) => void
}

export function ImplantOverlay({ imageUrl, implants, onSave }: ImplantOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedImplantId, setSelectedImplantId] = useState('')
  const [placed, setPlaced] = useState<PlacedImplant[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      placed.forEach((p) => {
        const imp = implants.find((i) => i.id === p.implantId)
        const w = (imp?.espessura || 4) * 10
        const h = (imp?.tamanho || 10) * 8
        ctx.strokeStyle = '#D4AF37'
        ctx.lineWidth = 2
        ctx.fillStyle = 'rgba(212, 175, 55, 0.15)'
        ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h)
        ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h)
        ctx.fillStyle = '#2D1B14'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(p.label, p.x - w / 2, p.y - h / 2 - 4)
      })
    }
  }

  useEffect(() => {
    draw()
  }, [placed, imageUrl])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedImplantId) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const imp = implants.find((i) => i.id === selectedImplantId)
    if (!imp) return
    setPlaced((prev) => [
      ...prev,
      { implantId: selectedImplantId, label: `${imp.marca} ${imp.modelo}`, x, y },
    ])
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const idx = placed.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 30)
    if (idx >= 0) setDragIdx(idx)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragIdx === null) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPlaced((prev) => prev.map((p, i) => (i === dragIdx ? { ...p, x, y } : p)))
  }

  const handleMouseUp = () => setDragIdx(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#EDE3D8] rounded-xl">
        <Select value={selectedImplantId} onValueChange={setSelectedImplantId}>
          <SelectTrigger className="w-64 bg-[#FFFDF9] border-[#EDE3D8]">
            <SelectValue placeholder="Selecione um implante" />
          </SelectTrigger>
          <SelectContent>
            {implants.map((imp) => (
              <SelectItem key={imp.id} value={imp.id}>
                {imp.marca} - {imp.modelo} ({imp.tamanho}mm x {imp.espessura}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="btn-terracotta-gold" disabled={!selectedImplantId}>
          <Plus className="w-4 h-4 mr-1" /> Clique na imagem para posicionar
        </Button>
        <div className="ml-auto flex gap-2">
          {placed.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setPlaced([])}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
          <Button
            size="sm"
            className="btn-terracotta-gold"
            onClick={() => onSave(JSON.stringify(placed))}
          >
            <Save className="w-4 h-4 mr-1" /> Salvar Planejamento
          </Button>
        </div>
      </div>
      <div className="border border-[#EDE3D8] rounded-xl overflow-hidden bg-black/5 flex justify-center">
        <canvas
          ref={canvasRef}
          width={650}
          height={450}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair max-w-full h-auto"
        />
      </div>
      {placed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {placed.map((p, i) => (
            <span
              key={i}
              className="text-xs bg-[#FBF3DC] border border-[#D4AF37] px-2 py-1 rounded-lg flex items-center gap-1"
            >
              <Move className="w-3 h-3" /> {p.label}
              <button
                onClick={() => setPlaced((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-red-500 ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
