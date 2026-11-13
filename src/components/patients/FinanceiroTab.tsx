import { FinancialTransactionRecord } from '@/services/financial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

interface Props {
  transactions: FinancialTransactionRecord[]
}

const statusLabels: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
}

const methodLabels: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
}

export function FinanceiroTab({ transactions }: Props) {
  const receitas = transactions
    .filter((t) => t.transaction_type === 'receita')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const despesas = transactions
    .filter((t) => t.transaction_type === 'despesa')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const saldo = receitas - despesas

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="card-warm p-4 border-t-4 border-t-[#2E7D32]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42] flex items-center gap-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-[#2E7D32]" /> Receitas
          </p>
          <p className="text-xl font-bold text-[#2E7D32] mt-1">{brl(receitas)}</p>
        </Card>
        <Card className="card-warm p-4 border-t-4 border-t-[#C66B4D]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42] flex items-center gap-1">
            <ArrowDownCircle className="w-3.5 h-3.5 text-[#C66B4D]" /> Despesas
          </p>
          <p className="text-xl font-bold text-[#C66B4D] mt-1">{brl(despesas)}</p>
        </Card>
        <Card className="card-warm p-4 border-t-4 border-t-[#D4AF37]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42] flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#8B6914]" /> Saldo
          </p>
          <p
            className={`text-xl font-bold mt-1 ${saldo >= 0 ? 'text-[#2E7D32]' : 'text-[#C66B4D]'}`}
          >
            {brl(saldo)}
          </p>
        </Card>
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-3">
          <CardTitle className="font-serif-title text-base text-[#2D1B14]">
            Lançamentos do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-[#6B4F42] py-6 text-center">
              Nenhum lançamento financeiro vinculado a este paciente.
            </p>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center bg-[#FAF6F0] p-3 rounded-xl border border-[#EDE3D8]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2D1B14] truncate">{t.description}</p>
                  <p className="text-[11px] text-[#6B4F42]">
                    {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
                    {t.payment_method
                      ? ` · ${methodLabels[t.payment_method] || t.payment_method}`
                      : ''}
                    {t.status ? ` · ${statusLabels[t.status] || t.status}` : ''}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold shrink-0 ml-2 ${
                    t.transaction_type === 'receita' ? 'text-[#2E7D32]' : 'text-[#C66B4D]'
                  }`}
                >
                  {t.transaction_type === 'receita' ? '+' : '-'} {brl(t.amount || 0)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
