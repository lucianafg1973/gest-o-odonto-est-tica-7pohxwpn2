import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  AppointmentRecord,
} from '@/services/appointments'
import { getPatients, PatientRecord } from '@/services/patients'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import { createMessageRecord } from '@/services/messages'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MessageCircle,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function Agenda() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'confirmados'>('calendar')
  const [openModal, setOpenModal] = useState(false)

  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedProcedure, setSelectedProcedure] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  const loadData = async () => {
    const apps = await getAppointments()
    setAppointments(apps)
    const pats = await getPatients()
    setPatients(pats)
    const procs = await getProcedures()
    setProcedures(procs)
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('appointments', () => {
    loadData()
  })

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast({ title: 'Selecione um paciente', variant: 'destructive' })
      return
    }

    try {
      await createAppointment({
        patient: selectedPatient,
        procedure: selectedProcedure || undefined,
        date,
        start_time: startTime,
        status: 'agendado',
        notes,
      })
      toast({ title: 'Consulta agendada!', description: 'Cadastrada com sucesso no sistema.' })
      setOpenModal(false)
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao agendar', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (
    id: string,
    status: 'agendado' | 'confirmado' | 'concluido' | 'faltou' | 'cancelado',
  ) => {
    try {
      await updateAppointment(id, { status })
      toast({ title: `Status alterado para ${status}` })
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const openWhatsAppReminder = async (app: AppointmentRecord) => {
    const patientName = app.expand?.patient?.name || 'Paciente'
    const phone = app.expand?.patient?.phone?.replace(/\D/g, '') || ''
    const text = `Olá, ${patientName}! Sua consulta na Clínica Odonto Estética está agendada para ${app.date} às ${app.start_time}. Responda este WhatsApp para confirmar!`

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank')

    try {
      await createMessageRecord({
        patient: app.patient,
        message_type: 'lembrete_consulta',
        content: text,
        sent: true,
        sent_date: new Date().toISOString(),
      })
      toast({ title: 'Lembrete enviado e registrado no prontuário!' })
    } catch {
      /* intentionally ignored */
    }
  }

  const confirmadosList = appointments.filter((a) => a.status === 'confirmado')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
            Agenda Inteligente & Anti-Faltas
          </h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Gerencie consultas e envie lembretes diretos no WhatsApp.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[#FAF6F0] p-1 rounded-xl border border-[#EDE3D8] flex">
            <Button
              size="sm"
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              className={
                activeTab === 'calendar' ? 'bg-[#C66B4D] text-white' : 'text-[#2D1B14] text-xs'
              }
              onClick={() => setActiveTab('calendar')}
            >
              Agenda Geral
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'confirmados' ? 'default' : 'ghost'}
              className={
                activeTab === 'confirmados' ? 'bg-[#C66B4D] text-white' : 'text-[#2D1B14] text-xs'
              }
              onClick={() => setActiveTab('confirmados')}
            >
              Central de Confirmados ({confirmadosList.length})
            </Button>
          </div>
          <Button
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => setOpenModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Nova Consulta
          </Button>
        </div>
      </div>

      {activeTab === 'calendar' ? (
        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-4 flex flex-row justify-between items-center">
            <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#C66B4D]" /> Atendimentos Cadastrados
            </CardTitle>
            <span className="text-xs text-[#6B4F42]">Sincronização em Tempo Real (SSE) Ativa</span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map((app) => (
                <div
                  key={app.id}
                  className="p-4 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#C66B4D] uppercase tracking-wider block">
                        {app.date} - {app.start_time}
                      </span>
                      <h3 className="font-semibold text-sm text-[#2D1B14] mt-0.5">
                        {app.expand?.patient?.name || 'Paciente'}
                      </h3>
                      <p className="text-xs text-[#6B4F42]">
                        {app.expand?.procedure?.name || 'Atendimento Geral'}
                      </p>
                    </div>

                    <Select
                      value={app.status}
                      onValueChange={(val: any) => handleStatusChange(app.id, val)}
                    >
                      <SelectTrigger className="w-28 text-[11px] h-7 bg-white border-[#EDE3D8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="faltou">Faltou</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {app.notes && (
                    <p className="text-xs text-gray-500 bg-[#FAF6F0] p-2 rounded border border-[#EDE3D8]">
                      {app.notes}
                    </p>
                  )}

                  <div className="flex justify-end pt-2 border-t border-[#EDE3D8]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
                      onClick={() => openWhatsAppReminder(app)}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Lembrete WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Consultas Confirmadas pelo
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmadosList.length === 0 ? (
              <p className="text-xs text-[#6B4F42] py-8 text-center">
                Nenhuma consulta marcada como confirmada no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {confirmadosList.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        {app.expand?.patient?.name}
                      </p>
                      <p className="text-xs text-emerald-700">
                        {app.expand?.procedure?.name} às {app.start_time} ({app.date})
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white text-xs"
                      onClick={() => handleStatusChange(app.id, 'concluido')}
                    >
                      Finalizar Atendimento
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Agendar Nova Consulta
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Selecione o paciente e procedimento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAppointment} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Procedimento</Label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                  <SelectValue placeholder="Selecione o procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (R$ {p.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horário de Início</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observações</Label>
              <Input
                placeholder="Recomendações preliminares..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Confirmar Agendamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
