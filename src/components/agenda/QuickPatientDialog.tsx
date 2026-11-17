/**
 * Mini-cadastro de paciente "novo" dentro do fluxo de agendamento:
 * campos mínimos (nome, telefone) + campos padrão do formulário de pacientes
 * (nascimento, CPF, e-mail, endereço, sexo, como nos conheceu, observações).
 * Cria o registro via createPatient e devolve o PatientRecord criado —
 * o agendamento sai vinculado a ele sem sair do fluxo da agenda.
 */
import { useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { createPatient, PatientRecord } from '@/services/patients'
import { isValidCpf, maskCpf, maskPhone, onlyDigits } from '@/components/patients/PatientFormDialog'
import { UFS, buscarCep, maskCep } from '@/lib/viacep'

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

export interface QuickPatientValues {
  name: string
  phone: string
  birth_date: string
  cpf: string
  email: string
  address: string
  cep: string
  cidade: string
  bairro: string
  estado: string
  numero: string
  complemento: string
  gender: string
  referral_source: string
  observations: string
}

const emptyValues: QuickPatientValues = {
  name: '',
  phone: '',
  birth_date: '',
  cpf: '',
  email: '',
  address: '',
  cep: '',
  cidade: '',
  bairro: '',
  estado: '',
  numero: '',
  complemento: '',
  gender: '',
  referral_source: '',
  observations: '',
}

export default function QuickPatientDialog({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nome já digitado na busca do agendamento (pré-preenche). */
  initialName?: string
  onCreated: (p: PatientRecord) => void
}) {
  const [values, setValues] = useState<QuickPatientValues>(() => ({
    ...emptyValues,
    name: initialName,
  }))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Recarrega o formulário vazio (com o nome sugerido) sempre que o diálogo abre.
  useEffect(() => {
    if (open) setValues({ ...emptyValues, name: initialName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setField = (k: keyof QuickPatientValues, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  // ViaCEP: ao completar 8 dígitos, busca endereço/cidade/bairro — sem bloquear o
  // preenchimento manual se a API falhar.
  const handleCepChange = (raw: string) => {
    const masked = maskCep(raw)
    setField('cep', masked)
    const digits = onlyDigits(masked)
    if (digits.length !== 8) return
    const current = values
    buscarCep(digits).then((res) => {
      if (!res) return
      setValues((v) => {
        if (onlyDigits(v.cep) !== digits) return v
        return {
          ...v,
          address: v.address || res.logradouro || current.address,
          cidade: v.cidade || res.localidade || current.cidade,
          bairro: v.bairro || res.bairro || current.bairro,
          estado: v.estado || res.uf || current.estado,
        }
      })
    })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!values.name.trim()) errs.name = 'O nome completo é obrigatório.'
    else if (values.name.trim().length < 3) errs.name = 'Informe o nome completo do paciente.'

    const digitsPhone = onlyDigits(values.phone)
    if (!digitsPhone) errs.phone = 'O telefone é obrigatório.'
    else if (digitsPhone.length < 10) errs.phone = 'Telefone incompleto: informe DDD + número.'

    const digitsCpf = onlyDigits(values.cpf)
    if (digitsCpf && !isValidCpf(values.cpf)) errs.cpf = 'CPF inválido: confira os dígitos.'

    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email.trim())) errs.email = 'E-mail inválido.'

    if (values.birth_date) {
      const d = new Date(values.birth_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (d > today) errs.birth_date = 'A data de nascimento não pode ser no futuro.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!validate()) {
      toast({ title: 'Verifique os campos destacados', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const created = await createPatient({
        name: values.name.trim(),
        phone: maskPhone(values.phone),
        birth_date: values.birth_date || undefined,
        cpf: values.cpf ? maskCpf(values.cpf) : undefined,
        email: values.email.trim() || undefined,
        address: values.address.trim() || undefined,
        cep: maskCep(values.cep) || undefined,
        cidade: values.cidade.trim() || undefined,
        bairro: values.bairro.trim() || undefined,
        estado: values.estado.trim() || undefined,
        numero: values.numero.trim() || undefined,
        complemento: values.complemento.trim() || undefined,
        gender: (values.gender || undefined) as PatientRecord['gender'],
        referral_source: (values.referral_source || undefined) as PatientRecord['referral_source'],
        medical_notes: values.observations.trim() || undefined,
      })
      toast({
        title: 'Cliente cadastrado!',
        description: `${created.name} já está vinculado ao agendamento.`,
      })
      onCreated(created)
      onOpenChange(false)
      setValues({ ...emptyValues })
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? JSON.stringify((err as { response: { data: unknown } }).response.data)
          : 'Ocorreu um erro inesperado.'
      toast({ title: 'Erro ao cadastrar cliente', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const fieldErr = (k: keyof QuickPatientValues) =>
    errors[k] ? <p className="text-[11px] text-red-600">{errors[k]}</p> : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-[#EDE3D8] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#C66B4D]" /> Cadastrar novo cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Nome e telefone são os mínimos; os demais campos seguem o padrão do cadastro de
            pacientes. Ao salvar, o cliente já fica vinculado ao agendamento em aberto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nome Completo *</Label>
            <Input
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Maria das Dores"
            />
            {fieldErr('name')}
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
              <Label className="text-xs font-semibold">Data de Nascimento</Label>
              <Input
                type="date"
                value={values.birth_date}
                onChange={(e) => setField('birth_date', e.target.value)}
              />
              {fieldErr('birth_date')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">CEP</Label>
              <Input
                value={values.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                onBlur={() => handleCepChange(values.cep)}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cidade</Label>
              <Input
                value={values.cidade}
                onChange={(e) => setField('cidade', e.target.value)}
                placeholder="Preenchido pelo CEP ou digite"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Endereço (rua)</Label>
            <Input
              value={values.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Rua, avenida etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Estado</Label>
              <Select value={values.estado} onValueChange={(v) => setField('estado', v)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bairro</Label>
              <Input
                value={values.bairro}
                onChange={(e) => setField('bairro', e.target.value)}
                placeholder="Preenchido pelo CEP ou digite"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Número</Label>
              <Input
                value={values.numero}
                onChange={(e) => setField('numero', e.target.value)}
                placeholder="Ex.: 123"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Complemento</Label>
              <Input
                value={values.complemento}
                onChange={(e) => setField('complemento', e.target.value)}
                placeholder="Apartamento, casa, sobrado etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sexo</Label>
              <Select value={values.gender} onValueChange={(v) => setField('gender', v)}>
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
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Como nos conheceu?</Label>
              <Select
                value={values.referral_source}
                onValueChange={(v) => setField('referral_source', v)}
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
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações</Label>
            <textarea
              value={values.observations}
              onChange={(e) => setField('observations', e.target.value)}
              placeholder="Alergias, preferências, histórico relevante..."
              rows={3}
              className="flex w-full rounded-md border border-[#EDE3D8] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-terracotta-gold" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar e Vincular
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
