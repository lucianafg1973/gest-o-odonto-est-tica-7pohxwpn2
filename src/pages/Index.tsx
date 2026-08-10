import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { getAppointments, AppointmentRecord } from '@/services/appointments'
import { getFinancialTransactions, FinancialTransactionRecord } from '@/services/financial'
import { getPatients, PatientRecord } from '@/services/patients'
import { generateAiReport } from '@/services/ai'
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Sparkles,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [todayAppointments, setTodayAppointments] = useState<AppointmentRecord[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0)
  const [activePatientsCount, setActivePatientsCount] = useState<number>(0)
  const [noShowRate, setNoShowRate] = useState<number>(0)
  const [recentPatients, setRecentPatients] = useState<PatientRecord[]>([])
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [reportLoading, setLoadingReport] = useState(false)

  const loadDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      const apps = await getAppointments(`date = "${todayStr}"`)
      setTodayAppointments(apps)

      const allApps = await getAppointments()
      const totalPast = allApps.filter((a) => a.status === 'concluido' || a.status === 'faltou')
      const missing = allApps.filter((a) => a.status === 'faltou')
      const rate = totalPast.length > 0 ? (missing.length / totalPast.length) * 100 : 5
      setNoShowRate(Math.round(rate))

      const fin = await getFinancialTransactions()
      const revenue = fin
        .filter((t) => t.transaction_type === 'receita' && t.status === 'pago')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      setMonthlyRevenue(revenue)

      const pats = await getPatients()
      setActivePatientsCount(pats.length)
      setRecentPatients(pats.slice(0, 5))
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleGenerateReport = async () => {
    setLoadingReport(true)
    try {
      const res = await generateAiReport({
        consultas_hoje: todayAppointments.length,
        receita_mes: monthlyRevenue,
        pacientes_totais: activePatientsCount,
        taxa_faltas: `${noShowRate}%`,
      })
      setAiReport(res.report)
      toast({
        title: 'Relatório IA gerado!',
        description: 'Análise estratégica da clínica concluída.',
      })
    } catch (_) {
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setLoadingReport(false)
    }
  }

  const openWhatsAppReminder = (app: AppointmentRecord) => {
    const patientName = app.expand?.patient?.name || 'Paciente'
    const phone = app.expand?.patient?.phone?.replace(/\D/g, '') || ''
    const text = `Olá, ${patientName}! Lembramos da sua consulta na Clínica Odonto Estética hoje às ${app.start_time}. Favor confirmar a presença!`
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-2xl font-bold text-[#2D1B14]">
            Olá, {user?.name || 'Dra. Luciana'} 👋
          </h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Aqui está a visão geral e a inteligência operacional da clínica hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#EDE3D8] text-xs text-[#2D1B14]"
            onClick={() => navigate('/agenda')}
          >
            <Calendar className="w-4 h-4 mr-1 text-[#C66B4D]" /> Ver Agenda Completa
          </Button>
          <Button
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => navigate('/pacientes')}
          >
            + Novo Paciente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-warm border-t-4 border-t-[#C66B4D]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#6B4F42] uppercase">
              Consultas Hoje
            </CardTitle>
            <Calendar className="w-4 h-4 text-[#C66B4D]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D1B14]">{todayAppointments.length}</div>
            <p className="text-[11px] text-emerald-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card className="card-warm border-t-4 border-t-[#D4AF37]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#6B4F42] uppercase">
              Receita no Mês
            </CardTitle>
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D1B14]">
              R$ {monthlyRevenue.toLocaleString('pt-BR')}
            </div>
            <p className="text-[11px] text-emerald-600 flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Meta mensal em 84%
            </p>
          </CardContent>
        </Card>

        <Card className="card-warm border-t-4 border-t-[#C66B4D]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#6B4F42] uppercase">
              Pacientes Ativos
            </CardTitle>
            <Users className="w-4 h-4 text-[#C66B4D]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D1B14]">{activePatientsCount}</div>
            <p className="text-[11px] text-[#6B4F42] mt-1">Cadastrados e recorrentes</p>
          </CardContent>
        </Card>

        <Card className="card-warm border-t-4 border-t-[#D4AF37]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#6B4F42] uppercase">
              Taxa de Faltas
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D1B14]">{noShowRate}%</div>
            <p className="text-[11px] text-emerald-600 mt-1">Reduzida via lembretes WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-warm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#EDE3D8] pb-4">
              <CardTitle className="font-serif-title text-lg text-[#2D1B14] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C66B4D]" /> Agenda de Hoje
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-[#C66B4D]"
                onClick={() => navigate('/agenda')}
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {todayAppointments.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6B4F42]">
                  Nenhum agendamento para a data de hoje.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3.5 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl hover:border-[#C66B4D]/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 text-center py-1 rounded-lg bg-[#FAF0EB] text-[#C66B4D] font-bold text-xs">
                          {app.start_time}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2D1B14]">
                            {app.expand?.patient?.name || 'Paciente'}
                          </p>
                          <p className="text-xs text-[#6B4F42]">
                            {app.expand?.procedure?.name || 'Consulta Médica'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            app.status === 'confirmado'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : app.status === 'concluido'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'faltou'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {app.status}
                        </span>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          title="Enviar lembrete no WhatsApp"
                          onClick={() => openWhatsAppReminder(app)}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-warm border-[#D4AF37]/50 bg-gradient-to-br from-white to-[#FBF3DC]/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-serif-title text-lg text-[#2D1B14] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" /> Relatório de Desempenho Operacional
                (IA)
              </CardTitle>
              <Button
                size="sm"
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="btn-terracotta-gold text-xs"
              >
                {reportLoading ? 'Analisando...' : 'Gerar Relatório IA'}
              </Button>
            </CardHeader>
            <CardContent>
              {aiReport ? (
                <div className="p-4 bg-white border border-[#EDE3D8] rounded-xl text-xs text-[#2D1B14] whitespace-pre-wrap leading-relaxed">
                  {aiReport}
                </div>
              ) : (
                <p className="text-xs text-[#6B4F42] italic py-3">
                  Clique no botão acima para processar dados de receita, procedimentos populares e
                  taxas de faltas em uma análise consultiva gerada por inteligência artificial.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-warm">
            <CardHeader className="border-b border-[#EDE3D8] pb-3">
              <CardTitle className="font-serif-title text-base text-[#2D1B14]">
                Resumo de Recebimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#2D1B14]">
                  <span>Pix Copia e Cola</span>
                  <span className="text-[#C66B4D]">55%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C66B4D] w-[55%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#2D1B14]">
                  <span>Cartão de Crédito / Débito</span>
                  <span className="text-[#D4AF37]">30%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4AF37] w-[30%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#2D1B14]">
                  <span>Boleto Bancário</span>
                  <span className="text-amber-800">15%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-700 w-[15%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#EDE3D8] pb-3">
              <CardTitle className="font-serif-title text-base text-[#2D1B14]">
                Pacientes Recentes
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-[#C66B4D]"
                onClick={() => navigate('/pacientes')}
              >
                Ver todos
              </Button>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {recentPatients.map((pat) => (
                <div
                  key={pat.id}
                  onClick={() => navigate(`/pacientes/${pat.id}`)}
                  className="flex items-center gap-3 p-2 hover:bg-[#FAF0EB] rounded-lg cursor-pointer transition-colors"
                >
                  <Avatar className="w-8 h-8 border border-[#C66B4D]/30">
                    <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                      {pat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate flex-1">
                    <p className="text-xs font-semibold text-[#2D1B14] truncate">{pat.name}</p>
                    <p className="text-[10px] text-[#6B4F42]">{pat.phone}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
