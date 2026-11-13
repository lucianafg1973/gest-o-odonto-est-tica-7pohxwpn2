import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

export function CameraCapture({ open, onOpenChange, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [denied, setDenied] = useState(false)
  const [starting, setStarting] = useState(false)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStreaming(false)
  }

  const startStream = async () => {
    setDenied(false)
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStreaming(true)
    } catch {
      setDenied(true)
      setStreaming(false)
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    if (open) {
      startStream()
    } else {
      stopStream()
    }
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !streaming) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast({ title: 'Não foi possível capturar a foto', variant: 'destructive' })
          return
        }
        const file = new File([blob], `foto-paciente-${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        onCapture(file)
        onOpenChange(false)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) stopStream()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C66B4D]" /> Capturar Foto do Paciente
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Enquadre o rosto e clique em &quot;Capturar Foto&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!streaming && !denied && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs">
              {starting ? 'Iniciando câmera...' : 'Preparando câmera...'}
            </div>
          )}
          {denied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-xs text-center p-4">
              <p>
                Não foi possível acessar a webcam. Verifique se a câmera está conectada e se o
                navegador tem permissão de acesso (ícone de cadeado na barra de endereço).
              </p>
              <Button size="sm" variant="outline" className="text-xs" onClick={startStream}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            onClick={() => {
              stopStream()
              onOpenChange(false)
            }}
          >
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button
            type="button"
            className="btn-terracotta-gold text-xs"
            onClick={handleCapture}
            disabled={!streaming}
          >
            <Camera className="w-4 h-4 mr-1" /> Capturar Foto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
