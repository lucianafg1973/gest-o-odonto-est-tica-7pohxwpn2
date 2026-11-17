import { useCallback, useEffect, useState } from 'react'
import MovimentosCaixa from '@/components/financial/MovimentosCaixa'
import ClinicalHourSheet from '@/components/pricing/ClinicalHourSheet'
import ProceduresPricingPage from '@/components/pricing/ProceduresPricingPage'
import CampaignSimulator from '@/components/pricing/CampaignSimulator'
import { CustosFixosSheet, DerivacaoHoraClinica } from '@/components/pricing/CustosFixosSheet'
import { LucratividadeSheet, PlanilhaInteligente } from '@/components/pricing/LucratividadeSheet'
import { updateClinicalHourConfig } from '@/services/clinical-hour'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/price-calculation'
import {
  calcularHoraClinica,
  getClinicalHourConfig,
  getCostItems,
  ClinicalHourConfig,
  CostItemRecord,
} from '@/services/clinical-hour'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Clock,
  Stethoscope,
  TrendingUp,
  Megaphone,
  Calculator,
} from 'lucide-react'

type Secao =
  | 'visao'
  | 'movimentos'
  | 'hora'
  | 'precificacao'
  | 'procedimentos'
  | 'campanhas'
  | 'indicadores'

const MENU: { key: Secao; label: string; icon: typeof Clock }[] = [
  { key: 'visao', label: 'Visão Geral Financeira', icon: LayoutDashboard },
  { key: 'movimentos', label: 'Receitas e Despesas', icon: ArrowLeftRight },
  { key: 'hora', label: 'Formação da Hora Clínica', icon: Clock },
  { key: 'precificacao', label: 'Precificação', icon: Calculator },
  { key: 'procedimentos', label: 'Procedimentos e Precificação', icon: Stethoscope },
  { key: 'campanhas', label: 'Simulador de Campanhas', icon: Megaphone },
  { key: 'indicadores', label: 'Indicadores de Lucratividade', icon: TrendingUp },
]

/**
 * FINANCEIRO — página autocontida: carrega os próprios dados (planilha de
 * custos, capacidade produtiva e Tabela de Procedimentos e Preços) e deriva a
 * hora clínica em tempo real, sem props externas.
 */
export default function Financial() {
  const [secao, setSecao] = useState<Secao>('visao')
  const [items, setItems] = useState<CostItemRecord[]>([])
  const [config, setConfig] = useState<ClinicalHourConfig | null>(null)
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [cfg, costItems, procs] = await Promise.all([
        getClinicalHourConfig().catch(() => null),
        getCostItems().catch(() => []),
        getProcedures().catch(() => []),
      ])
      setConfig(cfg)
      setItems(costItems)
      setProcedures(procs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  /** Salva parâmetros da hora clínica editados na aba Precificação. */
  const salvarConfigHora = async (patch: {
    available_hours?: number
    idle_percent?: number
    evaluation_extra_percent?: number
  }) => {
    if (!config) return
    setConfig({ ...config, ...patch })
    try {
      await updateClinicalHourConfig(config.id, patch)
    } catch {
      /* mantém o valor otimista; recarregar restaura o banco */
    }
  }

  /** Substitui um procedimento na lista local (edições da aba Precificação). */
  const substituirProcedimento = (p: ProcedureRecord) =>
    setProcedures((prev) => prev.map((x) => (x.id === p.id ? p : x)))

  /**
   * Novo procedimento criado na planilha inteligente: entra IMEDIATAMENTE na
   * lista local (tabela de precificação/lucratividade sem recarregar) e segue
   * no mesmo catálogo da coleção procedures — os planejamentos o veem na
   * próxima busca/recarga.
   */
  const adicionarProcedimento = (p: ProcedureRecord) =>
    setProcedures((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev
        : [...prev, p].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')),
    )

  const custosMensais = items
    .filter((i) => i.active !== false)
    .reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const calculo = calcularHoraClinica(custosMensais, {
    available_hours: config?.available_hours ?? 480,
    idle_percent: config?.idle_percent ?? 20,
    evaluation_extra_percent: config?.evaluation_extra_percent ?? 0,
  })
  const horaClinica = calculo.hourCost

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-title text-2xl font-bold text-[#2D1B14]">Financeiro</h1>
        <p className="text-sm text-[#6B4F42]">
          Hora clínica, Tabela de Procedimentos e Preços e precificação inteligente.
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

      {loading && <p className="text-xs text-[#6B4F42]">Carregando dados financeiros…</p>}

      {secao === 'visao' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">Custos fixos mensais</p>
              <p className="text-2xl font-bold text-[#2D1B14]">{formatCurrency(custosMensais)}</p>
              <p className="text-[11px] text-[#6B4F42]">
                {items.filter((i) => i.active !== false).length} despesas ativas na planilha
              </p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">Hora clínica</p>
              <p className="text-2xl font-bold text-[#C66B4D]">{formatCurrency(horaClinica)}</p>
              <p className="text-[11px] text-[#6B4F42]">
                {calculo.productiveHours.toFixed(0)} h produtivas/mês
              </p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase text-[#6B4F42]">Custo por minuto</p>
              <p className="text-2xl font-bold text-[#2D1B14]">
                {formatCurrency(calculo.minuteCost)}
              </p>
              <p className="text-[11px] text-[#6B4F42]">hora ÷ 60</p>
            </CardContent>
          </Card>
        </div>
      )}

      {secao === 'movimentos' && <MovimentosCaixa />}

      {secao === 'hora' && <ClinicalHourSheet items={items} config={config} onReload={reload} />}

      {secao === 'precificacao' && (
        <div className="space-y-4">
          <p className="text-xs text-[#6B4F42]">
            As duas planilhas que se completam: custos fixos → hora clínica → lucratividade por
            procedimento, com sugestão de preço e desconto máximo para campanhas. Tudo editável e
            salvo no banco.
          </p>
          <CustosFixosSheet items={items} onChange={setItems} />
          <DerivacaoHoraClinica
            custosMensais={custosMensais}
            horasDisponiveis={config?.available_hours ?? 480}
            ociosidade={config?.idle_percent ?? 20}
            fatorAvaliacao={config?.evaluation_extra_percent ?? 0}
            onHorasChange={(v) => salvarConfigHora({ available_hours: v })}
            onOciosidadeChange={(v) => salvarConfigHora({ idle_percent: v })}
            onFatorChange={(v) => salvarConfigHora({ evaluation_extra_percent: v })}
          />
          <LucratividadeSheet
            procedures={procedures}
            custoMinuto={calculo.minuteCost}
            onProcedureUpdate={substituirProcedimento}
          />
          <PlanilhaInteligente
            procedures={procedures}
            custoMinuto={calculo.minuteCost}
            onProcedureUpdate={substituirProcedimento}
            onProcedureCreate={adicionarProcedimento}
          />
        </div>
      )}

      {secao === 'procedimentos' && (
        <ProceduresPricingPage
          horaClinica={horaClinica}
          procedures={procedures}
          onReload={reload}
        />
      )}

      {secao === 'campanhas' && (
        <CampaignSimulator procedures={procedures} onClose={() => setSecao('visao')} />
      )}

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
