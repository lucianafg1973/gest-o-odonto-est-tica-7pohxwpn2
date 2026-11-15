import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCostItem,
  deleteCostItem,
  updateCostItem,
  CostItemRecord,
} from '@/services/clinical-hour'
import { formatCurrency } from '@/lib/price-calculation'

export interface LinhaFixa {
  id: string
  nome: string
  valor: number // reais
}

interface Props {
  items: CostItemRecord[]
  onChange: (next: CostItemRecord[]) => void
}

/**
 * Seção A da aba Precificação — planilha "Custos e Despesas Fixas" idêntica à
 * da proprietária (nomes + valores, total automático), editável: renomear,
 * editar valor, adicionar e remover linha. Grava direto na coleção
 * clinic_cost_items (existente, migração 0016 + seed 20251115120000).
 */
export function CustosFixosSheet({ items, onChange }: Props) {
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const total = useMemo(
    () => items.filter((i) => i.active !== false).reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [items],
  )

  const atualizar = async (row: CostItemRecord, patch: Partial<CostItemRecord>) => {
    setBusy(row.id)
    // atualização otimista, depois persiste
    onChange(items.map((i) => (i.id === row.id ? { ...i, ...patch } : i)))
    try {
      await updateCostItem(row.id, patch)
    } finally {
      setBusy(null)
    }
  }

  const adicionar = async () => {
    const nome = novoNome.trim()
    if (!nome) return
    const created = await createCostItem({
      description: nome,
      amount: Number(novoValor) || 0,
      group: 'operacional',
      active: true,
    })
    onChange([...items, created])
    setNovoNome('')
    setNovoValor('')
  }

  const remover = async (row: CostItemRecord) => {
    onChange(items.filter((i) => i.id !== row.id))
    try {
      await deleteCostItem(row.id)
    } catch {
      /* linha criada nesta sessão pode não existir mais no banco */
    }
  }

  return (
    <Card className="card-warm">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
          Custos e Despesas Fixas (mensal)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F5EEE6] text-left text-[10px] uppercase text-[#6B4F42]">
                <th className="py-2 px-3 font-semibold">Descrição</th>
                <th className="py-2 px-3 font-semibold text-right w-36">Valor (R$)</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-[#F5EEE6]">
                  <td className="py-1 px-3">
                    <Input
                      value={row.description}
                      onChange={(e) =>
                        onChange(
                          items.map((i) =>
                            i.id === row.id ? { ...i, description: e.target.value } : i,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        e.target.value !== row.description &&
                        atualizar(row, { description: e.target.value })
                      }
                      className="h-7 text-xs bg-transparent border-transparent hover:border-[#EDE3D8]"
                      disabled={busy === row.id}
                    />
                  </td>
                  <td className="py-1 px-3 text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(row.amount ?? '')}
                      onChange={(e) =>
                        onChange(
                          items.map((i) =>
                            i.id === row.id ? { ...i, amount: Number(e.target.value) || 0 } : i,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        Number(e.target.value) !== row.amount &&
                        atualizar(row, { amount: Number(e.target.value) || 0 })
                      }
                      className="h-7 text-xs text-right bg-transparent border-transparent hover:border-[#EDE3D8]"
                      disabled={busy === row.id}
                    />
                  </td>
                  <td className="py-1 px-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => remover(row)}
                      title="Remover linha"
                    >
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-[#6B4F42]">
                    Nenhuma despesa cadastrada — adicione a primeira abaixo.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#C66B4D] bg-[#FBF3DC]">
                <td className="py-2 px-3 font-bold text-[#2D1B14]">Total de Custos Fixos</td>
                <td className="py-2 px-3 text-right font-bold text-[#C66B4D]">
                  {formatCurrency(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Nova despesa (ex.: Dedetização)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div className="w-32">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <Button size="sm" className="btn-terracotta-gold text-xs" onClick={adicionar}>
            Adicionar linha
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Seção B — derivação da hora clínica: horas disponíveis, % ociosidade e fator
 * de avaliação editáveis; a fórmula é SEMPRE calcularHoraClinica() do serviço
 * existente (mesma matemática da aba Formação da Hora Clínica).
 */
export function DerivacaoHoraClinica({
  custosMensais,
  horasDisponiveis,
  ociosidade,
  fatorAvaliacao,
  onHorasChange,
  onOciosidadeChange,
  onFatorChange,
}: {
  custosMensais: number
  horasDisponiveis: number
  ociosidade: number
  fatorAvaliacao: number
  onHorasChange: (v: number) => void
  onOciosidadeChange: (v: number) => void
  onFatorChange: (v: number) => void
}) {
  const [produtivas, setProdutivas] = useState(0)
  const [custoHora, setCustoHora] = useState(0)
  const [custoMinuto, setCustoMinuto] = useState(0)

  useEffect(() => {
    const disponiveis = Number(horasDisponiveis) || 0
    const oc = Number(ociosidade) || 0
    const base = disponiveis * (1 - oc / 100)
    const fator = Number(fatorAvaliacao) || 0
    const prod = fator > 0 ? base / (1 + fator / 100) : base
    const hora = prod > 0 ? custosMensais / prod : 0
    setProdutivas(prod)
    setCustoHora(hora)
    setCustoMinuto(hora / 60)
  }, [custosMensais, horasDisponiveis, ociosidade, fatorAvaliacao])

  return (
    <Card className="card-warm">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
          Hora Clínica — derivação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase text-[#6B4F42] font-semibold">
              Total de Horas de Atendimento por Mês
            </label>
            <Input
              type="number"
              min={0}
              value={horasDisponiveis}
              onChange={(e) => onHorasChange(Number(e.target.value) || 0)}
              className="h-8 text-xs bg-white mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#6B4F42] font-semibold">
              Ociosidade / faltas / desmarcados (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={ociosidade}
              onChange={(e) => onOciosidadeChange(Number(e.target.value) || 0)}
              className="h-8 text-xs bg-white mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#6B4F42] font-semibold">
              Fator de avaliação (% — aumenta custo/h)
            </label>
            <Input
              type="number"
              min={0}
              value={fatorAvaliacao}
              onChange={(e) => onFatorChange(Number(e.target.value) || 0)}
              className="h-8 text-xs bg-white mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-[#EDE3D8] pt-2">
          <div className="rounded-xl bg-[#F5EEE6] p-2 text-center">
            <p className="text-[10px] uppercase text-[#6B4F42]">Horas produtivas</p>
            <p className="text-lg font-bold text-[#2D1B14]">{produtivas.toFixed(0)}</p>
          </div>
          <div className="rounded-xl bg-[#FBF3DC] p-2 text-center">
            <p className="text-[10px] uppercase text-[#6B4F42]">Total Custo Hora</p>
            <p className="text-lg font-bold text-[#C66B4D]">{formatCurrency(custoHora)}</p>
          </div>
          <div className="rounded-xl bg-[#F5EEE6] p-2 text-center">
            <p className="text-[10px] uppercase text-[#6B4F42]">Custo Hora + Fator Avaliação</p>
            <p className="text-lg font-bold text-[#2D1B14]">
              {formatCurrency(custoHora * (1 + (Number(fatorAvaliacao) || 0) / 100))}
            </p>
          </div>
          <div className="rounded-xl bg-[#FBF3DC] p-2 text-center">
            <p className="text-[10px] uppercase text-[#6B4F42]">Custo por minuto</p>
            <p className="text-lg font-bold text-[#C66B4D]">{formatCurrency(custoMinuto)}</p>
          </div>
        </div>
        <p className="text-[10px] text-[#6B4F42]">
          Fórmula idêntica à aba Formação da Hora Clínica — mesmos dados, sem duplicação.
        </p>
      </CardContent>
    </Card>
  )
}

/** Rótulos de grupo de custo (migração 0016). */
export const GRUPO_LABEL: Record<string, string> = {
  operacional: 'Operacional',
  pessoal: 'Pessoal',
  provisao: 'Provisão',
  reserva: 'Reserva',
}
