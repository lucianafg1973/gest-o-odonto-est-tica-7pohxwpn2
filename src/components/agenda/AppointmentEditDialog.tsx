/**
 * Diálogo de edição do agendamento existente: troca de paciente, procedimento,
 * profissional, data e horários início/fim (com botões +/− de 15 min).
 * COMPROMISSOS (entry_kind='compromisso'): sem paciente/procedimento; mostra o
 * campo "Qual", o seletor Dia inteiro vs Horário específico (desabilita as horas)
 * e o botão Excluir — o mesmo fluxo de clique no bloco → editar.
 * Regra preservada: sem duplicidade com agendamento ATIVO (excluindo o próprio registro).
 */
import { useEffect, useState } from 'react'
import { CalendarClock, Minus, Plus, Trash2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AppointmentRecord } from '@/services/appointments'
import { durationMinutes, compromissoTitulo } from '@/services/appointments'
import type { PatientRecord } from '@/services/patients'
import type { ProcedureRecord } from '@/services/procedures'
import type { ProfessionalRecord } from '@/services/professionals'
import { hasActiveAppointmentAt } from '@/lib/agenda-status'

const SLOT_MIN = 30
const STEP_MIN = 15

/** Duração mínima = slot da grade; nunca fim ≤ início. */
const clampDuration = (min: number) => Math.max(SLOT_MIN, Math.min(24 * 60, Math.round(min)))

