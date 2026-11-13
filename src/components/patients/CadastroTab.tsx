import { PatientRecord } from '@/services/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Cake, CreditCard, Phone, Mail, MapPin, StickyNote } from 'lucide-react'

interface Props {
  patient: PatientRecord
  onEdit: () => void
}

function formatBirthDate(birth?: string) {
  if (!birth) return null
  const d = new Date(birth.slice(0, 10) + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR')
}

function calcAge(birth?: string) {
  if (!birth) return null
  const d = new Date(birth.slice(0, 10) + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

export function CadastroTab({ patient, onEdit }: Props) {
  const age = calcAge(patient.birth_date)

  const rows = [
    {
      icon: Phone,
      label: 'Telefone',
      value: patient.phone || 'Não informado',
    },
    { icon: Mail, label: 'E-mail', value: patient.email || 'Não informado' },
    {
      icon: CreditCard,
      label: 'CPF',
      value: patient.cpf || 'Não informado',
    },
    {
      icon: Cake,
      label: 'Nascimento',
      value: formatBirthDate(patient.birth_date) || 'Não informada',
      extra: age !== null ? `${age} anos` : undefined,
    },
    {
      icon: MapPin,
      label: 'Endereço',
      value: patient.address || 'Não informado',
    },
    {
      icon: StickyNote,
      label: 'Observações',
      value: patient.medical_notes?.replace(/<[^>]+>/g, '') || 'Nenhuma observação registrada.',
      full: true,
    },
  ]

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-serif-title text-base text-[#2D1B14]">
          Dados Cadastrais
        </CardTitle>
        <Button size="sm" variant="outline" className="text-xs text-[#C66B4D]" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar Cadastro
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className={`flex items-start gap-3 bg-[#FAF6F0] p-3 rounded-xl border border-[#EDE3D8] ${
                r.full ? 'sm:col-span-2' : ''
              }`}
            >
              <r.icon className="w-4 h-4 text-[#C66B4D] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42]">
                  {r.label}
                </p>
                <p className="text-sm text-[#2D1B14] break-words">
                  {r.value}
                  {r.extra && (
                    <Badge className="ml-2 bg-[#D4AF37]/20 text-[#8B6914] border-0 text-[10px]">
                      {r.extra}
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
