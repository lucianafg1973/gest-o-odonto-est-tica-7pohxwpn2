import { useEffect, useMemo, useState } from 'react'
import {
  CostItemRecord,
  createCostItem,
  updateCostItem,
  deleteCostItem,
  calcularHoraClinica,
  periodoAtual,
  updateClinicalHourConfig,
} from '@/services/clinical-hour'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/price-calculation'
import { toast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Clock, Calculator, Sparkles } from 'lucide-react'

/**
 * FORMAÇÃO DA HORA CLÍNICA — planilha totalmente editável de custos e
 * despesas (adicionar, editar, excluir, classificar), separando custos
 * operacionais, provisões e reservas sem duplicidade. Capacidade produtiva
 * com campos editáveis e cálculos automáticos.
 */

const GRUPOS: { key: CostItemRecord['group']; label: string; cor: string }[] = [
  {
    key: 'pessoal',
    label: 'Pessoal (pró-labore, salários, encargos)',
    cor: 'bg-[#C66B4D] text-white',
  },
  { key: 'operacional', label: 'Custos operacionais', cor: 'bg-[#D4AF37] text-[#2D1B14]' },
  { key: 'provisao', label: 'Provisões', cor: 'bg-[#6B8E23] text-white' },
  { key: 'reserva', label: 'Reservas', cor: 'bg-[#8B6F47] text-white' },
]

const CATEGORIAS_SUGERIDAS = [
  'Pró-labore',
  'Salários',
  'Encargos',
  'Aluguel',
  'Condomínio',
  'Energia',
  'Água',
  'Marketing',
  'Contabilidade',
  'Software',
  'Manutenção',
  'Materiais administrativos',
  'Outros',
]

interface Props {
  items: CostItemRecord[]
  config: ClinicalHourConfigLike | null
  onReload: () => void
}

interface ClinicalHourConfigLike {
  id: string
  monthly_operating_cost?: number
  available_clinical_hours?: number
  clinical_hour_value?: number
  rooms_count?: number
  hours_per_day?: number
  days_per_month?: number
  idle_percent?: number
  evaluation_extra_percent?: number
  available_hours?: number
  productive_hours?: number
  hour_cost?: number
  minute_cost?: number
}

