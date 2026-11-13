import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Clock, FileText, History, Lock, Plus, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/price-calculation'
import { PlanKind, VirtualPlanRecord } from '@/services/virtual_plans'

const KIND_LABEL: Record<PlanKind, string> = {
  hof: 'Planejamento HOF',
  odontologico: 'Planejamento Odontológico',
}

/** Converte data ISO (yyyy-mm-dd) ou timestamp para dd/mm/aaaa. */
export const formatDateBR = (value?: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

interface Props {
  plans: VirtualPlanRecord[]
  kind: PlanKind
  activePlanId?: string | null
  onOpenPlan: (plan: VirtualPlanRecord) => void
  onNewPlan: () => void
  creating?: boolean
}

/**
 * Barra da aba de planejamento: botão "Novo planejamento" + lista dos
 * planejamentos já existentes do paciente (do mais recente para o mais
 * antigo), com status (rascunho/aprovado) e total. Clicar num planejamento
 * abre/carrega ele no editor.
 */
export function PlanListBar({
  plans,
  kind,
  activePlanId,
  onOpenPlan,
  onNewPlan,
  creating = false,
}: Props) {
  const doTipo = plans.filter((p) => (p.kind || 'hof') === kind)

  return (
    <Card className="card-warm p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#C66B4D]" />
          <h3 className="font-serif-title text-sm font-bold text-[#2D1B14]">
            Planejamentos do paciente
          </h3>
          <Badge className="bg-[#FBF3DC] text-[#8B6914] text-[10px] border border-[#D4AF37]">
            {doTipo.length} {kind === 'hof' ? 'HOF' : 'odontológico'}(s)
          </Badge>
        </div>
        <Button
          size="sm"
          type="button"
          className="btn-terracotta-gold text-xs font-semibold"
          onClick={onNewPlan}
          disabled={creating}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo planejamento
        </Button>
      </div>

      {doTipo.length === 0 ? (
        <p className="text-[11px] text-[#6B4F42]">
          Nenhum planejamento salvo ainda — clique em “Novo planejamento” para começar.
        </p>
      ) : (
        <div className="space-y-1.5">
          {doTipo.map((p) => {
            const total = (p.treatments || []).reduce((s, t) => s + (t.price || 0), 0)
            const aprovado = p.approval_status === 'aprovado'
            const ativo = p.id === activePlanId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPlan(p)}
                className={`w-full text-left flex flex-wrap items-center gap-2 rounded-xl border p-2 transition-colors ${
                  ativo
                    ? 'border-[#C66B4D] bg-[#FBF3DC]'
                    : 'border-[#EDE3D8] bg-white hover:bg-[#FAF6F0]'
                }`}
              >
                <FileText
                  className={`w-3.5 h-3.5 shrink-0 ${ativo ? 'text-[#C66B4D]' : 'text-[#6B4F42]'}`}
                />
                <span className="text-xs font-semibold text-[#2D1B14] flex-1 min-w-0 truncate">
                  {p.title || KIND_LABEL[p.kind || 'hof']}
                </span>
                <Badge
                  className={`text-[9px] ${
                    aprovado ? 'bg-[#2E8B57] text-white' : 'bg-[#FBF3DC] text-[#8B6914]'
                  }`}
                >
                  {aprovado ? (
                    <>
                      <Lock className="w-2.5 h-2.5 mr-0.5" /> Aprovado
                    </>
                  ) : (
                    'Rascunho'
                  )}
                </Badge>
                {aprovado && (
                  <Printer
                    className="w-3.5 h-3.5 text-[#6B4F42]"
                    title="Aprovado — pode imprimir"
                  />
                )}
                <span className="flex items-center gap-1 text-[10px] text-[#6B4F42]">
                  <Clock className="w-3 h-3" /> {formatDateBR(p.plan_date || p.created)}
                </span>
                <span className="text-[11px] font-bold text-[#C66B4D]">
                  {formatCurrency(total)}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="text-[10px] text-[#6B4F42]">
        Do mais recente para o mais antigo. Ao abrir um planejamento, o restante da ficha
        (prontuário, fotografias, financeiro) continua acessível nas abas acima — este é o histórico
        completo do paciente.
      </p>
    </Card>
  )
}
