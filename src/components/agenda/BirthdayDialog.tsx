import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Cake, Info, Pencil } from 'lucide-react'
import {
  getBirthdayPatients,
  getBirthdayMessageTemplate,
  setBirthdayMessageTemplate,
  buildBirthdayMessage,
  openWhatsAppWithMessage,
  registerBirthdayMessageSent,
  phoneDigits,
  type BirthdayPatient,
  type BirthdayScope,
} from '@/lib/agenda-status'
import type { PatientRecord } from '@/services/patients'
import { getBirthdayMessages, type MessageRecord } from '@/services/messages'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

const SCOPE_LABEL: Record<BirthdayScope, string> = {
  day: 'Hoje',
  week: 'Esta semana',
  month: 'Este mês',
}

/** Formata MM-DD para DD/MM. */
function fmtMonthDay(mmdd: string): string {
  const [m, d] = mmdd.split('-')
  return `${d}/${m}`
}

/**
 * Diálogo dos aniversariantes: dia / semana / mês, com WhatsApp e registro manual de envio.
 * Respeita preferência de comunicação (LGPD) e dados pendentes.
 */
export default function BirthdayDialog({
  open,
  onOpenChange,
  patients,
  scope: initialScope = 'day',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patients: PatientRecord[]
  scope?: BirthdayScope
}) {
  const { user } = useAuth()
  const [scope, setScope] = useState<BirthdayScope>(initialScope)
  const [sentMap, setSentMap] = useState<Record<string, MessageRecord[]>>({})
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [draftTemplate, setDraftTemplate] = useState('')

  useEffect(() => {
    if (open) setScope(initialScope)
  }, [open, initialScope])

  const list = useMemo(() => getBirthdayPatients(patients, scope), [patients, scope])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      const entries: Record<string, MessageRecord[]> = {}
      await Promise.all(
        list.map(async (b) => {
          try {
            entries[b.patient.id] = await getBirthdayMessages(b.patient.id)
          } catch {
            entries[b.patient.id] = []
          }
        }),
      )
      if (!cancelled) setSentMap(entries)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, list])

  const template = getBirthdayMessageTemplate()

  const handleSend = (b: BirthdayPatient) => {
    const msg = buildBirthdayMessage(b.patient.name, template)
    const result = openWhatsAppWithMessage(b.patient.phone, msg, b.patient.comm_pref)
    if (result === 'bloqueado') {
      toast({
        title: 'Envio bloqueado',
        description: `${b.patient.name} optou por NÃO receber mensagens comemorativas/comerciais (LGPD).`,
        variant: 'destructive',
      })
      return
    }
    if (result === 'invalid') {
      toast({
        title: 'Número inválido',
        description: `${b.patient.name} não tem WhatsApp/telefone cadastrado válido.`,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'WhatsApp aberto para revisão',
      description: 'A mensagem não é enviada automaticamente — confirme no próprio WhatsApp.',
    })
  }

  const handleRegisterSent = async (b: BirthdayPatient) => {
    const userName = user?.name || user?.email || 'Usuário'
    const msg = buildBirthdayMessage(b.patient.name, template)
    try {
      await registerBirthdayMessageSent(b.patient.id, msg, userName)
      toast({
        title: 'Mensagem registrada',
        description: `Registrada como enviada manualmente por ${userName}.`,
      })
      const msgs = await getBirthdayMessages(b.patient.id)
      setSentMap((prev) => ({ ...prev, [b.patient.id]: msgs }))
    } catch {
      toast({ title: 'Erro ao registrar', variant: 'destructive' })
    }
  }

  const pendingInfo = (p: PatientRecord) => {
    const missing: string[] = []
    if (!p.birth_date) missing.push('data de nascimento')
    if (!phoneDigits(p.phone)) missing.push('telefone')
    return missing.length ? `Pendente: ${missing.join(' e ')}` : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Cake className="w-5 h-5 text-[#C66B4D]" /> Aniversariantes
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Consulta por dia, semana e mês. O envio é manual — o WhatsApp é aberto para você revisar
            antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-1">
          {(['day', 'week', 'month'] as BirthdayScope[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={scope === s ? 'default' : 'outline'}
              className={scope === s ? 'bg-[#C66B4D] text-white text-xs' : 'text-xs'}
              onClick={() => setScope(s)}
            >
              {SCOPE_LABEL[s]}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {list.length === 0 ? (
            <p className="text-sm text-[#6B4F42] py-8 text-center">
              Nenhum aniversariante neste período.
            </p>
          ) : (
            list.map((b) => {
              const sent = (sentMap[b.patient.id] || []).length > 0
              const pending = pendingInfo(b.patient)
              return (
                <div
                  key={b.patient.id}
                  className="p-4 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#2D1B14]">{b.patient.name}</p>
                      <p className="text-xs text-[#6B4F42]">
                        🎂 {fmtMonthDay(b.monthDay)}
                        {b.turningAge != null && ` — faz ${b.turningAge} anos`}
                      </p>
                      <p className="text-xs text-[#6B4F42]">
                        {b.patient.phone || 'Telefone não cadastrado'}
                      </p>
                      {pending && <p className="text-xs text-amber-600">{pending}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      {sent && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ Mensagem enviada
                        </span>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => handleSend(b)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Enviar pelo WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRegisterSent(b)}
                        >
                          Registrar enviada
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          <div className="pt-3 border-t border-[#EDE3D8] space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#2D1B14]">
                Modelo da mensagem (usa {'{primeiro_nome}'})
              </Label>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setDraftTemplate(template)
                  setEditingTemplate((v) => !v)
                }}
              >
                <Pencil className="w-3 h-3" /> Editar
              </Button>
            </div>
            {editingTemplate ? (
              <div className="space-y-2">
                <Textarea
                  value={draftTemplate}
                  onChange={(e) => setDraftTemplate(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditingTemplate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#C66B4D] text-white text-xs"
                    onClick={() => {
                      setBirthdayMessageTemplate(draftTemplate)
                      setEditingTemplate(false)
                      toast({ title: 'Modelo salvo' })
                    }}
                  >
                    Salvar modelo
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6B4F42] bg-[#FAF6F0] border border-[#EDE3D8] rounded-lg p-3 whitespace-pre-wrap">
                {template}
              </p>
            )}
            <p className="text-[10px] text-[#6B4F42] flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              A mensagem nunca menciona tratamentos, diagnósticos ou procedimentos e respeita a
              preferência de comunicação (LGPD) do paciente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
