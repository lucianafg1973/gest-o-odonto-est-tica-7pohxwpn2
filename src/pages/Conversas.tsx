import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getConversations, createConversation, ConversationRecord } from '@/services/conversations'
import { getPatients, PatientRecord } from '@/services/patients'
import { getLeads, LeadRecord } from '@/services/leads'
import { createMessageRecord } from '@/services/messages'
import { MessageCircle, Send, Cake, Clock, Heart, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

const templates = [
  {
    type: 'lembrete_consulta',
    label: 'Confirmação de Consulta',
    icon: Bell,
    text: 'Olá {nome}! Lembramos sua consulta na Clínica LFG. Confirme sua presença!',
  },
  {
    type: 'antes_preparatorio',
    label: 'Pré-Operatório',
    icon: Clock,
    text: 'Olá {nome}! Orientações pré-procedimento: siga as recomendações fornecidas.',
  },
  {
    type: 'pos_operatorio',
    label: 'Pós-Operatório',
    icon: Heart,
    text: 'Olá {nome}! Como está seu pós-procedimento? Estamos à disposição.',
  },
  {
    type: 'informativo',
    label: 'Aniversário',
    icon: Cake,
    text: 'Olá {nome}! Feliz aniversário! Desejamos muita saúde e sorrisos!',
  },
]

export default function Conversas() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')

  const loadData = async () => {
    setConversations(await getConversations())
    setPatients(await getPatients())
    setLeads(await getLeads())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('conversations', () => loadData())

  const sendTemplate = async (template: (typeof templates)[0]) => {
    if (!selectedPatient) {
      toast({ title: 'Selecione um paciente', variant: 'destructive' })
      return
    }
    const patient = patients.find((p) => p.id === selectedPatient)
    if (!patient) return
    const text = template.text.replace('{nome}', patient.name)
    const phone = patient.phone.replace(/\D/g, '')
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank')
    try {
      await createConversation({
        patient: selectedPatient,
        channel: 'whatsapp',
        message_text: text,
        direction: 'saida',
      })
      await createMessageRecord({
        patient: selectedPatient,
        message_type: template.type as any,
        content: text,
        sent: true,
        sent_date: new Date().toISOString(),
      })
      toast({ title: 'Mensagem enviada e registrada!' })
      loadData()
    } catch {
      toast({ title: 'Erro ao registrar mensagem', variant: 'destructive' })
    }
  }

  const upcomingBirthdays = patients.filter((p) => {
    if (!p.birth_date) return false
    const today = new Date()
    const bd = new Date(p.birth_date)
    const diff = (bd.getMonth() - today.getMonth()) * 30 + (bd.getDate() - today.getDate())
    return diff >= 0 && diff <= 30
  })

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
          LFG CONNECT — Comunicação & Relacionamento
        </h2>
        <p className="text-xs text-[#6B4F42] mt-1">
          Histórico de conversas, templates automáticos e campanhas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-warm lg:col-span-2">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14]">
              Templates de Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <div
                  key={t.type}
                  className="p-4 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <t.icon className="w-4 h-4 text-[#C66B4D]" />
                    <span className="text-xs font-semibold text-[#2D1B14]">{t.label}</span>
                  </div>
                  <p className="text-[11px] text-[#6B4F42] line-clamp-2">{t.text}</p>
                  <Button
                    size="sm"
                    className="w-full btn-terracotta-gold text-xs"
                    onClick={() => sendTemplate(t)}
                  >
                    <Send className="w-3 h-3 mr-1" /> Enviar via WhatsApp
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              ⚠️ O envio automático de WhatsApp requer API externa não conectada. O sistema gera um
              link wa.me para envio manual.
            </p>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
              <Cake className="w-4 h-4 text-[#D4AF37]" /> Aniversariantes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-xs text-[#6B4F42] py-4 text-center">Nenhum aniversário próximo.</p>
            ) : (
              upcomingBirthdays.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-[#FBF3DC]/50 rounded-lg"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#2D1B14]">{p.name}</p>
                    <p className="text-[10px] text-[#6B4F42]">
                      {new Date(p.birth_date!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#C66B4D] text-xs"
                    onClick={() => {
                      setSelectedPatient(p.id)
                      sendTemplate(templates[3])
                    }}
                  >
                    <Cake className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-3">
          <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#C66B4D]" /> Histórico de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-xl ${c.direction === 'saida' ? 'bg-[#FAF0EB] ml-8' : 'bg-[#FBF3DC] mr-8'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#C66B4D] uppercase">
                    {c.channel} — {c.direction}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-[#2D1B14]">{c.message_text}</p>
                {c.expand?.patient && (
                  <p className="text-[10px] text-[#6B4F42] mt-1">
                    Paciente: {c.expand.patient.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
