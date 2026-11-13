import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import {
  createReceipt,
  getReceipts,
  PaymentReceiptRecord,
  printConsolidatedReceipt,
  printIndividualReceipt,
} from '@/services/payment_receipts'
import { FinancialTransactionRecord } from '@/services/financial'
import { PatientRecord } from '@/services/patients'
import { formatCurrency } from '@/lib/price-calculation'
import { Receipt, FileSpreadsheet } from 'lucide-react'

interface Props {
  transactions: FinancialTransactionRecord[]
  patient: PatientRecord
  /** Total contratado no(s) planejamento(s) — base do bloqueio de quitação. */
  totalContratado: number
  onRefresh: () => void
}

export function ReceiptsPanel({ transactions, patient, totalContratado, onRefresh }: Props) {
  const [receipts, setReceipts] = useState<PaymentReceiptRecord[]>([])
  const [loading, setLoading] = useState(false)

  const receitasPagas = transactions.filter(
    (t) =>
      t.status === 'pago' &&
      t.transaction_type === 'receita' &&
      // Lançamentos internos de taxa de cartão NUNCA são "pagamento do paciente".
      t.payment_method !== 'cartao_taxa',
  )

  const reloadReceipts = useCallback(
    () =>
      getReceipts(patient.id)
        .then(setReceipts)
        .catch(() => {}),
    [patient.id],
  )

  useEffect(() => {
    reloadReceipts()
  }, [reloadReceipts, transactions.length])

  const pagosSemRecibo = receitasPagas.filter(
    (t) => !receipts.some((r) => r.receipt_type === 'individual' && r.transaction === t.id),
  )
  const totalSemRecibo = pagosSemRecibo.reduce((s, t) => s + (t.amount || 0), 0)
  const totalPagoBruto = receitasPagas.reduce((s, t) => s + (t.amount || 0), 0)
  const saldoPendente = totalContratado - totalPagoBruto

  const handleIndividual = async (t: FinancialTransactionRecord) => {
    try {
      const ok = printIndividualReceipt(t, patient)
      if (!ok) {
        toast({
          title: 'Pop-up bloqueado pelo navegador',
          description: 'Permita pop-ups para este site e tente novamente.',
          variant: 'destructive',
        })
        return
      }
      await createReceipt({
        patient: patient.id,
        receipt_type: 'individual',
        transaction: t.id,
        amount: t.amount || 0,
        title: `Recibo — ${t.description || 'Pagamento'}`,
        receipt_date: new Date().toISOString(),
      })
      toast({ title: 'Recibo emitido!' })
      reloadReceipts()
      onRefresh()
    } catch {
      toast({ title: 'Erro ao registrar o recibo', variant: 'destructive' })
    }
  }

  const handleConsolidado = async () => {
    if (pagosSemRecibo.length === 0) {
      toast({ title: 'Todos os pagamentos confirmados já têm recibo individual.' })
      return
    }
    try {
      const ok = printConsolidatedReceipt(pagosSemRecibo, totalSemRecibo, patient)
      if (!ok) {
        toast({
          title: 'Pop-up bloqueado pelo navegador',
          description: 'Permita pop-ups para este site e tente novamente.',
          variant: 'destructive',
        })
        return
      }
      // Persiste o consolidado + espelhos individuais (garante que ninguém receba recibo 2x)
      await createReceipt({
        patient: patient.id,
        receipt_type: 'consolidado',
        amount: totalSemRecibo,
        title: `Recibo consolidado — ${pagosSemRecibo.length} pagamento(s)`,
        receipt_date: new Date().toISOString(),
      })
      await Promise.all(
        pagosSemRecibo.map((t) =>
          createReceipt({
            patient: patient.id,
            receipt_type: 'individual',
            transaction: t.id,
            amount: t.amount || 0,
            title: `Recibo (consolidado) — ${t.description || 'Pagamento'}`,
            receipt_date: new Date().toISOString(),
          }),
        ),
      )
      toast({ title: `Recibo consolidado de ${pagosSemRecibo.length} pagamento(s) emitido!` })
      reloadReceipts()
      onRefresh()
    } catch {
      toast({ title: 'Erro ao emitir o recibo consolidado', variant: 'destructive' })
    }
  }

  const handleQuitacao = () => {
    if (saldoPendente > 0.009) {
      toast({
        title: 'Recibo de quitação total bloqueado',
        description: `Ainda há ${formatCurrency(saldoPendente)} em aberto. Emita a quitação apenas após o último pagamento confirmado.`,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Quitação',
      description:
        'Não há mais saldo pendente — use o recibo consolidado, que já cobre todos os pagamentos confirmados.',
    })
  }

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#C66B4D]" /> Recibos de Pagamento
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] text-[#C66B4D] border-[#C66B4D]/40 hover:bg-[#FBF3DC]"
            onClick={handleConsolidado}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Recibo consolidado (
            {pagosSemRecibo.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] text-[#6B4F42] border-[#6B4F42]/40 hover:bg-[#FAF6F0]"
            onClick={handleQuitacao}
          >
            Recibo de quitação total
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        <p className="text-[11px] text-[#6B4F42]">
          Pagamentos confirmados: <strong>{formatCurrency(totalPagoBruto)}</strong> · Sem recibo:{' '}
          <strong>{formatCurrency(totalSemRecibo)}</strong> · Saldo pendente:{' '}
          <strong>{formatCurrency(Math.max(0, saldoPendente))}</strong>
        </p>
        {receitasPagas.length === 0 && (
          <p className="text-xs text-[#6B4F42] py-4 text-center">
            Nenhum pagamento confirmado ainda — marque uma parcela como paga para emitir recibos.
          </p>
        )}
        {receitasPagas.map((t) => {
          const tem = receipts.some(
            (r) => r.receipt_type === 'individual' && r.transaction === t.id,
          )
          return (
            <div
              key={t.id}
              className="bg-[#FAF6F0] p-3 rounded-xl border border-[#EDE3D8] flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2D1B14] truncate">
                  {t.description || 'Pagamento'}
                </p>
                <p className="text-[10px] text-[#6B4F42]">
                  {new Date(t.transaction_date).toLocaleDateString('pt-BR')} ·{' '}
                  {formatCurrency(t.amount || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {tem ? (
                  <Badge className="bg-[#2E8B57] text-white text-[10px]">Recibo emitido</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 text-[10px]">Sem recibo</Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] text-[#C66B4D] border-[#C66B4D]/40 hover:bg-[#FBF3DC]"
                  onClick={() => handleIndividual(t)}
                >
                  <Receipt className="w-3 h-3 mr-1" /> {tem ? 'Reemitir' : 'Gerar recibo'}
                </Button>
              </div>
            </div>
          )
        })}
        <p className="text-[10px] text-[#6B4F42] pt-2">
          O recibo mostra o valor <strong>bruto</strong> pago pelo paciente — taxas de operadora
          (cartão) são despesa interna e não aparecem aqui.
        </p>
      </CardContent>
    </Card>
  )
}