export default function ClinicalHourSheet({ items, config, onReload }: Props) {
  const [novo, setNovo] = useState({
    description: '',
    category: CATEGORIAS_SUGERIDAS[0],
    amount: '',
    group: 'operacional' as CostItemRecord['group'],
  })
  const [editing, setEditing] = useState<CostItemRecord | null>(null)
  const [saving, setSaving] = useState(false)

  // Capacidade produtiva (editável) — derivada dos campos do config
  const [cap, setCap] = useState({
    rooms_count: '2',
    hours_per_day: '8',
    days_per_month: '30',
    available_hours: '480',
    idle_percent: '20',
    evaluation_extra_percent: '0',
  })

  useEffect(() => {
    if (config) {
      setCap({
        rooms_count: String(config.rooms_count ?? 2),
        hours_per_day: String(config.hours_per_day ?? 8),
        days_per_month: String(config.days_per_month ?? 30),
        available_hours: String(config.available_hours ?? 480),
        idle_percent: String(config.idle_percent ?? 20),
        evaluation_extra_percent: String(config.evaluation_extra_percent ?? 0),
      })
    }
  }, [config?.id])

  // ---- Cálculos automáticos ----
  const custosMensais = useMemo(() => {
    const somaItens = items
      .filter((i) => i.active !== false)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0)
    // Se a planilha tem itens, a soma deles É o custo mensal (sem duplicidade
    // com monthly_operating_cost — a planilha é a fonte da verdade).
    return somaItens
  }, [items])

  const calculo = useMemo(
    () =>
      calcularHoraClinica(custosMensais, {
        available_hours: Number(cap.available_hours) || 0,
        idle_percent: Number(cap.idle_percent) || 0,
        evaluation_extra_percent: Number(cap.evaluation_extra_percent) || 0,
      }),
    [custosMensais, cap.available_hours, cap.idle_percent, cap.evaluation_extra_percent],
  )

  const porGrupo = (g: CostItemRecord['group']) => items.filter((i) => i.group === g)

  const addItem = async () => {
    const amount = Number(novo.amount.replace(',', '.'))
    if (!novo.description.trim() || !(amount > 0)) {
      toast({ title: 'Informe descrição e valor', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createCostItem({
        description: novo.description.trim(),
        category: novo.category,
        group: novo.group,
        amount,
        period_month: periodoAtual(),
        active: true,
      })
      setNovo({
        description: '',
        category: CATEGORIAS_SUGERIDAS[0],
        amount: '',
        group: 'operacional',
      })
      onReload()
      toast({ title: 'Despesa adicionada!' })
    } catch {
      toast({ title: 'Erro ao adicionar despesa', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateCostItem(editing.id, {
        description: editing.description,
        category: editing.category,
        group: editing.group,
        amount: Number(editing.amount) || 0,
      })
      setEditing(null)
      onReload()
      toast({ title: 'Despesa atualizada — hora clínica recalculada!' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (id: string) => {
    try {
      await deleteCostItem(id)
      onReload()
      toast({ title: 'Despesa excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const salvarCapacidade = async () => {
    if (!config) return
    setSaving(true)
    try {
      await updateClinicalHourConfig(config.id, {
        rooms_count: Number(cap.rooms_count) || 0,
        hours_per_day: Number(cap.hours_per_day) || 0,
        days_per_month: Number(cap.days_per_month) || 0,
        available_hours: Number(cap.available_hours) || 0,
        idle_percent: Number(cap.idle_percent) || 0,
        evaluation_extra_percent: Number(cap.evaluation_extra_percent) || 0,
        productive_hours: calculo.productiveHours,
        hour_cost: calculo.hourCost,
        minute_cost: calculo.minuteCost,
        clinical_hour_value: calculo.hourCost,
      })
      onReload()
      toast({
        title: 'Capacidade salva!',
        description: `${calculo.productiveHours.toFixed(0)} h produtivas — ${formatCurrency(calculo.hourCost)}/hora`,
      })
    } catch {
      toast({ title: 'Erro ao salvar capacidade', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Capacidade produtiva ---- */}
      <Card className="card-warm">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C66B4D]" />
            <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
              Capacidade produtiva
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {(
              [
                ['rooms_count', 'Consultórios'],
                ['hours_per_day', 'Horas/dia'],
                ['days_per_month', 'Dias/mês'],
                ['available_hours', 'Horas disponíveis'],
                ['idle_percent', '% ociosidade'],
                ['evaluation_extra_percent', 'Fator avaliação (%)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-[11px] font-semibold">{label}</Label>
                <Input
                  type="number"
                  step="any"
                  value={cap[key]}
                  onChange={(e) => setCap({ ...cap, [key]: e.target.value })}
                  className="bg-[#FFFDF9] border-[#EDE3D8] text-xs"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
              <p className="text-[10px] text-[#6B4F42] uppercase">Horas produtivas</p>
              <p className="text-lg font-bold text-[#2D1B14]">
                {calculo.productiveHours.toFixed(1)} h
              </p>
              <p className="text-[10px] text-[#6B4F42]">disponíveis × (1 − ociosidade)</p>
            </div>
            <div className="bg-[#C66B4D]/10 rounded-lg p-3 border border-[#C66B4D]/30">
              <p className="text-[10px] text-[#6B4F42] uppercase">Custo da hora clínica</p>
              <p className="text-lg font-bold text-[#C66B4D]">{formatCurrency(calculo.hourCost)}</p>
              <p className="text-[10px] text-[#6B4F42]">custos mensais ÷ horas produtivas</p>
            </div>
            <div className="bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8]">
              <p className="text-[10px] text-[#6B4F42] uppercase">Custo por minuto</p>
              <p className="text-lg font-bold text-[#2D1B14]">
                {formatCurrency(calculo.minuteCost)}
              </p>
              <p className="text-[10px] text-[#6B4F42]">hora ÷ 60</p>
            </div>
          </div>
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs"
            onClick={salvarCapacidade}
            disabled={saving || !config}
          >
            Salvar capacidade
          </Button>
        </CardContent>
      </Card>

      {/* ---- Planilha de custos ---- */}
      <Card className="card-warm">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#C66B4D]" />
              <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
                Custos e despesas mensais
              </h3>
            </div>
            <Badge className="bg-[#C66B4D] text-white">
              Total: {formatCurrency(custosMensais)}
            </Badge>
          </div>

          {/* Nova despesa */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-4">
              <Label className="text-[11px] font-semibold">Descrição</Label>
              <Input
                value={novo.description}
                onChange={(e) => setNovo({ ...novo, description: e.target.value })}
                placeholder="Ex.: Aluguel"
                className="bg-[#FFFDF9] border-[#EDE3D8] text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-[11px] font-semibold">Categoria</Label>
              <select
                value={novo.category}
                onChange={(e) => setNovo({ ...novo, category: e.target.value })}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                {CATEGORIAS_SUGERIDAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-semibold">Grupo</Label>
              <select
                value={novo.group}
                onChange={(e) =>
                  setNovo({ ...novo, group: e.target.value as CostItemRecord['group'] })
                }
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                {GRUPOS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.key}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-semibold">Valor (R$)</Label>
              <Input
                value={novo.amount}
                onChange={(e) => setNovo({ ...novo, amount: e.target.value })}
                placeholder="0,00"
                className="bg-[#FFFDF9] border-[#EDE3D8] text-xs"
              />
            </div>
            <div className="sm:col-span-1">
              <Button
                size="sm"
                className="btn-terracotta-gold w-full text-xs"
                onClick={addItem}
                disabled={saving}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Itens por grupo */}
          {GRUPOS.map((g) => {
            const lista = porGrupo(g.key)
            const total = lista.reduce((s, i) => s + (Number(i.amount) || 0), 0)
            return (
              <div key={g.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={g.cor}>{g.label}</Badge>
                  <span className="text-[11px] text-[#6B4F42]">
                    {formatCurrency(total)} ({lista.length})
                  </span>
                </div>
                {lista.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white border border-[#EDE3D8] rounded-lg px-3 py-2"
                  >
                    {editing?.id === item.id ? (
                      <div className="flex-1 flex flex-wrap gap-2 items-center">
                        <Input
                          value={editing.description}
                          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                          className="h-8 text-xs w-40"
                        />
                        <Input
                          value={String(editing.amount)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              amount: Number(e.target.value.replace(',', '.')) || 0,
                            })
                          }
                          className="h-8 text-xs w-28"
                        />
                        <select
                          value={editing.group}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              group: e.target.value as CostItemRecord['group'],
                            })
                          }
                          className="h-8 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
                        >
                          {GRUPOS.map((gg) => (
                            <option key={gg.key} value={gg.key}>
                              {gg.key}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          className="btn-terracotta-gold text-xs"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setEditing(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-[#2D1B14]">{item.description}</p>
                          <p className="text-[10px] text-[#6B4F42]">{item.category || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#C66B4D]">
                            {formatCurrency(item.amount)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-[#C66B4D]"
                            onClick={() => setEditing({ ...item })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {lista.length === 0 && (
                  <p className="text-[11px] text-[#6B4F42] italic px-1">
                    Nenhuma despesa neste grupo.
                  </p>
                )}
              </div>
            )
          })}

          {custosMensais <= 0 && (
            <div className="flex items-start gap-2 bg-[#FAF6F0] border border-[#EDE3D8] rounded-lg p-3">
              <Sparkles className="w-4 h-4 text-[#D4AF37] mt-0.5" />
              <p className="text-[11px] text-[#6B4F42]">
                Adicione as despesas da clínica (ex.: pró-labore, aluguel, energia…). O custo da
                hora clínica é recalculado automaticamente: custos mensais ÷ horas produtivas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
