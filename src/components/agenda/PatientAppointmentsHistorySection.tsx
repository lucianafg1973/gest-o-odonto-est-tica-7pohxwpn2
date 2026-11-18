/**
 * Histórico de agendamentos do paciente — Seção EMBUTIDA NO PRONTUÁRIO
 * (aba "Prontuário" da ficha): todas as marcações, faltas, cancelamentos
 * (com quem/motivo) e remarcações — lendo os dados REAIS das coleções
 * appointments (status, canceled_by/reason, reschedule_history) e
 * appointment_status_events.
 *
 * Antes disso (0.0.79–0.0.83) o conteúdo vivia num diálogo aberto por um
 * botão no cabeçalho da ficha — a usuária pediu que ficasse no PRONTUÁRIO.
 */
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarClock, History } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import {
  getAppointments,
  STATUS_LABELS,
  STATUS_COLORS,
  type AppointmentRecord,
  type AppointmentStatusEventRecord,
  type RescheduleHistoryEntry,
} from '@/services/appointments'

const fmtData = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR')
}

const fmtDataHora = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
}

const FREED: string[] = ['desmarcado_clinica', 'desmarcado_paciente', 'remarcou']

/**
 * Seção embutida no PRONTUÁRIO (aba "Prontuário" da ficha do paciente):
 * contadores, marcações, faltas, cancelamentos (com quem/motivo) e remarcações.
 */
export default function PatientAppointmentsHistorySection({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const [apps, setApps] = useState<AppointmentRecord[]>([])
  const [events, setEvents] = useState<AppointmentStatusEventRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!patientId) return
    let alive = true
    setLoading(true)
    setErro('')
    ;(async () => {
      try {
        const list = await getAppointments(`patient = "${patientId}"`)
        if (!alive) return
        // Mais recentes primeiro.
        list.sort((a, b) =>
          ((b.date || '') + (b.start_time || '')).localeCompare(
            (a.date || '') + (a.start_time || ''),
          ),
        )
        setApps(list)
        // Eventos de status de TODOS os agendamentos do paciente (uma consulta só).
        const ids = list.map((a) => a.id)
        if (ids.length > 0) {
          const evs = await pb
            .collection('appointment_status_events')
            .getFullList<AppointmentStatusEventRecord>({
              filter: ids.map((id) => `appointment = "${id}"`).join(' || '),
              sort: '-created',
            })
          if (alive) setEvents(evs)
        } else {
          setEvents([])
        }
      } catch {
        if (alive) setErro('Não foi possível carregar o histórico de agendamentos.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [patientId])

  const faltas = apps.filter((a) => a.status === 'faltou').length
  const cancelados = apps.filter(
    (a) => a.status === 'desmarcado_clinica' || a.status === 'desmarcado_paciente',
  ).length
  const remarcados = apps.filter((a) => a.status === 'remarcou').length
  const eventosPorApp = new Map<string, AppointmentStatusEventRecord[]>()
  for (const ev of events) {
    const arr = eventosPorApp.get(ev.appointment)
    if (arr) arr.push(ev)
    else eventosPorApp.set(ev.appointment, [ev])
  }

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-3">
        <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
          <History className="w-4 h-4 text-[#C66B4D]" /> Histórico de agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[#6B4F42] mb-3">
          {patientName} — marcações, faltas, cancelamentos e remarcações.
        </p>

        <div className="space-y-3 py-1">
          {!loading && !erro && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge className="bg-[#FAF6F0] text-[#6B4F42] border border-[#EDE3D8]">
                {apps.length} {apps.length === 1 ? 'agendamento' : 'agendamentos'}
              </Badge>
              <Badge className="bg-red-100 text-red-800 border border-red-200">
                {faltas} faltas
              </Badge>
              <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                {cancelados} cancelamentos
              </Badge>
              <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-200">
                {remarcados} remarcações
              </Badge>
            </div>
          )}

          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {loading && <p className="text-xs text-[#6B4F42]">Carregando histórico...</p>}
          {!loading && !erro && apps.length === 0 && (
            <p className="text-xs text-[#6B4F42]">
              Nenhum agendamento registrado para este paciente.
            </p>
          )}

          <div className="space-y-2">
            {apps.map((a) => {
              const evs = eventosPorApp.get(a.id) || []
              const history: RescheduleHistoryEntry[] = a.reschedule_history || []
              return (
                <div
                  key={a.id}
                  className="border border-[#EDE3D8] rounded-xl p-3 bg-[#FFFDF9] space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2D1B14]">
                        {fmtData(a.date)} · {(a.start_time || '').slice(0, 5)}
                        {a.end_time ? `–${a.end_time.slice(0, 5)}` : ''}
                      </p>
                      <p className="text-[11px] text-[#6B4F42] truncate">
                        {a.expand?.procedure?.name || 'Atendimento Geral'}
                        {a.expand?.professional?.name ? ` — ${a.expand.professional.name}` : ''}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] border shrink-0 ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </Badge>
                  </div>

                  {(a.status === 'desmarcado_clinica' || a.status === 'desmarcado_paciente') && (
                    <p className="text-[11px] text-[#8A3A2A]">
                      Cancelado por {a.canceled_by || '—'}
                      {a.canceled_reason ? ` — motivo: ${a.canceled_reason}` : ''}
                      {a.status_changed_at ? ` em ${fmtDataHora(a.status_changed_at)}` : ''}
                    </p>
                  )}

                  {a.status === 'faltou' && (
                    <p className="text-[11px] text-red-700">
                      Falta registrada
                      {a.status_changed_at ? ` em ${fmtDataHora(a.status_changed_at)}` : ''}
                    </p>
                  )}

                  {history.length > 0 && (
                    <div className="text-[11px] text-[#6B4F42] space-y-0.5">
                      <p className="font-semibold text-[#2D1B14]">Remarcações:</p>
                      {history.map((h, i) => (
                        <p key={i}>
                          • {fmtData(h.from_date)} {h.from_time} → {fmtData(h.to_date)} {h.to_time}
                          {h.by ? ` (por ${h.by})` : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  {evs.length > 0 && (
                    <div className="text-[10px] text-[#6B4F42] space-y-0.5 border-t border-[#EDE3D8]/70 pt-1.5">
                      {evs.map((ev) => (
                        <p key={ev.id} className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3 shrink-0 text-[#C66B4D]" />
                          {fmtDataHora(ev.created)} —{' '}
                          {STATUS_LABELS[
                            (ev.from_status || ev.to_status) as keyof typeof STATUS_LABELS
                          ] ||
                            ev.from_status ||
                            '—'}{' '}
                          →{' '}
                          {STATUS_LABELS[ev.to_status as keyof typeof STATUS_LABELS] ||
                            ev.to_status}
                          {ev.changed_by ? ` (por ${ev.changed_by})` : ''}
                          {ev.reason ? ` — ${ev.reason}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
