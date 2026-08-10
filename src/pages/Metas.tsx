import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getGoals, createGoal, GoalRecord } from '@/services/goals'
import { getProfessionals, ProfessionalRecord } from '@/services/professionals'
import { getFinancialTransactions } from '@/services/financial'
import { Plus, Target, TrendingUp } from 'lucide-react'
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

const goalTypeLabels: Record<string, string> = {
  faturamento: 'Faturamento',
  producao: 'Produção',
  conversao: 'Conversão',
  novos_pacientes: 'Novos Pacientes',
}

export default function Metas() {
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [profId, setProfId] = useState(''),
    [target, setTarget] = useState(''),
    [goalType, setGoalType] = useState('faturamento')

  const loadData = async () => {
    setGoals(await getGoals())
    setProfessionals(await getProfessionals())
    setTransactions(await getFinancialTransactions())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('goals', () => loadData())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createGoal({
        professional: profId || undefined,
        period: new Date().toISOString().slice(0, 7),
        target_value: parseFloat(target) || 0,
        current_value: 0,
        goal_type: goalType as any,
      })
      toast({ title: 'Meta criada!' })
      setOpenModal(false)
      setProfId('')
      setTarget('')
      loadData()
    } catch {
      toast({ title: 'Erro ao criar meta', variant: 'destructive' })
    }
  }

  const getCurrentValue = (goal: GoalRecord) => {
    if (goal.goal_type === 'faturamento') {
      return transactions
        .filter(
          (t) =>
            t.professional === goal.professional &&
            t.transaction_type === 'receita' &&
            t.status === 'pago',
        )
        .reduce((s, t) => s + (t.amount || 0), 0)
    }
    return goal.current_value || 0
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">Metas & Objetivos</h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Acompanhamento de metas por profissional e período.
          </p>
        </div>
        <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const current = getCurrentValue(goal)
          const progress =
            goal.target_value > 0 ? Math.round((current / goal.target_value) * 100) : 0
          return (
            <Card key={goal.id} className="card-warm">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#C66B4D]" />
                  {goalTypeLabels[goal.goal_type] || goal.goal_type}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6B4F42]">
                    {goal.expand?.professional?.name || 'Geral'}
                  </span>
                  <span className="text-[#6B4F42]">{goal.period}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#2D1B14] mb-1">
                    <span>R$ {current.toLocaleString('pt-BR')}</span>
                    <span className={progress >= 100 ? 'text-emerald-600' : 'text-[#C66B4D]'}>
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#C66B4D] to-[#D4AF37]'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#6B4F42] mt-1">
                    Meta: R$ {goal.target_value.toLocaleString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">Nova Meta</DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Defina uma meta para o período atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Profissional</Label>
              <Select value={profId} onValueChange={setProfId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Tipo de Meta</Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Valor da Meta (R$)</Label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Criar Meta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
