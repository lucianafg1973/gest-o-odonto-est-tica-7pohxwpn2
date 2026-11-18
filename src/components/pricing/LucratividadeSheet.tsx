import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AutoWidthNumberInput } from '@/components/pricing/AutoWidthNumberInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateProcedure } from '@/services/procedures'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { custosProcedimento, descontoMaximoC, precoSugeridoC } from '@/lib/precificacao'
import { InserirProcedimentoDialog } from '@/components/pricing/InserirProcedimentoDialog'
import { EditableProcedureName } from '@/components/pricing/EditableProcedureName'
import { Plus } from 'lucide-react'

interface Props {
  procedures: ProcedureRecord[]
  custoMinuto: number
  onProcedureUpdate: (p: ProcedureRecord) => void
  /** Insere um NOVO procedimento no catálogo (botão da planilha inteligente). */
  onProcedureCreate?: (p: ProcedureRecord) => void
}

/**
 * Seção C da aba Precificação — planilha "Situação Atual": lucratividade por
 * procedimento, coluna a coluna da planilha da proprietária. Cada célula
 * editável grava direto no registro da coleção procedures (o preço OFICIAL só
 * muda quando a proprietária edita a própria coluna Preço — os custos nunca o
 * tocam; cálculo 100% em centavos).
 */
