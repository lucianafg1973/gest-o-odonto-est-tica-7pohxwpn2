import { useEffect, useMemo, useRef, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  createStatusEvent,
  AppointmentRecord,
  AppointmentStatus,
  STATUS_LABELS,
} from '@/services/appointments'
import { getPatients, PatientRecord } from '@/services/patients'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import { createMessageRecord } from '@/services/messages'
import { getProfessionals, ProfessionalRecord } from '@/services/professionals'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MessageCircle,
  CheckCircle2,
  Cake,
  ChevronDown,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { hasActiveAppointmentAt, countTodayBirthdays } from '@/lib/agenda-status'
import { categorizeAppointment, CATEGORY_STYLES } from '@/lib/appointment-category'
import { cn } from '@/lib/utils'
import { addMin, durationMinutes, DEFAULT_APPOINTMENT_DURATION } from '@/services/appointments'
import { timeToMin } from '@/components/agenda/CalendarGrid'
import { Minus } from 'lucide-react'
import CalendarGrid from '@/components/agenda/CalendarGrid'
import AppointmentEditDialog, {
  type AppointmentEditValues,
} from '@/components/agenda/AppointmentEditDialog'
import AppointmentStatusBadge from '@/components/agenda/AppointmentStatusBadge'
import CancelDialog from '@/components/agenda/CancelDialog'
import RescheduleDialog from '@/components/agenda/RescheduleDialog'
import BirthdayDialog from '@/components/agenda/BirthdayDialog'
import AttendanceIndicatorsPanel from '@/components/agenda/AttendanceIndicatorsPanel'

