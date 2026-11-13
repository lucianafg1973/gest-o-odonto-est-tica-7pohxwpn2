import { PatientRecord, getPatientPhotoUrl } from '@/services/patients'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Camera, Upload, X, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { CameraCapture } from '@/components/patients/CameraCapture'
import { updatePatient } from '@/services/patients'
import { toast } from '@/hooks/use-toast'

interface Props {
  patient: PatientRecord | null
  onPatientUpdated?: (p: PatientRecord) => void
}

const GENDER_LABELS: Record<string, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
}

const REFERRAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  indicacao_cliente: 'Indicação de cliente',
  fachada: 'Viu a fachada',
  outro: 'Outro',
}

export default function CadastroTab({ patient, onPatientUpdated }: Props) {
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  if (!patient) {
    return <p className="text-sm text-[#6B4F42]">Nenhum paciente selecionado.</p>
  }

  const photoUrl = getPatientPhotoUrl(patient)

  const handlePhotoFile = async (file: File) => {
    setCameraOpen(false)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const updated = await updatePatient(patient.id, fd)
      toast({ title: 'Foto atualizada!' })
      onPatientUpdated?.(updated)
    } catch {
      toast({ title: 'Erro ao salvar foto', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', '')
      const updated = await updatePatient(patient.id, fd)
      toast({ title: 'Foto removida!' })
      onPatientUpdated?.(updated)
    } catch {
      toast({ title: 'Erro ao remover foto', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const rows: { label: string; value?: string | null }[] = [
    { label: 'Nome completo', value: patient.name },
    { label: 'Como gosta de ser chamado', value: patient.preferred_name },
    {
      label: 'Data de nascimento',
      value: patient.birth_date ? patient.birth_date.slice(0, 10) : null,
    },
    {
      label: 'Sexo',
      value: patient.gender ? GENDER_LABELS[patient.gender] || patient.gender : null,
    },
    { label: 'CPF', value: patient.cpf },
    { label: 'Identidade (RG)', value: patient.identity_rg },
    {
      label: 'Parentesco com outro cliente',
      value: patient.referred_by_name || (patient.kinship ? patient.kinship : null),
    },
    { label: 'Telefone', value: patient.phone },
    { label: 'E-mail', value: patient.email },
    { label: 'Endereço', value: patient.address },
    {
      label: 'Como nos conheceu',
      value: patient.referral_source
        ? REFERRAL_LABELS[patient.referral_source] || patient.referral_source
        : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-5 p-4 rounded-2xl border border-[#EDE3D8] bg-[#FAF6F0]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Foto de ${patient.name}`}
            className="w-24 h-24 rounded-full object-cover border-2 border-[#D4AF37] shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-[#C66B4D]/40 flex items-center justify-center shrink-0">
            <Camera className="w-9 h-9 text-[#C66B4D]/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif-title text-lg font-bold text-[#2D1B14] leading-tight">
            {patient.name}
          </h3>
          {patient.preferred_name && (
            <p className="text-xs text-[#6B4F42]">
              Prefere ser chamado(a) de: {patient.preferred_name}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] text-[#C66B4D] border-[#C66B4D]/40"
              disabled={uploading}
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="w-3.5 h-3.5 mr-1" /> Capturar via Webcam
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] text-[#C66B4D] border-[#C66B4D]/40"
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> Enviar Foto
            </Button>
            {photoUrl && (
              <Button
                size="sm"
                variant="outline"
                className="text-[11px] text-red-600 border-red-200"
                disabled={uploading}
                onClick={handleRemovePhoto}
              >
                {uploading ? (
                  <X className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                )}
                Remover Foto
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="p-3 rounded-xl border border-[#EDE3D8] bg-white">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B4F42]">
              {r.label}
            </p>
            <p className="text-sm text-[#2D1B14] mt-0.5 break-words">{r.value || '—'}</p>
          </div>
        ))}
      </div>

      {patient.medical_notes && (
        <div className="p-4 rounded-2xl border border-[#EDE3D8] bg-white">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B4F42]">
            Observações
          </p>
          <p className="text-sm text-[#2D1B14] mt-1 whitespace-pre-wrap">
            {patient.medical_notes.replace(/<[^>]+>/g, '')}
          </p>
        </div>
      )}

      <CameraCapture open={cameraOpen} onOpenChange={setCameraOpen} onCapture={handlePhotoFile} />

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handlePhotoFile(e.target.files[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
