import { useMemo, useState } from 'react'
import { ProcedureRecord } from '@/services/procedures'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/price-calculation'
import { ProcPricingConfig } from '@/lib/pricing-engine'
import { Megaphone, AlertTriangle } from 'lucide-react'

/**
 * SIMULADOR DE CAMPANHAS — seleciona procedimentos, define período e desconto;
 * simula margem com descontos e custos adicionais. Não altera preços oficiais
 * sem aprovação explícita.
 */
interface Props {
  procedures: ProcedureRecord[]
  horaClinica: number
  cfgOverride?: Partial<ProcPricingConfig>
  onClose: () => void
  onPublish?: (
    procedimentos: { id: string; precoFinal: number }[],
    periodo: { inicio: string; fim: string; nome: string },
  ) => void
}

export default function CampaignSimulator({
  procedures,
  horaClinica,
  cfgOverride,
  onClose,
  onPublish,
}: Props) {
  const [nome, setNome] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [desconto, setDesconto] = useState('10')
  const [custoAdicional, setCustoAdicional] = useState('0')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [publicada, setPublicada] = useState(false)

  const ativos = procedures.filter((p) => p.active !== false && (p.price ?? 0) > 0)

  const linhas = useMemo(() => {
    return ativos
      .filter((p) => selecionados.has(p.id))
      .map((p) => {
        const preco = Number(p.price) || 0
        const custoMateriais = Number(p.material_cost) || 0
        const custoLab = Number(p.lab_price) || 0
        const remunExec = Number(p.executor_cost) || 0
        const minutos = Number(p.duration_minutes) || 0
        const custoHora = horaClinica
        const custoOperacional = (custoHora / 60) * minutos
        const outros = Number(custoAdicional.replace(',', '.')) || 0
        const descPct = Number(desconto.replace(',', '.')) || 0
        const precoFinal = preco * (1 - descPct / 100)
        const custoTotal = custoMateriais + custoLab + remunExec + custoOperacional + outros
        const lucro = precoFinal - custoTotal
        const margem = precoFinal > 0 ? (lucro / precoFinal) * 100 : 0
        return { proc: p, preco, precoFinal, custoTotal, lucro, margem, lucrativa: margem > 0 }
      })
  }, [ativos, selecionados, desconto, custoAdicional, horaClinica])

  const resumo = useMemo(() => {
    const receita = linhas.reduce((s, l) => s + l.precoFinal, 0)
    const custo = linhas.reduce((s, l) => s + l.custoTotal, 0)
    const lucro = receita - custo
    const abaixo = linhas.filter((l) => l.margem < 10).length
    return { receita, custo, lucro, margem: receita > 0 ? (lucro / receita) * 100 : 0, abaixo }
  }, [linhas])

  const toggle = (id: string) => {
    const next = new Set(selecionados)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelecionados(next)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C66B4D]" /> Simulador de campanhas
          </DialogTitle>
          <p className="text-[11px] text-[#6B4F42]">
            Selecione procedimentos, período e desconto — veja a margem projetada. Preços oficiais
            só mudam com aprovação explícita.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="col-span-2">
            <Label className="text-[11px] font-semibold">Nome da campanha</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Clareamento de verão"
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Início</Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Fim</Label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Desconto (%)</Label>
            <Input
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Custo adicional (R$)</Label>
            <Input
              value={custoAdicional}
              onChange={(e) => setCustoAdicional(e.target.value)}
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
        </div>

        <div className="border border-[#EDE3D8] rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#FAF6F0]">
                <tr className="text-left text-[#6B4F42]">
                  <th className="p-2 w-8"></th>
                  <th className="p-2">Procedimento</th>
                  <th className="p-2 text-right">Preço oficial</th>
                  <th className="p-2 text-right">Preço final</th>
                  <th className="p-2 text-right">Custo total</th>
                  <th className="p-2 text-right">Lucro</th>
                  <th className="p-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {ativos.map((p) => {
                  const linha = linhas.find((l) => l.proc.id === p.id)
                  const marcado = selecionados.has(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-[#F5EEE6] cursor-pointer ${marcado ? 'bg-[#C66B4D]/5' : 'hover:bg-[#FAF6F0]'}`}
                      onClick={() => toggle(p.id)}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => {}}
                          className="accent-[#C66B4D]"
                        />
                      </td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-right">{formatCurrency(Number(p.price) || 0)}</td>
                      <td className="p-2 text-right">
                        {linha ? formatCurrency(linha.precoFinal) : '—'}
                      </td>
                      <td className="p-2 text-right">
                        {linha ? formatCurrency(linha.custoTotal) : '—'}
                      </td>
                      <td className="p-2 text-right">
                        {linha ? formatCurrency(linha.lucro) : '—'}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {linha ? (
                          <span className={linha.margem < 10 ? 'text-red-600' : 'text-[#6B8E23]'}>
                            {linha.margem.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selecionados.size > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF6F0] rounded-lg p-3 border border-[#EDE3D8] text-xs">
            <div>
              <p className="text-[10px] uppercase text-[#6B4F42]">Receita projetada</p>
              <p className="font-bold text-[#2D1B14]">{formatCurrency(resumo.receita)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#6B4F42]">Custo projetado</p>
              <p className="font-bold text-[#2D1B14]">{formatCurrency(resumo.custo)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#6B4F42]">Lucro projetado</p>
              <p className={`font-bold ${resumo.lucro > 0 ? 'text-[#6B8E23]' : 'text-red-600'}`}>
                {formatCurrency(resumo.lucro)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#6B4F42]">Margem média</p>
              <p className="font-bold text-[#2D1B14]">{resumo.margem.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {resumo.abaixo > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-[11px] text-red-700">
              {resumo.abaixo} procedimento(s) com margem abaixo de 10% nesta campanha — revise antes
              de publicar.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="text-xs" onClick={onClose}>
            Fechar (não altera preços)
          </Button>
          <Button
            className="btn-terracotta-gold text-xs"
            disabled={selecionados.size === 0 || !nome || publicada}
            onClick={() => {
              onPublish?.(
                linhas.map((l) => ({ id: l.proc.id, precoFinal: l.precoFinal })),
                { inicio, fim, nome },
              )
              setPublicada(true)
            }}
          >
            {publicada ? 'Campanha registrada ✓' : 'Publicar campanha (após aprovação)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
