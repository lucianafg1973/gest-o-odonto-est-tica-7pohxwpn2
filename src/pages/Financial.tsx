import { useMemo, useState } from 'react'
import ClinicalHourSheet from '@/components/pricing/ClinicalHourSheet'
import ProceduresPricingPage from '@/components/pricing/ProceduresPricingPage'
import CampaignSimulator from '@/components/pricing/CampaignSimulator'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/price-calculation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Clock,
  Stethoscope,
  TrendingUp,
  Megaphone,
} from 'lucide-react'

type Secao = 'visao' | 'movimentos' | 'hora' | 'procedimentos' | 'campanhas' | 'indicadores'

const MENU: { key: Secao; label: string; icon: typeof Clock }[] = [
  { key: 'visao', label: 'Visão Geral Financeira', icon: LayoutDashboard },
  { key: 'movimentos', label: 'Receitas e Despesas', icon: ArrowLeftRight },
  { key: 'hora', label: 'Formação da Hora Clínica', icon: Clock },
  { key: 'procedimentos', label: 'Procedimentos e Precificação', icon: Stethoscope },
  { key: 'campanhas', label: 'Simulador de Campanhas', icon: Megaphone },
  { key: 'indicadores', label: 'Indicadores de Lucratividade', icon: TrendingUp },
]

interface Props {
  horaClinica: number
  procedures: import('@/services/procedures').ProcedureRecord[]
  custosItems: {
    id: string
    description: string
    group: string
    category?: string
    amount: number
    active: boolean
  }[]
  configHora: { id: string; [k: string]: unknown } | null
  onReloadHora: () => void
}

export default function Financial({
  horaClinica,
  procedures,
  custosItems,
  configHora,
  onReloadHora,
}: Props) {
  const [secao, setSecao] = useState<Secao>('visao')

  const despesas = custosItems.reduce((s, i) => s + (i.active ? Number(i.amount) || 0 : 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-title text-2xl font-bold text-[#2D1B14]">Financeiro</h1>
        <p className="text-sm text-[#6B4F42]">
          Hora clínica, tabela única de procedimentos e precificação inteligente.
        </p>
      </div>

      {/* Menu Financeiro */}
      <div className="flex flex-wrap gap-2">
        {MENU.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSecao(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition ${
              secao === key
                ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                : 'bg-white text-[#6B4F42] border-[#EDE3D8] hover:bg-[#FAF6F0]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {secao === 'visao' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">Hora clínica</p>
              <p className="text-2xl font-bold text-[#C66B4D]">{formatCurrency(horaClinica)}</p>
              <p className="text-[11px] text-[#6B4F42]">Custo/hora da equipe e estrutura</p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">
                Custos fixos mensais (planilha)
              </p>
              <p className="text-2xl font-bold text-[#2D1B14]">{formatCurrency(despesas)}</p>
              <p className="text-[11px] text-[#6B4F42]">
                {custosItems.filter((i) => i.active).length} despesas ativas
              </p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">Custo por minuto</p>
              <p className="text-2xl font-bold text-[#2D1B14]">
                {formatCurrency(horaClinica / 60)}
              </p>
              <p className="text-[11px] text-[#6B4F42]">hora ÷ 60</p>
            </CardContent>
          </Card>
        </div>
      )}

      {secao === 'movimentos' && (
        <Card className="card-warm">
          <CardContent className="pt-5">
            <p className="text-xs text-[#6B4F42]">
              Receitas e despesas continuam na aba Financeiro do paciente e nas transações — esta
              seção resume os custos fixos da planilha da Hora Clínica ({formatCurrency(despesas)}
              /mês).
            </p>
          </CardContent>
        </Card>
      )}

      {secao === 'hora' && (
        <ClinicalHourSheet items={custosItems} config={configHora} onReload={onReloadHora} />
      )}

      {secao === 'procedimentos' && (
        <ProceduresPricingPage
          horaClinica={horaClinica}
          procedures={procedures}
          onReload={onReloadHora}
        />
      )}

      {secao === 'campanhas' && <CampaignSimulator horaClinica={horaClinica} />}

      {secao === 'indicadores' && (
        <Card className="card-warm">
          <CardContent className="pt-5 space-y-2">
            <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
              Indicadores de Lucratividade
            </h3>
            <p className="text-xs text-[#6B4F42]">
              Margem por procedimento disponível na tabela (coluna Margem). Procedimentos abaixo da
              margem mínima são sinalizados em vermelho — nunca há lucratividade fictícia quando
              falta dado (mostrado como “pendente”).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