export default function Agenda() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'confirmados'>('calendar')
  const [openModal, setOpenModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grade' | 'lista'>('grade')
  // pré-preenchimento vindo do clique num horário livre da grade
  const [pendingSlot, setPendingSlot] = useState<{
    date: string
    time: string
    professionalId: string
  } | null>(null)

  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedProcedure, setSelectedProcedure] = useState('')
  const [selectedProfessional, setSelectedProfessional] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [endTime, setEndTime] = useState('09:40')

  // dialogs
  // Filtro de profissionais (multi-seleção): vazio = Todos.
  const [profFilter, setProfFilter] = useState<string[]>([])
  const [profMenuOpen, setProfMenuOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppointmentRecord | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{
    app: AppointmentRecord
    kind: 'clinica' | 'paciente'
  } | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null)
  const [birthdayOpen, setBirthdayOpen] = useState(false)

  const loadData = async () => {
    const apps = await getAppointments()
    setAppointments(apps)
    const pats = await getPatients()
    setPatients(pats)
    const procs = await getProcedures()
    setProcedures(procs)
    try {
      const pros = await getProfessionals()
      setProfessionals(pros)
    } catch {
      /* profissionais é opcional para a agenda funcionar */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('appointments', () => {
    loadData()
  })

  const userName = user?.name || user?.email || 'Usuário'
  const todayBirthdays = useMemo(() => countTodayBirthdays(patients), [patients])

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast({ title: 'Selecione um paciente', variant: 'destructive' })
      return
    }

    // evitar duplicidade de horários (horários liberados por desmarcação podem ser reutilizados)
    if (hasActiveAppointmentAt(appointments, selectedPatient, date, startTime)) {
      toast({
        title: 'Horário ocupado',
        description: 'Este paciente já possui um agendamento ativo nessa data e horário.',
        variant: 'destructive',
      })
      return
    }

    try {
      await createAppointment({
        patient: selectedPatient,
        procedure: selectedProcedure || undefined,
        professional: selectedProfessional || undefined,
        date,
        start_time: startTime,
        end_time: endTime || addMin(startTime, DEFAULT_APPOINTMENT_DURATION),
        status: 'agendado',
        notes,
      })
      toast({ title: 'Consulta agendada!', description: 'Cadastrada com sucesso no sistema.' })
      setOpenModal(false)
      setPendingSlot(null)
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao agendar', variant: 'destructive' })
    }
  }

  /** Salvamento automático do status + registro de data/hora e usuário responsável. */
  const applyStatusChange = async (
    app: AppointmentRecord,
    status: AppointmentStatus,
    extra: Partial<AppointmentRecord> = {},
  ) => {
    const nowIso = new Date().toISOString()
    try {
      await updateAppointment(app.id, {
        status,
        status_changed_by: userName,
        status_changed_at: nowIso,
        ...extra,
      })
      await createStatusEvent({
        appointment: app.id,
        from_status: app.status,
        to_status: status,
        changed_by: userName,
        actor_kind:
          status === 'desmarcado_clinica'
            ? 'clinica'
            : status === 'desmarcado_paciente'
              ? 'paciente'
              : 'sistema',
        reason: extra.canceled_reason || '',
      })
      toast({ title: `Status alterado: ${STATUS_LABELS[status]}` })
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  /** Mudança direta no seletor da agenda (sem abrir prontuário). */
  const handleStatusSelect = (app: AppointmentRecord, status: AppointmentStatus) => {
    if (status === app.status) return
    applyStatusChange(app, status)
  }

  /** Confirmação do diálogo de desmarque: registra quem/motivo e preserva o histórico. */
  const handleCancelConfirm = async (who: string, reason: string) => {
    if (!cancelTarget) return
    const { app, kind } = cancelTarget
    setCancelTarget(null)
    await applyStatusChange(
      app,
      kind === 'clinica' ? 'desmarcado_clinica' : 'desmarcado_paciente',
      {
        canceled_by: who,
        canceled_reason: reason,
        notes: app.notes
          ? `${app.notes}\n[Desmarcado em ${new Date().toLocaleString('pt-BR')} por ${who}${reason ? ` — motivo: ${reason}` : ''}]`
          : `[Desmarcado em ${new Date().toLocaleString('pt-BR')} por ${who}${reason ? ` — motivo: ${reason}` : ''}]`,
      },
    )
  }

  /** Remarcação: preserva vínculo com o original e o histórico; nunca exclui o registro. */
  const handleRescheduleConfirm = async (newDate: string, newTime: string, reason: string) => {
    if (!rescheduleTarget) return
    const app = rescheduleTarget
    setRescheduleTarget(null)
    const nowIso = new Date().toISOString()
    const originalDur = durationMinutes(app)
    const history = [
      ...(app.reschedule_history || []),
      {
        from_date: (app.date || '').slice(0, 10),
        from_time: app.start_time,
        to_date: newDate,
        to_time: newTime,
        at: nowIso,
        by: userName,
      },
    ]
    try {
      await updateAppointment(app.id, {
        date: newDate,
        start_time: newTime,
        end_time: addMin(newTime, originalDur),
        status: 'remarcou',
        reschedule_history: history,
        status_changed_by: userName,
        status_changed_at: nowIso,
      })
      // novo agendamento vinculado ao original (campo de relação rescheduled_from)
      await createAppointment({
        patient: app.patient,
        procedure: app.procedure,
        professional: app.professional,
        date: newDate,
        start_time: newTime,
        end_time: addMin(newTime, originalDur),
        status: 'agendado',
        notes: app.notes,
        rescheduled_from: app.id,
      })
      await createStatusEvent({
        appointment: app.id,
        from_status: app.status,
        to_status: 'remarcou',
        changed_by: userName,
        actor_kind: 'sistema',
        reason: reason || 'Remarcação',
      })
      toast({
        title: 'Consulta remarcada',
        description: 'Histórico preservado; novo horário criado.',
      })
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao remarcar', variant: 'destructive' })
    }
  }

  /** Clique num horário livre da grade: abre o formulário de nova consulta já preenchido. */
  const handleCreateAt = (opts: { date: string; time: string; professionalId: string }) => {
    setSelectedPatient('')
    setSelectedProcedure('')
    setSelectedProfessional(opts.professionalId || 'none')
    setDate(opts.date)
    setStartTime(opts.time)
    setEndTime(addMin(opts.time, DEFAULT_APPOINTMENT_DURATION))
    setNotes('')
    setPendingSlot(opts)
    setOpenModal(true)
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

  /** Guarda o último estado conhecido do agendamento em edição (evita stale closure com realtime). */
  const editConfirmRef = useRef<(id: string, v: AppointmentEditValues) => void>(() => {})
  editConfirmRef.current = async (appId, values) => {
    const fresh = appointments.find((a) => a.id === appId)
    if (!fresh) {
      toast({
        title: 'Erro ao salvar alterações',
        description: 'Agendamento não encontrado.',
        variant: 'destructive',
      })
      return
    }
    try {
      await updateAppointment(appId, {
        patient: values.patient,
        ...(values.procedure ? { procedure: values.procedure } : {}),
        ...(values.professional ? { professional: values.professional } : {}),
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        notes: values.notes,
      })
      toast({ title: 'Agendamento atualizado!' })
      setEditTarget(null)
      loadData()
    } catch (_) {
      toast({ title: 'Erro ao salvar alterações', variant: 'destructive' })
    }
  }

  const professionalOptions = professionals.map((p) => ({ id: p.id, name: p.name || 'Sem nome' }))

  /**
   * Filtro de profissionais aplicado à grade, à lista e aos indicadores.
   * Seleção vazia = Todos; com seleção, só entram agendamentos cujo profissional
   * está entre os escolhidos (agendamento sem profissional some do recorte).
   */
  const visibleAppointments = useMemo(() => {
    if (profFilter.length === 0) return appointments
    return appointments.filter((a) => !!a.professional && profFilter.includes(a.professional))
  }, [appointments, profFilter])

  const confirmadosList = visibleAppointments.filter((a) => a.status === 'confirmado')

  /** Clicou = seleciona; clicou de novo = desseleciona. */
  const toggleProfFilter = (id: string) => {
    setProfFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
            Agenda Inteligente & Anti-Faltas
          </h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Gerencie consultas, status dos pacientes e envie lembretes diretos no WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs bg-[#FFF7E8] border-[#F0DCA8] text-[#8A6A1F] hover:bg-[#FFF3D6]"
            onClick={() => setBirthdayOpen(true)}
          >
            <Cake className="w-4 h-4 mr-1 text-[#C66B4D]" />🎂 Aniversariantes de hoje —{' '}
            {todayBirthdays} {todayBirthdays === 1 ? 'paciente' : 'pacientes'}
          </Button>
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
          {activeTab === 'calendar' && (
            <div className="bg-[#FAF6F0] p-1 rounded-xl border border-[#EDE3D8] flex">
              <Button
                size="sm"
                variant={viewMode === 'grade' ? 'default' : 'ghost'}
                className={
                  viewMode === 'grade' ? 'bg-[#C66B4D] text-white' : 'text-[#2D1B14] text-xs'
                }
                onClick={() => setViewMode('grade')}
              >
                Grade
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'lista' ? 'default' : 'ghost'}
                className={
                  viewMode === 'lista' ? 'bg-[#C66B4D] text-white' : 'text-[#2D1B14] text-xs'
                }
                onClick={() => setViewMode('lista')}
              >
                Lista
              </Button>
            </div>
          )}
          <Button
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => {
              setPendingSlot(null)
              setOpenModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Nova Consulta
          </Button>
        </div>
      </div>

      {/* Filtro de profissionais (multi-seleção em um único menu) — vale para grade, lista e indicadores */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B4F42]">
          Profissionais:
        </span>
        <Popover open={profMenuOpen} onOpenChange={setProfMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5',
                profFilter.length > 0
                  ? 'bg-[#C66B4D] text-white border-[#C66B4D] font-semibold'
                  : 'bg-white text-[#6B4F42] border-[#EDE3D8] hover:bg-[#FFF3D6]',
              )}
            >
              {profFilter.length === 0 ? (
                'Todos'
              ) : (
                <>
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold">
                    {profFilter.length}
                  </span>
                  {profFilter.length === 1 ? 'profissional' : 'profissionais'}
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B4F42]">
              {profFilter.length === 0
                ? 'Todos (nenhum selecionado)'
                : `${profFilter.length} ${
                    profFilter.length === 1
                      ? 'profissional selecionado'
                      : 'profissionais selecionados'
                  }`}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {professionalOptions.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-[#2D1B14] cursor-pointer hover:bg-[#FFF3D6]"
                >
                  <Checkbox
                    checked={profFilter.includes(p.id)}
                    onCheckedChange={() => toggleProfFilter(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Indicadores de comparecimento — visível nas duas abas (já chegam filtrados) */}
      <AttendanceIndicatorsPanel appointments={visibleAppointments} />

      {activeTab === 'calendar' && viewMode === 'grade' ? (
        <CalendarGrid
          appointments={visibleAppointments}
          professionals={professionalOptions}
          selectedProfessionalIds={profFilter}
          onCreateAt={handleCreateAt}
          onStatusSelect={handleStatusSelect}
          onRequestCancel={(app, kind) => setCancelTarget({ app, kind })}
          onEdit={(app) => setEditTarget(app)}
          onReschedule={(app) => setRescheduleTarget(app)}
          onWhatsApp={openWhatsAppReminder}
        />
      ) : activeTab === 'calendar' ? (
        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-4 flex flex-row justify-between items-center">
            <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#C66B4D]" /> Atendimentos Cadastrados
            </CardTitle>
            <span className="text-xs text-[#6B4F42]">Sincronização em Tempo Real (SSE) Ativa</span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleAppointments.map((app) => {
                const rescheduledHistory = app.reschedule_history || []
                const linkedOriginal = app.rescheduled_from
                return (
                  <div
                    key={app.id}
                    className={cn(
                      'p-4 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl space-y-3 hover:shadow-md transition-shadow',
                      CATEGORY_STYLES[categorizeAppointment(app)].stripe,
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
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

                      <AppointmentStatusBadge
                        status={app.status}
                        patientName={app.expand?.patient?.name || 'Paciente'}
                        onStatusSelect={(s) => handleStatusSelect(app, s)}
                        onRequestCancel={(kind) => setCancelTarget({ app, kind })}
                      />
                    </div>

                    {app.expand?.professional?.name && (
                      <p className="text-[11px] text-[#6B4F42]">
                        Profissional: {app.expand.professional.name}
                      </p>
                    )}

                    {app.status === 'desmarcado_clinica' || app.status === 'desmarcado_paciente' ? (
                      <div className="text-[11px] bg-orange-50 border border-orange-200 rounded-lg p-2 text-orange-800 space-y-0.5">
                        <p className="font-semibold">
                          {STATUS_LABELS[app.status]} — horário liberado
                        </p>
                        {app.canceled_by && <p>Quem desmarcou: {app.canceled_by}</p>}
                        {app.canceled_reason && <p>Motivo: {app.canceled_reason}</p>}
                        {app.status_changed_at && (
                          <p>
                            Alterado em: {new Date(app.status_changed_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {app.status === 'remarcou' && (
                      <div className="text-[11px] bg-cyan-50 border border-cyan-200 rounded-lg p-2 text-cyan-800">
                        <p className="font-semibold">Remarcou — histórico preservado</p>
                        {rescheduledHistory.length > 0 && (
                          <p>
                            Última:{' '}
                            {rescheduledHistory[rescheduledHistory.length - 1]?.from_date?.slice(
                              0,
                              10,
                            )}{' '}
                            {rescheduledHistory[rescheduledHistory.length - 1]?.from_time} →{' '}
                            {rescheduledHistory[rescheduledHistory.length - 1]?.to_date?.slice(
                              0,
                              10,
                            )}{' '}
                            {rescheduledHistory[rescheduledHistory.length - 1]?.to_time}
                          </p>
                        )}
                      </div>
                    )}

                    {linkedOriginal && (
                      <p className="text-[10px] text-[#6B4F42]">
                        Vinculado ao agendamento original ({linkedOriginal.slice(0, 6)}…)
                      </p>
                    )}

                    {app.status_changed_by && app.status_changed_at && (
                      <p className="text-[10px] text-[#6B4F42]">
                        Último status por {app.status_changed_by} em{' '}
                        {new Date(app.status_changed_at).toLocaleString('pt-BR')}
                      </p>
                    )}

                    {app.notes && (
                      <p className="text-xs text-gray-500 bg-[#FAF6F0] p-2 rounded border border-[#EDE3D8] whitespace-pre-wrap">
                        {app.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-2 border-t border-[#EDE3D8] gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setRescheduleTarget(app)}
                      >
                        <Clock className="w-3.5 h-3.5" /> Remarcar
                      </Button>
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
                )
              })}
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
                      onClick={() => applyStatusChange(app, 'concluido')}
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

      <AppointmentEditDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        appointment={editTarget}
        existingAppointments={appointments}
        patients={patients}
        procedures={procedures}
        professionals={professionals}
        onConfirm={(id, values) => editConfirmRef.current(id, values)}
      />

      <CancelDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        patientName={cancelTarget?.app.expand?.patient?.name || 'Paciente'}
        actorKind={cancelTarget?.kind || 'clinica'}
        currentUser={userName}
        onConfirm={handleCancelConfirm}
      />

      <RescheduleDialog
        open={!!rescheduleTarget}
        onOpenChange={(o) => !o && setRescheduleTarget(null)}
        appointment={rescheduleTarget}
        existingAppointments={appointments}
        onConfirm={handleRescheduleConfirm}
      />

      <BirthdayDialog
        open={birthdayOpen}
        onOpenChange={setBirthdayOpen}
        patients={patients}
        scope="day"
      />

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Agendar Nova Consulta
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Selecione o paciente e procedimento.
              {pendingSlot && ' Pré-preenchido a partir do horário selecionado na grade.'}
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
              <Label className="text-xs font-semibold">Profissional</Label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem profissional</SelectItem>
                  {professionals.map((p) => (
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
                  onChange={(e) => {
                    const v = e.target.value
                    setStartTime(v)
                    if (v && timeToMin(endTime) <= timeToMin(v)) {
                      setEndTime(addMin(v, DEFAULT_APPOINTMENT_DURATION))
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Horário de Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    const dur = Math.max(30, timeToMin(endTime) - timeToMin(startTime) - 15)
                    setEndTime(addMin(startTime, dur))
                  }}
                  title="Diminuir 15 minutos"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-[11px] text-[#6B4F42]">
                  Duração: {Math.max(0, timeToMin(endTime) - timeToMin(startTime))}min
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    setEndTime(
                      addMin(
                        startTime,
                        Math.max(30, timeToMin(endTime) - timeToMin(startTime) + 15),
                      ),
                    )
                  }
                  title="Aumentar 15 minutos"
                >
                  <Plus className="w-3 h-3" />
                </Button>
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
