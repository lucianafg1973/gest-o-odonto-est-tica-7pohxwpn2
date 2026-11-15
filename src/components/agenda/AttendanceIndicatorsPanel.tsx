import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppointmentRecord } from '@/services/appointments'
import { computeIndicators, filterByPeriod, type PeriodFilter } from '@/lib/agenda-status'

const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`)

/**
 * Indicadores de comparecimento da agenda: agendados, confirmados, atendidos, faltas,
 * desmarcações (clínica/paciente) e remarcações — com filtros por profissional, dia,
 * semana e mês. Denominadores das taxas exibidos explicitamente.
 */
export default function AttendanceIndicatorsPanel({
  appointments,
  professionals,
}: {
  appointments: AppointmentRecord[]
  professionals: { id: string; name: string }[]
}) {
  const todayISO = new Date().toISOString().slice(0, 10)
  const [period, setPeriod] = useState<PeriodFilter>('day')
  const [refDate, setRefDate] = useState(todayISO)
  const [professional, setProfessional] = useState('todos')

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(appointments, period, refDate)
    if (professional === 'todos') return byPeriod
    return byPeriod.filter((a) => a.professional === professional)
  }, [appointments, period, refDate, professional])

  const ind = computeIndicators(filtered)

  const proOptions = useMemo(
    () => professionals.map((p) => ({ id: p.id, name: p.name || 'Sem nome' })),
    [professionals],
  )

  const cards: { label: string; value: string | number; tone: string }[] = [
    { label: 'Agendados', value: ind.agendados, tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    {
      label: 'Confirmados',
      value: ind.confirmados,
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      label: 'Atendidos',
      value: ind.atendidos,
      tone: 'bg-green-50 text-green-800 border-green-200',
    },
    { label: 'Faltas', value: ind.faltas, tone: 'bg-red-50 text-red-800 border-red-200' },
    {
      label: 'Desmarc. clínica',
      value: ind.desmarcadosClinica,
      tone: 'bg-orange-50 text-orange-800 border-orange-200',
    },
    {
      label: 'Desmarc. paciente',
      value: ind.desmarcadosPaciente,
      tone: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      label: 'Remarcações',
      value: ind.remarcacoes,
      tone: 'bg-purple-50 text-purple-800 border-purple-200',
    },
  ]

  return (
    <Card className="bg-white/90 border-[#EDE3D8]">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <CardTitle className="text-sm font-serif-title text-[#2D1B14]">
            Indicadores de comparecimento
          </CardTitle>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-[#6B4F42]">Período</Label>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as PeriodFilter[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`text-[11px] px-2 py-1 rounded-md border ${
                      period === p
                        ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                        : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                    }`}
                  >
                    {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-[#6B4F42]">Data de referência</Label>
              <Input
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-[#6B4F42]">Profissional</Label>
              <select
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
                className="h-8 text-xs rounded-md border border-[#EDE3D8] bg-white px-2"
              >
                <option value="todos">Todos</option>
                {proOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-lg border p-2 ${c.tone}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {c.label}
              </p>
              <p className="text-lg font-bold">{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[#6B4F42]">
          <span>
            <strong>Comparecimento:</strong> {pct(ind.attendanceRate)}{' '}
            <span className="opacity-70">
              (atendidos ÷ (atendidos + faltas) = {ind.atendidos} ÷ {ind.atendidos + ind.faltas})
            </span>
          </span>
          <span>
            <strong>Faltas:</strong> {pct(ind.absenceRate)}{' '}
            <span className="opacity-70">
              (faltas ÷ (atendidos + faltas) = {ind.faltas} ÷ {ind.atendidos + ind.faltas})
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