const addMinToTime = (t: string, delta: number): string => {
  const [h, m] = (t || '09:00').split(':').map(Number)
  let total = (h || 0) * 60 + (m || 0) + delta
  total = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const timeToMin = (t: string): number => {
  const [h, m] = (t || '09:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export interface AppointmentEditValues {
  patient: string
  procedure?: string
  professional?: string
  date: string
  start_time: string
  end_time: string
  notes?: string
  /** Compromisso: o "qual" (reunião, administrativo, pausa, curso…). */
  entry_title?: string
  /** Compromisso de dia inteiro (desabilita as horas; bloqueia a coluna do dia). */
  is_all_day?: boolean
}

/** Sugestões curtas de compromisso (texto livre também é aceito). */
const COMPROMISSO_SUGESTOES = ['Reunião', 'Administrativo', 'Pausa', 'Curso', 'Manutenção']

export default function AppointmentEditDialog({
  open,
  onOpenChange,
  appointment,
  existingAppointments,
  patients,
  procedures,
  professionals,
  onConfirm,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: AppointmentRecord | null
  existingAppointments: AppointmentRecord[]
  patients: PatientRecord[]
  procedures: ProcedureRecord[]
  professionals: ProfessionalRecord[]
  onConfirm: (id: string, values: AppointmentEditValues) => void
  onDelete?: (id: string) => void
}) {
  const isComp = appointment?.entry_kind === 'compromisso'
  const [patient, setPatient] = useState('')
  const [procedure, setProcedure] = useState('')
  const [professional, setProfessional] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('09:40')
  const [notes, setNotes] = useState('')
  const [entryTitle, setEntryTitle] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && appointment) {
      setPatient(appointment.patient || '')
      setProcedure(appointment.procedure || '')
      setProfessional(appointment.professional || '')
      setDate((appointment.date || '').slice(0, 10))
      setStartTime((appointment.start_time || '09:00').slice(0, 5))
      const dur = durationMinutes(appointment)
      setEndTime(addMinToTime((appointment.start_time || '09:00').slice(0, 5), dur))
      setNotes(appointment.notes || '')
      setEntryTitle(
        compromissoTitulo(appointment) === 'Compromisso' ? '' : compromissoTitulo(appointment),
      )
      setIsAllDay(!!appointment.is_all_day)
      setError(null)
    }
  }, [open, appointment])

  const duration = Math.max(0, timeToMin(endTime) - timeToMin(startTime))

  /** Ajusta a duração em ±15 min (recalcula o fim; início fica fixo). */
  const adjustDuration = (delta: number) => {
    const next = clampDuration(duration + delta)
    setEndTime(addMinToTime(startTime, next))
    setError(null)
  }

  /** Normaliza o fim ao sair do campo: vazio ou ≤ início → início + 30 min. */
  const normalizeEndTime = () => {
    if (!endTime) {
      setEndTime(addMinToTime(startTime, SLOT_MIN))
      return
    }
    let end = timeToMin(endTime)
    if (end <= timeToMin(startTime)) end = timeToMin(startTime) + SLOT_MIN
    setEndTime(addMinToTime(startTime, end - timeToMin(startTime)))
    setError(null)
  }

  const confirm = () => {
    if (!appointment) return
    if (!date) {
      setError('Preencha a data.')
      return
    }
    if (isComp) {
      if (!entryTitle.trim()) {
        setError('Informe qual é o compromisso (ex.: reunião, administrativo…).')
        return
      }
      // Dia inteiro não usa horários; horário específico exige fim > início.
      if (!isAllDay && (!endTime || timeToMin(endTime) <= timeToMin(startTime))) {
        setError('O horário de fim deve ser depois do início (mínimo 30 min).')
        return
      }
      onConfirm(appointment.id, {
        patient: '',
        professional: professional === 'none' ? '' : professional,
        date,
        start_time: isAllDay ? '00:00' : startTime,
        end_time: isAllDay ? '23:59' : endTime,
        notes,
        entry_title: entryTitle.trim(),
        is_all_day: isAllDay,
      })
      return
    }
    if (!patient || !startTime || !endTime) {
      setError('Preencha paciente, data e horários.')
      return
    }
    if (timeToMin(endTime) <= timeToMin(startTime)) {
      setError('O horário de fim deve ser depois do início (mínimo 30 min).')
      return
    }
    // duplicidade com agendamento ATIVO, excluindo o próprio registro da checagem
    if (hasActiveAppointmentAt(existingAppointments, patient, date, startTime, appointment.id)) {
      setError('Este paciente já possui um agendamento ativo nessa data e horário.')
      return
    }
    // "none" → "" limpa a relação no banco (procedimento/profissional opcionais)
    onConfirm(appointment.id, {
      patient,
      procedure: procedure === 'none' ? '' : procedure,
      professional: professional === 'none' ? '' : professional,
      date,
      start_time: startTime,
      end_time: endTime,
      notes,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#C66B4D]" />{' '}
            {isComp ? 'Editar compromisso' : 'Editar agendamento'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            {isComp
              ? 'Altere o compromisso (qual, dia inteiro ou horário), profissional, data e horas. O registro é atualizado — não é criado um novo.'
              : 'Altere paciente, procedimento, profissional, data e horários. O registro é atualizado — não é criado um novo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isComp ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Qual</Label>
                <Input
                  placeholder="Ex.: reunião, administrativo, pausa, curso…"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMPROMISSO_SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="text-[10px] px-2 py-0.5 rounded-full border border-[#EDE3D8] bg-[#FAF6F0] text-[#6B4F42] hover:bg-[#FFF3D6]"
                      onClick={() => setEntryTitle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duração</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#2D1B14] cursor-pointer">
                    <Checkbox checked={isAllDay} onCheckedChange={(v) => setIsAllDay(v === true)} />
                    Dia inteiro
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#2D1B14] cursor-pointer">
                    <Checkbox
                      checked={!isAllDay}
                      onCheckedChange={(v) => setIsAllDay(v !== true)}
                    />
                    Horário específico
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Profissional</Label>
                <Select value={professional || 'none'} onValueChange={setProfessional}>
                  <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (clínica)</SelectItem>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Paciente</Label>
                <Select value={patient} onValueChange={setPatient}>
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
                <Select value={procedure} onValueChange={setProcedure}>
                  <SelectTrigger className="bg-[#FFFDF9] border-[#EDE3D8]">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem procedimento</SelectItem>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (R$ {p.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Profissional</Label>
                <Select value={professional || 'none'} onValueChange={setProfessional}>
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
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!isComp || !isAllDay ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Início</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const v = e.target.value
                      setStartTime(v)
                      if (v) setEndTime(addMinToTime(v, Math.max(SLOT_MIN, duration)))
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fim</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onBlur={normalizeEndTime}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustDuration(-STEP_MIN)}
                  disabled={duration <= SLOT_MIN}
                  title="Diminuir 15 minutos"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="flex-1 text-center text-xs text-[#6B4F42]">
                  Duração:{' '}
                  <span className="font-semibold text-[#2D1B14]">
                    {Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)}h ` : ''}
                    {duration % 60}min
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustDuration(STEP_MIN)}
                  title="Aumentar 15 minutos"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-[#6B4F42] bg-[#FAF6F0] border border-[#EDE3D8] rounded-lg p-2">
              Dia inteiro: o compromisso ocupa o dia todo na grade (os campos de hora ficam
              desabilitados).
            </p>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div
          className={`flex items-center gap-2 pt-2 border-t border-[#EDE3D8] ${
            isComp && onDelete ? 'justify-between' : 'justify-end'
          }`}
        >
          {isComp && onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onDelete(appointment!.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#C66B4D] text-white hover:bg-[#B25A3E]"
              onClick={confirm}
            >
              Salvar alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
