import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/price-calculation'
import { Precificacao, ProcPricingConfig, simularDesconto } from '@/lib/pricing-engine'
import { toast } from '@/hooks/use-toast'
import { AlertTriangle, ShieldCheck } from 'lucide-react'

/**
 * SIMULADOR DE DESCONTO — desconto em R$ ou %; exibe preço oficial, desconto,
 * preço final, lucro estimado, margem após desconto e limite mínimo gerencial.
 * Ultrapassou o limite → exige aprovação de usuário habilitado.
 * NÃO altera a tabela oficial.
 */
interface Props {
  precificado: { proc: { name: string; id: string }; p: Precificacao }
  cfg: ProcPricingConfig
  onClose: () => void
}

export default function DiscountSimulator({ precificado, cfg, onClose }: Props) {
  const { p } = precificado
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'valor' | 'percentual'>('percentual')
  const [autorizado, setAutorizado] = useState(false)

  const sim = useMemo(
    () => simularDesconto(p, Number(valor.replace(',', '.')) || 0, tipo, cfg),
    [p, valor, tipo, cfg],
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] text-base">
            Simular desconto — {precificado.proc.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-2">
              <Label className="text-[11px] font-semibold">Desconto</Label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === 'percentual' ? '10' : '100,00'}
                className="bg-[#FFFDF9] border-[#EDE3D8] text-xs"
              />
            </div>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'valor' | 'percentual')}
              className="h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
            >
              <option value="percentual">%</option>
              <option value="valor">R$</option>
            </select>
          </div>

          <div className="bg-[#FAF6F0] rounded-lg p-3 space-y-1.5 border border-[#EDE3D8] text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Preço oficial</span>
              <span className="font-semibold">{formatCurrency(sim.precoOficial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Desconto</span>
              <span className="font-semibold text-red-600">
                − {formatCurrency(sim.descontoValor)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#EDE3D8] pt-1.5">
              <span className="text-[#6B4F42] font-semibold">Preço final</span>
              <span className="font-bold text-[#C66B4D]">{formatCurrency(sim.precoFinal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Lucro estimado</span>
              <span
                className={
                  sim.lucroEstimado > 0
                    ? 'text-[#6B8E23] font-semibold'
                    : 'text-red-600 font-semibold'
                }
              >
                {formatCurrency(sim.lucroEstimado)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Margem após desconto</span>
              <span
                className={
                  sim.margemAposDesconto < cfg.margemMinima
                    ? 'text-red-600 font-bold'
                    : 'font-semibold'
                }
              >
                {sim.margemAposDesconto.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Limite mínimo gerencial</span>
              <span className="text-[#6B4F42]">{formatCurrency(sim.limiteMinimoGerencial)}</span>
            </div>
          </div>

          {sim.abaixoDoLimite && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-red-700">
                <p className="font-bold">Limite gerencial excedido!</p>
                <p>
                  O preço final fica abaixo do limite mínimo (desconto máx. {cfg.descontoMaximo}% ou
                  margem mín. {cfg.margemMinima}%). É necessária a aprovação de um usuário
                  habilitado.
                </p>
                <label className="flex items-center gap-1.5 mt-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autorizado}
                    onChange={(e) => setAutorizado(e.target.checked)}
                    className="accent-[#C66B4D]"
                  />
                  Aprovo este desconto como responsável (fica registrado)
                </label>
              </div>
            </div>
          )}

          {!sim.abaixoDoLimite && sim.descontoValor > 0 && (
            <div className="bg-[#6B8E23]/10 border border-[#6B8E23]/30 rounded-lg p-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6B8E23]" />
              <p className="text-[11px] text-[#2D1B14]">
                Desconto dentro do limite gerencial — aprovado automaticamente.
              </p>
            </div>
          )}

          <p className="text-[10px] text-[#6B4F42] italic">
            Simulação apenas — a tabela oficial não é alterada.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="text-xs" onClick={onClose}>
              Fechar
            </Button>
            <Button
              className="btn-terracotta-gold text-xs"
              disabled={sim.abaixoDoLimite && !autorizado}
              onClick={() => {
                toast({
                  title: 'Desconto simulado',
                  description: `${precificado.proc.name}: ${formatCurrency(sim.precoFinal)} (margem ${sim.margemAposDesconto.toFixed(1)}%)${autorizado ? ' — aprovado manualmente' : ''}`,
                })
                onClose()
              }}
            >
              Aplicar desconto nesta negociação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
