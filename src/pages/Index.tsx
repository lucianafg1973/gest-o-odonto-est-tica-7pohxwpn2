import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getFinancialTransactions, FinancialTransactionRecord } from '@/services/financial'
import { getAppointments, AppointmentRecord } from '@/services/appointments'
import { getLeads, LeadRecord } from '@/services/leads'
import { getGoals, GoalRecord } from '@/services/goals'
import { getLfgIntelligence } from '@/services/ai'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import {
  DollarSign,
  TrendingUp,
  Target,
  Brain,
  Sparkles,
  ChevronRight,
  UserPlus,
  Calendar,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartConfig } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { toast } from '@/hooks/use-toast'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<FinancialTransactionRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)

  const loadData = async () => {
    try {
      setTransactions(await getFinancialTransactions())
      setAppointments(await getAppointments())
      setLeads(await getLeads())
      setGoals(await getGoals())
    } catch {
      /* ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('financial_transactions', () => loadData())
  useRealtime('appointments', () => loadData())
  useRealtime('leads', () => loadData())

  const revenue = transactions
    .filter((t) => t.transaction_type === 'receita' && t.status === 'pago')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = transactions
    .filter((t) => t.transaction_type === 'despesa' && t.status === 'pago')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const profit = revenue - expenses
  const paidCount = transactions.filter(
    (t) => t.transaction_type === 'receita' && t.status === 'pago',
  ).length
  const avgTicket = paidCount > 0 ? revenue / paidCount : 0
  const completed = appointments.filter((a) => a.status === 'concluido').length
  const conversionRate =
    appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0
  const goalTarget = goals.reduce((s, g) => s + (g.target_value || 0), 0)
  const goalProgress = goalTarget > 0 ? Math.round((revenue / goalTarget) * 100) : 0

  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth()
    const y = d.getFullYear()
    const monthRev = transactions
      .filter((t) => {
        if (t.transaction_type !== 'receita' || t.status !== 'pago') return false
        const td = new Date(t.transaction_date)
        return td.getMonth() === m && td.getFullYear() === y
      })
      .reduce((s, t) => s + (t.amount || 0), 0)
    return { month: monthNames[m], receita: monthRev }
  })

  const chartConfig: ChartConfig = { receita: { label: 'Receita', color: 'hsl(15 52% 54%)' } }

  const handleAi = async () => {
    setReportLoading(true)
    try {
      const res = await getLfgIntelligence()
      setAiReport(res.report)
      toast({ title: 'Análise LFG Intelligence gerada!' })
    } catch {
      toast({ title: 'Erro ao gerar análise', variant: 'destructive' })
    } finally {
      setReportLoading(false)
    }
  }

  const stats = [
    {
      label: 'Faturamento',
      value: `R$ ${revenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: '#C66B4D',
    },
    {
      label: 'Ticket Médio',
      value: `R$ ${avgTicket.toFixed(0)}`,
      icon: TrendingUp,
      color: '#D4AF37',
    },
    { label: 'Taxa de Conversão', value: `${conversionRate}%`, icon: Target, color: '#C66B4D' },
    {
      label: 'Lucratividade',
      value: `R$ ${profit.toLocaleString('pt-BR')}`,
      icon: Sparkles,
      color: '#D4AF37',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <h2 className="font-serif-title text-2xl font-bold text-[#2D1B14]">
          Olá, {user?.name || 'Profissional'} 👋
        </h2>
        <p className="text-xs text-[#6B4F42] mt-1">
          Metodologia LFG: Lucratividade + Foco + Gestão em um único painel.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => setNewPatientOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-1" /> Novo Paciente
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-[#C66B4D] border-[#EDE3D8]"
            onClick={() => navigate('/pacientes')}
          >
            <Users className="w-4 h-4 mr-1" /> Pacientes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-[#C66B4D] border-[#EDE3D8]"
            onClick={() => navigate('/agenda')}
          >
            <Calendar className="w-4 h-4 mr-1" /> Agenda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-warm border-t-4" style={{ borderTopColor: s.color }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#6B4F42] uppercase">
                {s.label}
              </CardTitle>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2D1B14]">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-warm lg:col-span-2">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14]">
              Tendência de Faturamento (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(15 52% 54%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(15 52% 54%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6B4F42" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6B4F42" />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="hsl(15 52% 54%)"
                    fill="url(#revGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14]">
              Metas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#2D1B14] mb-1">
                <span>Progresso da Meta</span>
                <span className="text-[#C66B4D]">{goalProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C66B4D] to-[#D4AF37] transition-all"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#6B4F42] mt-1">
                R$ {revenue.toLocaleString('pt-BR')} / R$ {goalTarget.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDE3D8]">
              <p className="text-xs text-[#6B4F42]">
                Leads ativos: <strong className="text-[#2D1B14]">{leads.length}</strong>
              </p>
              <p className="text-xs text-[#6B4F42]">
                Consultas hoje:{' '}
                <strong className="text-[#2D1B14]">
                  {
                    appointments.filter((a) => a.date === new Date().toISOString().slice(0, 10))
                      .length
                  }
                </strong>
              </p>
              <p className="text-xs text-[#6B4F42]">
                Despesas:{' '}
                <strong className="text-[#C66B4D]">R$ {expenses.toLocaleString('pt-BR')}</strong>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => navigate('/metas')}
            >
              Ver detalhes <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="card-warm border-[#D4AF37]/50 bg-gradient-to-br from-white to-[#FBF3DC]/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif-title text-lg text-[#2D1B14] flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#D4AF37]" /> LFG Intelligence — Análise & Recomendações
          </CardTitle>
          <Button
            size="sm"
            onClick={handleAi}
            disabled={reportLoading}
            className="btn-terracotta-gold text-xs"
          >
            {reportLoading ? 'Analisando...' : 'Gerar Análise IA'}
          </Button>
        </CardHeader>
        <CardContent>
          {aiReport ? (
            <div className="p-4 bg-white border border-[#EDE3D8] rounded-xl text-xs text-[#2D1B14] whitespace-pre-wrap leading-relaxed">
              {aiReport}
            </div>
          ) : (
            <p className="text-xs text-[#6B4F42] italic py-3">
              Gere uma análise de gargalos, oportunidades e recomendações práticas com IA.
            </p>
          )}
        </CardContent>
      </Card>

      <PatientFormDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        onSaved={() => navigate('/pacientes')}
      />
    </div>
  )
}
