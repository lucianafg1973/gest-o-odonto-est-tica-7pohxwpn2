import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, ArrowRight, Circle, Type, RotateCcw, Save, Trash2 } from 'lucide-react'

interface CanvasAnnotatorProps {
  imageUrl: string
  initialAnnotations?: string
  onSave: (annotationsJson: string) => void
  /** Quando true (plano aprovado), exibe só a imagem sem ferramentas de edição. */
  readOnly?: boolean
}

interface Shape {
  type: 'pencil' | 'arrow' | 'circle' | 'text'
  color: string
  points?: { x: number; y: number }[]
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  text?: string
}

export function CanvasAnnotator({
  imageUrl,
  initialAnnotations,
  onSave,
  readOnly = false,
}: CanvasAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** Imagem já carregada, para redesenhar sem recarregar a cada traço. */
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<'pencil' | 'arrow' | 'circle' | 'text'>('pencil')
  const [color, setColor] = useState<string>('#C66B4D')
  const [isDrawing, setIsDrawing] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const shapesRef = useRef<Shape[]>([])

  useEffect(() => {
    if (initialAnnotations) {
      try {
        const parsed = JSON.parse(initialAnnotations)
        if (Array.isArray(parsed)) setShapes(parsed)
      } catch {
        /* intentionally ignored */
      }
    }
  }, [initialAnnotations])

  useEffect(() => {
    shapesRef.current = shapes
    if (canvasReady) drawAll(shapes, currentShape)
  }, [shapes, currentShape, canvasReady])

  // Ajusta o tamanho do buffer do canvas à proporção real da imagem
  // (sem esticar horizontalmente) e guarda a imagem carregada em ref.
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const maxWidth = 650
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      imgRef.current = img
      setCanvasReady(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  const drawAll = (allShapes: Shape[], drawing?: Shape | null) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (imgRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
      }
      const list = drawing ? [...allShapes, drawing] : allShapes
      list.forEach((s) => {
        ctx.strokeStyle = s.color
        ctx.fillStyle = s.color
        ctx.lineWidth = 3

        if (s.type === 'pencil' && s.points && s.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(s.points[0].x, s.points[0].y)
          s.points.forEach((p) => ctx.lineTo(p.x, p.y))
          ctx.stroke()
        } else if (s.type === 'arrow' && s.startX !== undefined && s.endX !== undefined) {
          ctx.beginPath()
          ctx.moveTo(s.startX, s.startY!)
          ctx.lineTo(s.endX, s.endY!)
          ctx.stroke()

          const headlen = 12
          const angle = Math.atan2(s.endY! - s.startY!, s.endX! - s.startX!)
          ctx.beginPath()
          ctx.moveTo(s.endX, s.endY!)
          ctx.lineTo(
            s.endX - headlen * Math.cos(angle - Math.PI / 6),
            s.endY - headlen * Math.sin(angle - Math.PI / 6),
          )
          ctx.lineTo(
            s.endX - headlen * Math.cos(angle + Math.PI / 6),
            s.endY - headlen * Math.sin(angle + Math.PI / 6),
          )
          ctx.fill()
        } else if (s.type === 'circle' && s.startX !== undefined && s.endX !== undefined) {
          const radius = Math.hypot(s.endX - s.startX, s.endY! - s.startY!)
          ctx.beginPath()
          ctx.arc(s.startX, s.startY!, radius, 0, 2 * Math.PI)
          ctx.stroke()
        } else if (s.type === 'text' && s.startX !== undefined && s.text) {
          ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif'
          ctx.fillText(s.text, s.startX, s.startY!)
        }
      })
    }

    if (imgRef.current && imgRef.current.complete) {
      paint()
    } else {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        imgRef.current = img
        paint()
      }
      img.src = imageUrl
    }
  }

  /**
   * Converte as coordenadas do ponteiro (CSS) para coordenadas do buffer do
   * canvas. O canvas pode ser exibido menor que seu tamanho interno (CSS
   * `max-w-full`), então é preciso escalar pelo fator buffer/CSS — é esse
   * mapeamento que mantém o traço exatamente sob a caneta, alinhado com a
   * cruz de orientação da foto.
   */
  const pointerToCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const { x, y } = pointerToCanvas(e)

    if (tool === 'text') {
      setTextPos({ x, y })
      return
    }

    setIsDrawing(true)
    if (tool === 'pencil') {
      setCurrentShape({ type: 'pencil', color, points: [{ x, y }] })
    } else {
      setCurrentShape({ type: tool, color, startX: x, startY: y, endX: x, endY: y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return
    const { x, y } = pointerToCanvas(e)

    if (tool === 'pencil') {
      setCurrentShape({
        ...currentShape,
        points: [...(currentShape.points || []), { x, y }],
      })
    } else {
      setCurrentShape({
        ...currentShape,
        endX: x,
        endY: y,
      })
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && currentShape) {
      setShapes((prev) => [...prev, currentShape])
      setCurrentShape(null)
      setIsDrawing(false)
    }
  }

  const handleAddText = () => {
    if (textPos && textInput.trim()) {
      setShapes((prev) => [
        ...prev,
        { type: 'text', color, startX: textPos.x, startY: textPos.y, text: textInput },
      ])
      setTextInput('')
      setTextPos(null)
    }
  }

  const handleUndo = () => setShapes((prev) => prev.slice(0, -1))
  const handleClear = () => setShapes([])

  const handleSaveClick = () => {
    onSave(JSON.stringify(shapesRef.current))
  }

  if (readOnly) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative border border-[#EDE3D8] rounded-xl overflow-hidden bg-black/5 flex justify-center">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
        <p className="text-[10px] text-center text-[#6B4F42]">
          Planejamento aprovado — anotações somente leitura.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-[#EDE3D8] rounded-xl">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tool === 'pencil' ? 'default' : 'outline'}
            onClick={() => setTool('pencil')}
            className={tool === 'pencil' ? 'bg-[#C66B4D]' : ''}
          >
            <Pencil className="w-4 h-4 mr-1" /> Livre
          </Button>
          <Button
            size="sm"
            variant={tool === 'arrow' ? 'default' : 'outline'}
            onClick={() => setTool('arrow')}
            className={tool === 'arrow' ? 'bg-[#C66B4D]' : ''}
          >
            <ArrowRight className="w-4 h-4 mr-1" /> Seta
          </Button>
          <Button
            size="sm"
            variant={tool === 'circle' ? 'default' : 'outline'}
            onClick={() => setTool('circle')}
            className={tool === 'circle' ? 'bg-[#C66B4D]' : ''}
          >
            <Circle className="w-4 h-4 mr-1" /> Círculo
          </Button>
          <Button
            size="sm"
            variant={tool === 'text' ? 'default' : 'outline'}
            onClick={() => setTool('text')}
            className={tool === 'text' ? 'bg-[#C66B4D]' : ''}
          >
            <Type className="w-4 h-4 mr-1" /> Texto
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#6B4F42]">Cor:</span>
          {['#C66B4D', '#D4AF37', '#2E8B57', '#C0392B', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border border-gray-300 transition-transform ${color === c ? 'scale-125 ring-2 ring-[#C66B4D]' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="h-4 w-px bg-gray-300 mx-1" />
          <Button size="sm" variant="ghost" onClick={handleUndo} title="Desfazer">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} title="Limpar tudo">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
          <Button
            size="sm"
            className="btn-terracotta-gold font-medium ml-2"
            onClick={handleSaveClick}
          >
            <Save className="w-4 h-4 mr-1" /> Salvar Plano
          </Button>
        </div>
      </div>

      {textPos && (
        <div className="p-3 bg-[#FBF3DC] border border-[#D4AF37] rounded-lg flex items-center gap-2">
          <input
            type="text"
            placeholder="Digite o texto da anotação..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 px-3 py-1 text-sm border rounded bg-white"
          />
          <Button size="sm" className="bg-[#C66B4D]" onClick={handleAddText}>
            Inserir
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTextPos(null)}>
            Cancelar
          </Button>
        </div>
      )}

      <div className="relative border border-[#EDE3D8] rounded-xl overflow-hidden bg-black/5 flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          className={readOnly ? 'max-w-full h-auto' : 'cursor-crosshair max-w-full h-auto'}
        />
      </div>
    </div>
  )
}
