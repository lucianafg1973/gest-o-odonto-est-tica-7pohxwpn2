import { FinancialTransactionRecord, updateTransaction } from '@/services/financial'
import { createMessageRecord } from '@/services/messages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  MessageCircle,
  BellRing,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Props {
  transactions: FinancialTransactionRecord[]
  patientName: string
  patientPhone?: string
  onRefresh: () => void
}

const statusLabels: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
}

const methodLabels: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Dias restantes até a data da transação (referência: hoje). */
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function openWhatsApp(phone: string, text: string) {
  const digits = (phone || '').replace(/\D/g, '')
  window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(text)}`, '_blank')
}

export function FinanceiroTab({ transactions, patientName, patientPhone, onRefresh }: Props) {
  const receitas = transactions
    .filter((t) => t.transaction_type === 'receita')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const despesas = transactions
    .filter((t) => t.transaction_type === 'despesa')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const saldo = receitas - despesas
  const pendentes = transactions.filter((t) => t.status === 'pendente')
  const totalPendente = pendentes.reduce((s, t) => s + (t.amount || 0), 0)

  const handleMarkPaid = async (t: FinancialTransactionRecord) => {
    try {
      await updateTransaction(t.id, { status: 'pago' })
      toast({ title: 'Parcela marcada como paga!' })
      onRefresh()
    } catch {
      toast({ title: 'Erro ao atualizar o status', variant: 'destructive' })
    }
  }

  const handleChargeWhatsApp = async (t: FinancialTransactionRecord) => {
    const text = `Olá, ${patientName}! Tudo bem? Passando para lembrar da parcela de ${brl(
      t.amount || 0,
    )} referente ao seu tratamento na Clínica Odonto Estética. Qualquer dúvida, estamos à disposição!`
    openWhatsApp(patientPhone || '', text)
    try {
      await createMessageRecord({
        patient: t.patient,
        message_type: 'informativo',
        content: text,
        sent: true,
        sent_date: new Date().toISOString(),
      })
      toast({ title: 'Cobrança registrada e WhatsApp aberto!' })
    } catch {
      toast({
        title: 'WhatsApp aberto, mas não foi possível registrar a mensagem',
        variant: 'destructive',
      })
    }
  }

  const handleReminderWhatsApp = async (t: FinancialTransactionRecord) => {
    const venc = new Date(t.transaction_date).toLocaleDateString('pt-BR')
    const text = `Olá, ${patientName}! Lembrete amigável: o boleto de ${brl(
      t.amount || 0,
    )} com vencimento em ${venc} vence em breve. A Clínica Odonto Estética agradece a atenção!`
    openWhatsApp(patientPhone || '', text)
    try {
      await createMessageRecord({
        patient: t.patient,
        message_type: 'lembrete_consulta',
        content: text,
        sent: true,
        sent_date: new Date().toISOString(),
      })
      toast({ title: 'Lembrete registrado e WhatsApp aberto!' })
    } catch {
      toast({
        title: 'WhatsApp aberto, mas não foi possível registrar a mensagem',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <Card className="card-warm p-4 border-t-4 border-t-[#8B6914]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#8B6914]" /> Pendente
          </p>
          <p className="text-xl font-bold text-[#8B6914] mt-1">{brl(totalPendente)}</p>
        </Card>
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-3">
          <CardTitle className="font-serif-title text-base text-[#2D1B14]">
            Transações e Parcelas do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-[#6B4F42] py-6 text-center">
              Nenhum lançamento financeiro vinculado a este paciente.
            </p>
          ) : (
            transactions.map((t) => {
              const dias = daysUntil(t.transaction_date)
              const isBoletoPendente = t.payment_method === 'boleto' && t.status === 'pendente'
              return (
                <div
                  key={t.id}
                  className="bg-[#FAF6F0] p-3 rounded-xl border border-[#EDE3D8] space-y-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2D1B14] truncate">
                        {t.description}
                      </p>
                      <p className="text-[11px] text-[#6B4F42]">
                        {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
                        {t.payment_method
                          ? ` · ${methodLabels[t.payment_method] || t.payment_method}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={
                          t.status === 'pago'
                            ? 'bg-[#2E7D32] text-white text-[10px]'
                            : t.status === 'pendente'
                              ? 'bg-amber-100 text-amber-800 text-[10px]'
                              : 'bg-[#EDE3D8] text-[#6B4F42] text-[10px]'
                        }
                      >
                        {t.status === 'pago' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {statusLabels[t.status || ''] || t.status || '—'}
                      </Badge>
                      <span
                        className={`text-sm font-bold ${
                          t.transaction_type === 'receita' ? 'text-[#2E7D32]' : 'text-[#C66B4D]'
                        }`}
                      >
                        {t.transaction_type === 'receita' ? '+' : '-'} {brl(t.amount || 0)}
                      </span>
                    </div>
                  </div>
                  {dias != null && t.status === 'pendente' && dias < 0 && (
                    <p className="text-[10px] font-semibold text-red-600">
                      Vencida há {Math.abs(dias)} dia(s)
                    </p>
                  )}
                  {t.transaction_type === 'receita' && t.status !== 'cancelado' && (
                    <div className="flex flex-wrap gap-2">
                      {t.status !== 'pago' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] text-[#2E7D32] border-[#2E7D32]/40 hover:bg-green-50"
                          onClick={() => handleMarkPaid(t)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como paga
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] text-[#25D366] border-[#25D366]/50 hover:bg-green-50"
                        onClick={() => handleChargeWhatsApp(t)}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" /> Cobrança WhatsApp
                      </Button>
                      {isBoletoPendente && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] text-[#8B6914] border-[#8B6914]/40 hover:bg-amber-50"
                          onClick={() => handleReminderWhatsApp(t)}
                        >
                          <BellRing className="w-3 h-3 mr-1" /> Lembrete antecipado (boleto)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
