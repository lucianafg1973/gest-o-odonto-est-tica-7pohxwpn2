import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FileSignature, Lock, Printer, AlertTriangle } from 'lucide-react'
import {
  PlanDocSnapshot,
  totalDocCents,
  parcelasExpandidas,
  numeroPlanejamento,
  planoKindsLabel,
} from '@/lib/plan-doc'
import { formatCurrency } from '@/lib/price-calculation'
import { ativosResumo } from '@/lib/planning-approval'

interface ApprovePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: PlanDocSnapshot
  /** Nome do usuário autenticado (registro de auditoria). */
  usuarioNome: string
  confirming: boolean
  onConfirm: () => void
  /** Após aprovar: abre a impressão do planejamento aprovado. */
  onPrintAfter: () => void
  /** Verdadeiro quando o plano da prévia já está aprovado. */
  aprovado: boolean
}

/**
 * Diálogo de confirmação da aprovação do planejamento: mostra o valor final,
 * os procedimentos e as condições de pagamento EXATAMENTE como estão salvos
 * no planejamento (snapshot), e registra data/usuário/versão ao confirmar.
 * Aprovar NÃO significa que o paciente assinou — a assinatura é registrada à
 * parte (aba Documentos → "Anexar documento assinado" / status de assinatura).
 */
export function ApprovePlanDialog({
  open,
  onOpenChange,
  snapshot,
  usuarioNome,
  confirming,
  onConfirm,
  onPrintAfter,
  aprovado,
}: ApprovePlanDialogProps) {
  const [jaAprovado, setJaAprovado] = useState(false)

  const total = totalDocCents(snapshot)
  const parcelas = useMemo(() => parcelasExpandidas(snapshot.paymentPlan), [snapshot.paymentPlan])
  const somaParcelasC = parcelas.reduce((s, p) => s + p.amountCents, 0)
  const diferenca = somaParcelasC - total
  const list = ativosResumo(snapshot.treatments)

  const fechar = () => onOpenChange(false)

  if (aprovado || jaAprovado) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#2E8B57]" /> Planejamento aprovado
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              {numeroPlanejamento(snapshot.planId)} — {planoKindsLabel(snapshot.kind)}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[#2E8B57]/30 bg-[#E8F5EE] p-4 text-xs text-[#2D1B14] space-y-1">
            <p className="flex items-center gap-2 font-semibold text-[#2E8B57]">
              <CheckCircle2 className="w-4 h-4" /> Aprovação registrada
            </p>
            <p>
              Data/hora, responsável e versão ficam gravados no planejamento. As edições estão
              bloqueadas e as parcelas já foram lançadas no Financeiro.
            </p>
            <p className="text-[#6B4F42]">
              A assinatura do paciente é um passo separado: gere o documento de assinatura e
              registre o aceite na aba “Documentos do Planejamento”.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={fechar}>
              Fechar
            </Button>
            <Button
              size="sm"
              className="btn-terracotta-gold text-xs font-semibold"
              onClick={() => {
                fechar()
                onPrintAfter()
              }}
            >
              <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir planejamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[#C66B4D]" /> Aprovar planejamento
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Confirme o valor, os procedimentos e as condições de pagamento antes de registrar a
            aprovação. Antes de aprovar, o plano permanece salvo como rascunho editável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="rounded-xl border border-[#EDE3D8] bg-[#FFFDF9] p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42]">
              Procedimentos ({list.length})
            </p>
            <div className="max-h-36 overflow-y-auto divide-y divide-[#F1E9DF]">
              {list.map((t, i) => (
                <p key={i} className="py-1 text-[#2D1B14] flex justify-between gap-3">
                  <span>
                    {t.nome}
                    {t.local !== '—' ? ` — ${t.local}` : ''}
                    {t.qtd > 1 ? ` — ${t.qtd}x` : ''}
                    {t.incluidoNoGlobal ? ' (incluído no protocolo global)' : ''}
                  </span>
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#D4AF37]/50 bg-[#FBF3DC] p-3 space-y-1">
            {snapshot.desconto ? (
              <p className="flex justify-between text-[#2D1B14]">
                <span>Desconto</span>
                <span>- {formatCurrency(snapshot.desconto)}</span>
              </p>
            ) : null}
            <p className="flex justify-between items-center text-sm font-bold text-[#7A3B25]">
              <span>Investimento total</span>
              <span>{formatCurrency(total / 100)}</span>
            </p>
          </div>

          {parcelas.length > 0 ? (
            <div className="rounded-xl border border-[#EDE3D8] bg-white p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B4F42]">
                Condições de pagamento ({parcelas.length})
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-[#F1E9DF]">
                {parcelas.map((p, i) => (
                  <p key={i} className="py-1 flex justify-between text-[#2D1B14]">
                    <span>
                      {p.label} — {p.method}
                    </span>
                    <span>{formatCurrency(p.amountCents / 100)}</span>
                  </p>
                ))}
              </div>
              {Math.abs(diferenca) > 1 && (
                <p className="flex items-center gap-1 text-[10px] text-[#8B6914] pt-1">
                  <AlertTriangle className="w-3 h-3" /> Soma das parcelas (
                  {formatCurrency(somaParcelasC / 100)}) difere do total (
                  {formatCurrency(total / 100)}).
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#8B6914] bg-[#FBF3DC] border border-[#D4AF37] rounded-lg px-3 py-2">
              Nenhuma condição de pagamento definida — as parcelas não serão lançadas no Financeiro.
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-[#6B4F42]">
            <Badge className="bg-[#FBF3DC] text-[#8B6914] border border-[#D4AF37] text-[10px]">
              Versão {snapshot.versao || 1}
            </Badge>
            <span>
              Será registrada a aprovação em nome de <strong>{usuarioNome}</strong>, com data e hora
              atuais.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#2E8B57] hover:bg-[#257047] text-white text-xs font-semibold"
            disabled={confirming}
            onClick={() => {
              setJaAprovado(true)
              onConfirm()
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {confirming ? 'Registrando...' : 'Confirmar aprovação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
