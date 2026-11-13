import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getPatients, createPatient, updatePatient, PatientRecord } from '@/services/patients'
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
import { toast } from '@/hooks/use-toast'

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
}

const emptyValues: PatientFormValues = {
  name: '',
  birth_date: '',
  cpf: '',
  phone: '',
  email: '',
  address: '',
  observations: '',
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
  }
}

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

  useEffect(() => {
    if (open) {
      setValues(patient ? fromPatient(patient) : emptyValues)
      setErrors({})
    }
  }, [open, patient])

  const setField = (key: keyof PatientFormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
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
    if (digitsCpf && !isValidCpf(v.cpf)) {
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

    if (digitsCpf) {
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
      if (isEdit && patient) {
        await updatePatient(patient.id, v)
        toast({ title: 'Cadastro atualizado!', description: 'Os dados do paciente foram salvos.' })
      } else {
        await createPatient(v)
        toast({ title: 'Paciente cadastrado!', description: 'O paciente já aparece na listagem.' })
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
    </Dialog>
  )
}
