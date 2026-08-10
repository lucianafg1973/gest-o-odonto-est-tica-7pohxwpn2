import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getFinancialTransactions, FinancialTransactionRecord } from '@/services/financial'
import { getProfessionals, ProfessionalRecord } from '@/services/professionals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartConfig } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react'

export default function Indicadores() {
  const [transactions, setTransactions] = useState<FinancialTransactionRecord[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])

  const loadData = async () => {
    setTransactions(await getFinancialTransactions())
    setProfessionals(await getProfessionals())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('financial_transactions', () => loadData())

  const revenue = transactions
    .filter((t) => t.transaction_type === 'receita' && t.status === 'pago')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = transactions
    .filter((t) => t.transaction_type === 'despesa' && t.status === 'pago')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const profit = revenue - expenses
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
  const paidCount = transactions.filter(
    (t) => t.transaction_type === 'receita' && t.status === 'pago',
  ).length
  const avgTicket = paidCount > 0 ? Math.round(revenue / paidCount) : 0

  const prodByProf = professionals.map((p) => ({
    name: p.name.split(' ')[0],
    producao: transactions
      .filter(
        (t) => t.professional === p.id && t.transaction_type === 'receita' && t.status === 'pago',
      )
      .reduce((s, t) => s + (t.amount || 0), 0),
  }))

  const pieData = [
    { name: 'Receita', value: revenue, color: 'hsl(15 52% 54%)' },
    { name: 'Despesas', value: expenses, color: 'hsl(0 72% 51%)' },
  ]

  const barConfig: ChartConfig = { producao: { label: 'Produção', color: 'hsl(15 52% 54%)' } }

  const stats = [
    {
      label: 'Faturamento',
      value: `R$ ${revenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: '#C66B4D',
    },
    {
      label: 'Despesas',
      value: `R$ ${expenses.toLocaleString('pt-BR')}`,
      icon: TrendingDown,
      color: '#dc2626',
    },
    {
      label: 'Lucro Líquido',
      value: `R$ ${profit.toLocaleString('pt-BR')}`,
      icon: TrendingUp,
      color: '#16a34a',
    },
    { label: 'Margem', value: `${margin}%`, icon: Percent, color: '#D4AF37' },
    { label: 'Ticket Médio', value: `R$ ${avgTicket}`, icon: DollarSign, color: '#C66B4D' },
    { label: 'Transações', value: String(paidCount), icon: TrendingUp, color: '#D4AF37' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
          Indicadores Financeiros
        </h2>
        <p className="text-xs text-[#6B4F42] mt-1">
          Lucratividade, produção e desempenho financeiro.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="card-warm p-3">
            <s.icon className="w-4 h-4 mb-1" style={{ color: s.color }} />
            <p className="text-lg font-bold text-[#2D1B14]">{s.value}</p>
            <p className="text-[10px] text-[#6B4F42] uppercase">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14]">
              Produção por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={barConfig} className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodByProf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6B4F42" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6B4F42" />
                  <Bar dataKey="producao" fill="hsl(15 52% 54%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14]">
              Receita vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.name}: R$ ${e.value}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
