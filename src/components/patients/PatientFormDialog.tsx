import { useEffect, useState, useRef } from 'react'
import { Loader2, Camera, Upload, X, RefreshCw } from 'lucide-react'
import {
  getPatients,
  createPatient,
  updatePatient,
  PatientRecord,
  getPatientPhotoUrl,
} from '@/services/patients'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { CameraCapture } from '@/components/patients/CameraCapture'

export function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function onlyDigits(v: string) {
  return v.replace(/\D/g, '')
}

export function isValidCpf(cpf: string) {
  const d = onlyDigits(cpf)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let dv = ((sum * 10) % 11) % 10
  if (dv !== parseInt(d[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  dv = ((sum * 10) % 11) % 10
  return dv === parseInt(d[10])
}

export interface PatientFormValues {
  name: string
  birth_date: string
  cpf: string
  phone: string
  email: string
  address: string
  observations: string
  identity_rg: string
  preferred_name: string
  kinship: string
  referred_by_name: string
  gender: string
  referral_source: string
  referred_by: string
}

const emptyValues: PatientFormValues = {
  name: '',
  birth_date: '',
  cpf: '',
  phone: '',
  email: '',
  address: '',
  observations: '',
  identity_rg: '',
  preferred_name: '',
  kinship: '',
  referred_by_name: '',
  gender: '',
  referral_source: '',
  referred_by: '',
}

function fromPatient(p: PatientRecord): PatientFormValues {
  return {
    name: p.name || '',
    birth_date: p.birth_date ? p.birth_date.slice(0, 10) : '',
    cpf: p.cpf || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    observations: (p.medical_notes || '').replace(/<[^>]+>/g, '').trim(),
    identity_rg: p.identity_rg || '',
    preferred_name: p.preferred_name || '',
    kinship: p.kinship || '',
    referred_by_name: p.referred_by_name || '',
    gender: p.gender || '',
    referral_source: p.referral_source || '',
    referred_by: p.referred_by || '',
  }
}

const REFERRAL_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'indicacao_cliente', label: 'Indicação de cliente' },
  { value: 'fachada', label: 'Viu a fachada' },
  { value: 'outro', label: 'Outro' },
]

const GENDER_OPTIONS = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Outro' },
  { value: 'nao_informado', label: 'Não informado' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: PatientRecord | null
  onSaved: () => void
}

export function PatientFormDialog({ open, onOpenChange, patient, onSaved }: Props) {
  const isEdit = !!patient
  const [values, setValues] = useState<PatientFormValues>(emptyValues)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [allPatients, setAllPatients] = useState<PatientRecord[]>([])
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setValues(patient ? fromPatient(patient) : emptyValues)
      setErrors({})
      setPhotoFile(null)
      setPhotoPreview(getPatientPhotoUrl(patient))
      if (patient) {
        getPatients()
          .then(setAllPatients)
          .catch(() => setAllPatients([]))
      } else {
        setAllPatients([])
      }
    }
  }, [open, patient])

  const setField = (key: keyof PatientFormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const handlePhotoCaptured = (file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setCameraOpen(false)
  }

  const normalize = (v: PatientFormValues) => ({
    ...v,
    name: v.name.trim(),
    cpf: maskCpf(v.cpf),
    phone: maskPhone(v.phone),
    email: v.email.trim(),
  })

  const validate = async (v: PatientFormValues): Promise<boolean> => {
    const errs: Record<string, string> = {}

    if (!v.name.trim()) errs.name = 'O nome completo é obrigatório.'
    else if (v.name.trim().length < 3) errs.name = 'Informe o nome completo do paciente.'

    if (!onlyDigits(v.phone)) {
      errs.phone = 'O telefone é obrigatório.'
    } else if (onlyDigits(v.phone).length < 10) {
      errs.phone = 'Telefone incompleto: informe DDD + número.'
    }

    const digitsCpf = onlyDigits(v.cpf)
    // Em edição, só valida o CPF se ele foi alterado (registros antigos podem ter
    // CPF com dígito inválido; isso não deve bloquear a edição dos demais campos).
    const cpfChanged = !patient || onlyDigits(patient.cpf || '') !== digitsCpf
    if (digitsCpf && cpfChanged && !isValidCpf(v.cpf)) {
      errs.cpf = 'CPF inválido: confira os dígitos.'
    }

    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email.trim())) {
      errs.email = 'E-mail inválido.'
    }

    if (v.birth_date) {
      const d = new Date(v.birth_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (d > today) errs.birth_date = 'A data de nascimento não pode ser no futuro.'
    }

    if (digitsCpf && cpfChanged) {
      try {
        const all = await getPatients()
        const dup = all.find(
          (p) => onlyDigits(p.cpf || '') === digitsCpf && (!patient || p.id !== patient.id),
        )
        if (dup) {
          errs.cpf = `CPF já cadastrado para o paciente "${dup.name}".`
          toast({
            title: 'CPF já cadastrado',
            description: `Já existe o paciente "${dup.name}" com este CPF. Verifique a listagem.`,
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Não foi possível verificar CPFs existentes',
          description: 'Tente novamente em instantes.',
          variant: 'destructive',
        })
        return false
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const v = normalize(values)
    const ok = await validate(v)
    if (!ok) {
      toast({ title: 'Verifique os campos destacados', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const dataToSend: Record<string, unknown> = { ...v }
      delete dataToSend.observations
      // medical_notes guarda texto rico; enviamos como texto puro
      dataToSend.medical_notes = v.observations

      let saved: PatientRecord
      if (isEdit && patient) {
        saved = await updatePatient(patient.id, dataToSend)
        toast({ title: 'Cadastro atualizado!', description: 'Os dados do paciente foram salvos.' })
      } else {
        saved = await createPatient(dataToSend)
        toast({ title: 'Paciente cadastrado!', description: 'O paciente já aparece na listagem.' })
      }

      // Se o usuário escolheu uma foto, envia via FormData em uma segunda chamada
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        saved = await updatePatient(saved.id, fd)
      }

      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? JSON.stringify((err as { response: { data: unknown } }).response.data)
          : 'Ocorreu um erro inesperado.'
      toast({ title: 'Erro ao salvar paciente', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const fieldErr = (k: keyof PatientFormValues) =>
    errors[k] ? <p className="text-[11px] text-red-600">{errors[k]}</p> : null

  const cleanCpf = (cpf: string) => onlyDigits(cpf)

  const formatPatientLabel = (p: PatientRecord) =>
    `${p.name}${p.cpf ? ` (${cleanCpf(p.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')})` : ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-[#EDE3D8] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            {isEdit ? 'Editar Cadastro' : 'Novo Cadastro de Paciente'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            {isEdit
              ? 'Altere os dados abaixo. O histórico do paciente será preservado.'
              : 'Insira os dados cadastrais principais do paciente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="flex items-center gap-4 pb-2">
            <div className="relative shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Foto do paciente"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#FAF6F0] border-2 border-dashed border-[#C66B4D]/40 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-[#C66B4D]/50" />
                </div>
              )}
              {photoPreview && (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#C0392B] text-white flex items-center justify-center shadow"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  title="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs text-[#C66B4D] border-[#C66B4D]/40"
                  onClick={() => setCameraOpen(true)}
                >
                  <Camera className="w-4 h-4 mr-1" /> Capturar via Webcam
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs text-[#C66B4D] border-[#C66B4D]/40"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" /> Enviar Foto
                </Button>
              </div>
              <p className="text-[10px] text-[#6B4F42]">
                A foto aparecerá ao lado do nome na ficha do paciente.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nome Completo *</Label>
            <Input
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Maria das Dores"
            />
            {fieldErr('name')}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Como gosta de ser chamado</Label>
            <Input
              value={values.preferred_name}
              onChange={(e) => setField('preferred_name', e.target.value)}
              placeholder="Ex.: Bia, Dr. Roberto, Vovó Ana..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data de Nascimento</Label>
              <Input
                type="date"
                value={values.birth_date}
                onChange={(e) => setField('birth_date', e.target.value)}
              />
              {fieldErr('birth_date')}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">CPF</Label>
              <Input
                value={values.cpf}
                onChange={(e) => setField('cpf', maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
              {fieldErr('cpf')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Número de Identidade (RG)</Label>
              <Input
                value={values.identity_rg}
                onChange={(e) => setField('identity_rg', e.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sexo</Label>
              <Select value={values.gender} onValueChange={(val) => setField('gender', val)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Parentesco com outro cliente</Label>
            <Input
              value={values.kinship}
              onChange={(e) => setField('kinship', e.target.value)}
              placeholder="Ex.: filha de Ana Beatriz Lima; esposa de José..."
            />
            {allPatients.length > 0 && (
              <p className="text-[10px] text-[#6B4F42]">
                Dica: cite o nome do cliente e o vínculo (ex.: &quot;mãe de Carlos Pereira&quot;).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Telefone/WhatsApp *</Label>
              <Input
                value={values.phone}
                onChange={(e) => setField('phone', maskPhone(e.target.value))}
                placeholder="(11) 99999-8888"
                inputMode="tel"
              />
              {fieldErr('phone')}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="paciente@email.com"
              />
              {fieldErr('email')}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Endereço Completo</Label>
            <Input
              value={values.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Rua, número, bairro, cidade, estado, CEP"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Como nos conheceu?</Label>
            <Select
              value={values.referral_source}
              onValueChange={(val) => setField('referral_source', val)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Selecione a origem da indicação" />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {values.referral_source === 'indicacao_cliente' && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cliente que indicou</Label>
              {allPatients.length > 0 ? (
                <Select
                  value={values.referred_by}
                  onValueChange={(val) => setField('referred_by', val)}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPatients
                      .filter((p) => !patient || p.id !== patient.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {formatPatientLabel(p)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={values.referred_by_name}
                  onChange={(e) => setField('referred_by_name', e.target.value)}
                  placeholder="Nome de quem indicou"
                />
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações</Label>
            <textarea
              value={values.observations}
              onChange={(e) => setField('observations', e.target.value)}
              placeholder="Alergias, preferências, histórico relevante..."
              rows={3}
              className="flex w-full rounded-md border border-[#EDE3D8] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-terracotta-gold" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {isEdit ? 'Salvar Alterações' : 'Salvar Paciente'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCaptured}
      />

      {/* Input de arquivo invisível para o upload de foto preexistente */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setPhotoFile(e.target.files[0])
            setPhotoPreview(URL.createObjectURL(e.target.files[0]))
          }
        }}
      />
    </Dialog>
  )
}