export function LucratividadeSheet({
  procedures,
  custoMinuto,
  onProcedureUpdate,
  onProcedureCreate,
}: Props) {
  const [busca, setBusca] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [inserirOpen, setInserirOpen] = useState(false)

  const lista = procedures.filter((p) => p.name?.toLowerCase().includes(busca.trim().toLowerCase()))

  const salvar = async (p: ProcedureRecord, patch: Partial<ProcedureRecord>) => {
    setBusy(p.id)
    onProcedureUpdate({ ...p, ...patch } as ProcedureRecord)
    try {
      await updateProcedure(p.id, patch)
    } finally {
      setBusy(null)
    }
  }

  const celulaNum = (
    p: ProcedureRecord,
    campo: keyof ProcedureRecord & string,
    _largura = 'w-20',
    sufixo = '',
  ) => (
    <AutoWidthNumberInput
      min={0}
      step={sufixo === '%' ? '1' : '0.01'}
      value={String(p[campo] ?? '')}
      onChange={(e) =>
        onProcedureUpdate({ ...p, [campo]: Number(e.target.value) || 0 } as ProcedureRecord)
      }
      onBlur={(e) => {
        const v = Number(e.target.value) || 0
        if (v !== Number(p[campo] ?? 0)) salvar(p, { [campo]: v } as Partial<ProcedureRecord>)
      }}
      minCh={sufixo === '%' ? 3 : 5}
      maxCh={14}
      className="h-7 text-xs text-right bg-transparent border-transparent hover:border-[#EDE3D8]"
      disabled={busy === p.id}
    />
  )

  return (
    <Card className="card-warm">
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
          Situação Atual — lucratividade por procedimento
        </CardTitle>
        <div className="flex items-center gap-2">
          {onProcedureCreate && (
            <Button
              size="sm"
              className="btn-terracotta-gold text-xs"
              onClick={() => setInserirOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Inserir procedimento
            </Button>
          )}
          <Input
            placeholder="Buscar procedimento…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs bg-white sm:w-56"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#F5EEE6] text-[9px] uppercase text-[#6B4F42]">
                <th className="py-2 px-2 text-left font-semibold min-w-[180px]">Procedimento</th>
                <th className="py-2 px-2 font-semibold w-24">Preço (R$)</th>
                <th className="py-2 px-2 font-semibold w-16">Minutos</th>
                <th className="py-2 px-2 font-semibold w-20">Custo hora</th>
                <th className="py-2 px-2 font-semibold w-16">Cartão %</th>
                <th className="py-2 px-2 font-semibold w-20">Laboratório</th>
                <th className="py-2 px-2 font-semibold w-16">Comiss. %</th>
                <th className="py-2 px-2 font-semibold w-16">Inadimp. %</th>
                <th className="py-2 px-2 font-semibold w-20">Material</th>
                <th className="py-2 px-2 font-semibold w-16">Imposto %</th>
                <th className="py-2 px-2 font-semibold w-20">Outros custos</th>
                <th className="py-2 px-2 font-semibold w-24">Custos totais</th>
                <th className="py-2 px-2 font-semibold w-24">Lucro (R$)</th>
                <th className="py-2 px-2 font-semibold w-16">Margem</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const ct = custosProcedimento(p, custoMinuto)
                const negativo = ct.lucro < 0
                return (
                  <tr key={p.id} className="border-t border-[#F5EEE6] hover:bg-[#FAF6F0]">
                    <td className="py-1 px-2">
                      <EditableProcedureName
                        procedure={p}
                        busy={busy === p.id}
                        onSave={(patch) => salvar(p, patch)}
                      />
                    </td>
                    <td className="py-1 px-1 text-right">{celulaNum(p, 'price', 'w-24')}</td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'duration_minutes', 'w-16', '%')}
                    </td>
                    <td className="py-1 px-2 text-right text-[#6B4F42]">
                      {formatCurrency(ct.custoHoraTotal)}
                    </td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'card_fee_percent', 'w-16', '%')}
                    </td>
                    <td className="py-1 px-1 text-right">{celulaNum(p, 'lab_price', 'w-20')}</td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'sales_commission_percent', 'w-16', '%')}
                    </td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'default_percent', 'w-16', '%')}
                    </td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'material_cost', 'w-20')}
                    </td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'tax_percent', 'w-16', '%')}
                    </td>
                    <td className="py-1 px-1 text-right">
                      {celulaNum(p, 'other_direct_cost', 'w-20')}
                    </td>
                    <td className="py-1 px-2 text-right text-[#6B4F42]">
                      {formatCurrency(ct.custosTotais)}
                    </td>
                    <td
                      className={`py-1 px-2 text-right font-bold ${
                        negativo ? 'text-red-600' : 'text-[#2E8B57]'
                      }`}
                    >
                      {formatCurrency(ct.lucro)}
                    </td>
                    <td className="py-1 px-2 text-right">
                      <Badge
                        className={`text-[9px] ${
                          negativo
                            ? 'bg-red-100 text-red-700'
                            : ct.margem < 20
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {ct.margem.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-3 px-2 text-[#6B4F42]">
                    Nenhum procedimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {onProcedureCreate && (
          <InserirProcedimentoDialog
            open={inserirOpen}
            custoMinuto={custoMinuto}
            proceduresExistentes={procedures}
            onOpenChange={setInserirOpen}
            onCreated={onProcedureCreate}
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Painel inteligente: para cada procedimento propõe o preço que atinge a
 * margem ALVO configurada e o desconto máximo possível antes de cair abaixo da
 * margem MÍNIMA (útil para campanhas). Nada aqui altera o preço oficial — só
 * grava os parâmetros min/target_margin_percent quando a proprietária os edita.
 * O botão "Inserir procedimento" fica aqui (pedido da proprietária): abre o
 * mesmo diálogo da seção "Situação Atual" e grava no mesmo catálogo.
 */
export function PlanilhaInteligente({
  procedures,
  custoMinuto,
  onProcedureUpdate,
  onProcedureCreate,
}: Props) {
  const [margemAlvoGlobal, setMargemAlvoGlobal] = useState(30)
  const [margemMinGlobal, setMargemMinGlobal] = useState(20)
  const [busca, setBusca] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [inserirOpen, setInserirOpen] = useState(false)

  const lista = procedures.filter((p) => p.name?.toLowerCase().includes(busca.trim().toLowerCase()))

  const salvar = async (p: ProcedureRecord, patch: Partial<ProcedureRecord>) => {
    setBusy(p.id)
    onProcedureUpdate({ ...p, ...patch } as ProcedureRecord)
    try {
      await updateProcedure(p.id, patch)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="card-warm">
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
          Planilha inteligente — preço sugerido e desconto máximo
        </CardTitle>
        {onProcedureCreate && (
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs whitespace-nowrap"
            onClick={() => setInserirOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Inserir procedimento
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[#6B4F42]">
          Sugestões calculadas a partir dos custos da planilha —{' '}
          <strong>não alteram o preço oficial automaticamente</strong>. Aplique manualmente na
          coluna Preço da aba "Situação Atual" quando concordar.
        </p>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] uppercase text-[#6B4F42] font-semibold">
              Margem alvo padrão (%)
            </label>
            <AutoWidthNumberInput
              min={0}
              max={90}
              value={margemAlvoGlobal}
              onChange={(e) => setMargemAlvoGlobal(Number(e.target.value) || 0)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#6B4F42] font-semibold">
              Margem mínima padrão (%)
            </label>
            <AutoWidthNumberInput
              min={0}
              max={90}
              value={margemMinGlobal}
              onChange={(e) => setMargemMinGlobal(Number(e.target.value) || 0)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div className="flex-1 min-w-40">
            <Input
              placeholder="Buscar procedimento…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#F5EEE6] text-[9px] uppercase text-[#6B4F42]">
                <th className="py-2 px-2 text-left font-semibold min-w-[180px]">Procedimento</th>
                <th className="py-2 px-2 font-semibold w-24">Preço atual</th>
                <th className="py-2 px-2 font-semibold w-20">Margem</th>
                <th className="py-2 px-2 font-semibold w-24">Preço sugerido</th>
                <th className="py-2 px-2 font-semibold w-28">Desconto máximo</th>
                <th className="py-2 px-2 font-semibold w-20">Margem alvo</th>
                <th className="py-2 px-2 font-semibold w-20">Margem mín.</th>
                <th className="py-2 px-2 font-semibold w-16"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const ct = custosProcedimento(p, custoMinuto)
                const alvo = p.target_margin_percent ?? margemAlvoGlobal
                const minimo = p.min_margin_percent ?? margemMinGlobal
                const sugerido = precoSugeridoC(ct, alvo)
                const descMax = descontoMaximoC(ct, minimo)
                return (
                  <tr key={p.id} className="border-t border-[#F5EEE6] hover:bg-[#FAF6F0]">
                    <td className="py-1 px-2 font-medium text-[#2D1B14]">{p.name}</td>
                    <td className="py-1 px-2 text-right">{formatCurrency(ct.preco)}</td>
                    <td className="py-1 px-2 text-right">
                      <span className={ct.margem < minimo ? 'text-red-600 font-bold' : ''}>
                        {ct.margem.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1 px-2 text-right font-bold text-[#C66B4D]">
                      {sugerido != null ? formatCurrency(sugerido) : '—'}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {descMax != null ? (
                        <span
                          className={
                            descMax >= 10
                              ? 'text-[#2E8B57] font-semibold'
                              : descMax > 0
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }
                        >
                          {descMax.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-red-600">—</span>
                      )}
                    </td>
                    <td className="py-1 px-1 text-right">
                      <AutoWidthNumberInput
                        min={0}
                        max={90}
                        value={String(p.target_margin_percent ?? '')}
                        placeholder={String(margemAlvoGlobal)}
                        onChange={(e) =>
                          onProcedureUpdate({
                            ...p,
                            target_margin_percent: Number(e.target.value) || 0,
                          } as ProcedureRecord)
                        }
                        onBlur={(e) => {
                          const v = Number(e.target.value)
                          if (v && v !== (p.target_margin_percent ?? 0))
                            salvar(p, { target_margin_percent: v })
                        }}
                        minCh={3}
                        maxCh={6}
                        className="h-7 text-xs text-right bg-transparent border-transparent hover:border-[#EDE3D8]"
                        disabled={busy === p.id}
                      />
                    </td>
                    <td className="py-1 px-1 text-right">
                      <AutoWidthNumberInput
                        min={0}
                        max={90}
                        minCh={3}
                        maxCh={6}
                        value={String(p.min_margin_percent ?? '')}
                        placeholder={String(margemMinGlobal)}
                        onChange={(e) =>
                          onProcedureUpdate({
                            ...p,
                            min_margin_percent: Number(e.target.value) || 0,
                          } as ProcedureRecord)
                        }
                        onBlur={(e) => {
                          const v = Number(e.target.value)
                          if (v && v !== (p.min_margin_percent ?? 0))
                            salvar(p, { min_margin_percent: v })
                        }}
                        className="h-7 text-xs text-right bg-transparent border-transparent hover:border-[#EDE3D8]"
                        disabled={busy === p.id}
                      />
                    </td>
                    <td className="py-1 px-2 text-right">
                      {sugerido != null && Math.abs(sugerido - ct.preco) > 0.5 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          disabled={busy === p.id}
                          onClick={() => salvar(p, { price: sugerido })}
                          title="Aplicar preço sugerido ao preço oficial"
                        >
                          Aplicar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 px-2 text-[#6B4F42]">
                    Nenhum procedimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {onProcedureCreate && (
          <InserirProcedimentoDialog
            open={inserirOpen}
            custoMinuto={custoMinuto}
            proceduresExistentes={procedures}
            onOpenChange={setInserirOpen}
            onCreated={onProcedureCreate}
          />
        )}
      </CardContent>
    </Card>
  )
}
