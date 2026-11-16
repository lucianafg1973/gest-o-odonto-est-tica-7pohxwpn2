import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/price-calculation'
import { FinancialTransactionRecord, getFinancialTransactions } from '@/services/financial'
import { PatientRecord, getPatients } from '@/services/patients'
import {
  LinhaReceita,
  LinhaDespesa,
  MesLucratividade,
  createDespesa,
  updateDespesa,
  deleteDespesa,
  historicoLucratividade,
  linhasDespesas,
  linhasReceitas,
  totalDespesas,
  totalReceitas,
} from '@/services/caixa'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

/**
 * LIVRO CAIXA — Receitas e Despesas.
 * Receitas: automáticas, dos pagamentos já registrados (status 'pago') — sem
 * cadastro manual duplicado. Despesas: CRUD editável pela usuária. Lucro por
 * mês = receitas recebidas − despesas pagas (não confundir com faturamento).
 */
export default function MovimentosCaixa({ onTxChange }: { onTxChange?: (n: number) => void }) {
  const { toast } = useToast()
  const [txs, setTxs] = useState<FinancialTransactionRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<FinancialTransactionRecord | null>(null)
  const [novaDespesa, setNovaDespesa] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([
        getFinancialTransactions().catch(() => []),
        getPatients().catch(() => []),
      ])
      setTxs(t)
      setPatients(p)
      onTxChange?.(t.length)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const receitas = useMemo<LinhaReceita[]>(() => linhasReceitas(txs, patients), [txs, patients])
  const despesas = useMemo<LinhaDespesa[]>(() => linhasDespesas(txs), [txs])
  const lucro = useMemo<MesLucratividade[]>(
    () => historicoLucratividade(receitas, despesas),
    [receitas, despesas],
  )

  const aoSalvar = async () => {
    setEditando(null)
    setNovaDespesa(false)
    await reload()
    toast({ title: 'Despesa salva!' })
  }

  const excluir = async (id: string) => {
    try {
      await deleteDespesa(id)
      await reload()
      toast({ title: 'Despesa excluída.' })
    } catch {
      toast({ title: 'Erro ao excluir despesa', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* ---------- RECEITAS (livro caixa) ---------- */}
      <Card className="card-warm">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6B8E23]" /> Receitas (pagamentos recebidos)
          </CardTitle>
          <p className="text-[10px] text-[#6B4F42]">
            Alimentada automaticamente pelos pagamentos já registrados (recibos/transações) — sem
            cadastro manual duplicado.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F5EEE6] text-left text-[10px] uppercase text-[#6B4F42]">
                  <th className="py-2 px-3 font-semibold">Cliente</th>
                  <th className="py-2 px-3 font-semibold text-right">Valor (R$)</th>
                  <th className="py-2 px-3 font-semibold">Data</th>
                  <th className="py-2 px-3 font-semibold">Forma de pagamento</th>
                  <th className="py-2 px-3 font-semibold">Parcela</th>
                </tr>
              </thead>
              <tbody>
                {receitas.map((r) => (
                  <tr key={r.id} className="border-t border-[#F5EEE6]">
                    <td className="py-1.5 px-3 text-[11px] font-semibold text-[#2D1B14]">
                      {r.patientName}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-[#6B8E23]">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-1.5 px-3 text-[11px] text-[#6B4F42]">
                      {r.date ? r.date.split('-').reverse().join('/') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-[11px]">{r.paymentMethod}</td>
                    <td className="py-1.5 px-3 text-[11px]">{r.parcela}</td>
                  </tr>
                ))}
                {receitas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-[#6B4F42] italic">
                      Nenhum pagamento recebido ainda — registre pagamentos na ficha do paciente.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#C66B4D] bg-[#FBF3DC]">
                  <td className="py-2 px-3 font-bold text-[#2D1B14]">Total recebido</td>
                  <td className="py-2 px-3 text-right font-bold text-[#6B8E23]">
                    {formatCurrency(totalReceitas(receitas))}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- DESPESAS ---------- */}
      <Card className="card-warm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Despesas discriminadas
            </CardTitle>
            <p className="text-[10px] text-[#6B4F42] mt-1">
              Editável: cadastre, edite ou remova despesas. Juros são considerados quando o
              pagamento sai depois do vencimento.
            </p>
          </div>
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs"
            onClick={() => setNovaDespesa(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova despesa
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F5EEE6] text-left text-[10px] uppercase text-[#6B4F42]">
                  <th className="py-2 px-3 font-semibold">Descrição</th>
                  <th className="py-2 px-3 font-semibold">Nº documento</th>
                  <th className="py-2 px-3 font-semibold">Vencimento</th>
                  <th className="py-2 px-3 font-semibold">Pagamento</th>
                  <th className="py-2 px-3 font-semibold text-right">Valor (R$)</th>
                  <th className="py-2 px-3 font-semibold text-right">Valor pago (c/ juros)</th>
                  <th className="py-2 px-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={d.id} className="border-t border-[#F5EEE6]">
                    <td className="py-1.5 px-3 text-[11px] text-[#2D1B14]">{d.description}</td>
                    <td className="py-1.5 px-3 text-[11px] font-mono text-[#6B4F42]">
                      {d.docNumber || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-[11px] text-[#6B4F42]">
                      {d.dueDate ? d.dueDate.split('-').reverse().join('/') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-[11px] text-[#6B4F42]">
                      {d.payDate ? (
                        d.payDate.split('-').reverse().join('/')
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-[9px]">pendente</Badge>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right text-[11px]">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-red-600">
                      {d.status === 'pago' ? formatCurrency(d.paidAmount) : '—'}
                      {d.pagoComJuros && (
                        <span className="block text-[9px] font-normal text-[#6B4F42]">
                          pago após vencimento
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-[#C66B4D]"
                        title="Editar"
                        onClick={() => setEditando(txs.find((t) => t.id === d.id) || null)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-500"
                        title="Excluir"
                        onClick={() => excluir(d.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {despesas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-3 px-3 text-[#6B4F42] italic">
                      Nenhuma despesa cadastrada — clique em “Nova despesa”.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#C66B4D] bg-[#FBF3DC]">
                  <td className="py-2 px-3 font-bold text-[#2D1B14]" colSpan={5}>
                    Somatório total das despesas
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-red-600">
                    {formatCurrency(totalDespesas(despesas))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- HISTÓRICO DE LUCRATIVIDADE ---------- */}
      <Card className="card-warm">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Histórico de Lucratividade (por mês)
          </CardTitle>
          <p className="text-[10px] text-[#6B4F42]">
            Resultado = receitas recebidas − despesas PAGAS do mês. Faturamento recebido não é
            lucro.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F5EEE6] text-left text-[10px] uppercase text-[#6B4F42]">
                  <th className="py-2 px-3 font-semibold">Mês</th>
                  <th className="py-2 px-3 font-semibold text-right">Receitas recebidas</th>
                  <th className="py-2 px-3 font-semibold text-right">Despesas pagas</th>
                  <th className="py-2 px-3 font-semibold text-right">Resultado (lucro)</th>
                </tr>
              </thead>
              <tbody>
                {lucro.map((m) => (
                  <tr key={m.mes} className="border-t border-[#F5EEE6]">
                    <td className="py-1.5 px-3 text-[11px] font-semibold capitalize">{m.label}</td>
                    <td className="py-1.5 px-3 text-right text-[#6B8E23]">
                      {formatCurrency(m.receitas)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-red-600">
                      {formatCurrency(m.despesas)}
                    </td>
                    <td
                      className={`py-1.5 px-3 text-right font-bold ${m.resultado >= 0 ? 'text-[#6B8E23]' : 'text-red-600'}`}
                    >
                      {formatCurrency(m.resultado)}
                    </td>
                  </tr>
                ))}
                {lucro.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-[#6B4F42] italic">
                      Sem movimentos ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Diálogo de despesa ---------- */}
      {(editando || novaDespesa) && (
        <DespesaDialog
          tx={editando}
          onClose={() => {
            setEditando(null)
            setNovaDespesa(false)
          }}
          onSaved={aoSalvar}
        />
      )}
      {loading && txs.length > 0 && <p className="text-[10px] text-[#6B4F42]">Atualizando…</p>}
    </div>
  )
}

function DespesaDialog({
  tx,
  onClose,
  onSaved,
}: {
  tx: FinancialTransactionRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [description, setDescription] = useState(tx?.description || '')
  const [amount, setAmount] = useState(String(tx?.amount ?? ''))
  const [docNumber, setDocNumber] = useState((tx as any)?.doc_number || '')
  const [dueDate, setDueDate] = useState((tx as any)?.due_date || '')
  const [payDate, setPayDate] = useState(
    tx?.transaction_date ? String(tx.transaction_date).split(' ')[0].slice(0, 10) : '',
  )
  const [status, setStatus] = useState<'pago' | 'pendente' | 'cancelado'>(tx?.status || 'pago')
  const [saving, setSaving] = useState(false)

  const salvar = async () => {
    if (!description.trim() || !(parseFloat(amount) > 0)) {
      toast({ title: 'Informe descrição e valor', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const data: Partial<FinancialTransactionRecord> = {
        transaction_type: 'despesa',
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        status: status as 'pago' | 'pendente',
        transaction_date: payDate || new Date().toISOString().slice(0, 10),
        doc_number: docNumber.trim() || undefined,
        due_date: dueDate || undefined,
      } as any
      if (tx) await updateDespesa(tx.id, data)
      else await createDespesa(data)
      onSaved()
    } catch {
      toast({ title: 'Erro ao salvar despesa', variant: 'destructive' })
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            {tx ? 'Editar despesa' : 'Nova despesa'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
              placeholder="Ex.: Aluguel — janeiro"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Nº do documento</Label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
                placeholder="NF-1234"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Data de pagamento</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-xs bg-[#FFFDF9] border-[#EDE3D8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-[#6B4F42] mt-1">
              Se pago após o vencimento, edite o valor pago com juros em “Valor pago”.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="text-xs" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="btn-terracotta-gold text-xs" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
