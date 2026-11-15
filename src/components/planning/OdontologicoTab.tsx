import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pencil, CheckCircle2, Ban, RotateCcw, Trash2, Lock, MousePointerClick } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import type { Tratamento } from '@/lib/plan-types'
import { STATUS_LABEL, STATUS_COR } from '@/lib/plan-types'
import {
  orcamentoCents,
  orcamentoTotal,
  subtotaisPorArcada,
  mensagemOrcamento,
} from '@/lib/orcamento'
import { OdontogramaClinico, ToothVisual } from '@/components/planning/OdontogramaClinico'
import { TratamentoDialog } from '@/components/planning/TratamentoDialog'
import { DenteDialog, abrevFaces } from '@/components/planning/DenteDialog'
import { createMedicalRecord } from '@/services/medical_records'

/**
 * Aba "Planejamento Odontológico" — fluxo simplificado (0.0.46): HÁ UM
 * odontograma clínico (OdontogramaClinico, sempre visível e inteiro) e o CLIQUE
 * NO DENTE é o único caminho para planejar: abre o DenteDialog com busca de
 * procedimento (1ª letra), faces, profissional executor, valor editável e
 * observações. Vários tratamentos por dente coexistem; o total alimenta as
 * condições de pagamento (PaymentInfo) no componente pai.
 *
 * O sistema de CONDIÇÕES PRÉ-EXISTENTES (cárie, restauração, coroa…) foi
 * removido a pedido da equipe clínica — o odontograma continua existindo e
 * clicável, mas só reflete os tratamentos planejados. Marcas de condições
 * persistidas em planos antigos simplesmente deixam de ser exibidas.
 *
 * Contador de lesões: cada tratamento ativo (não cancelado) do dente conta
 * como uma lesão marcada no odontograma (círculo vermelho).
 *
 * Layout (0.0.47): a partir de xl o painel é uma GRADE de duas colunas —
 * odontograma à esquerda (sticky, confinado à própria coluna e com altura
 * máxima = viewport) e "Tratamentos planejados + orçamento" à direita, sempre
 * visíveis lado a lado. Antes (0.0.46) tudo ficava numa coluna única e o card
 * sticky cobria a lista de tratamentos ao rolar em tela cheia. Abaixo de xl as
 * cards empilham SEM sticky, para que nada cubra a lista.
 */

interface Props {
  procedures: ProcedureRecord[]
  professionals: { id: string; name: string }[]
  tratamentos: Tratamento[]
  onChange: (ts: Tratamento[]) => void
  locked?: boolean
  /** Desconto em reais aplicado sobre o subtotal do orçamento. */
  desconto: number
  onDescontoChange: (v: number) => void
  /** Total final (subtotal − desconto) em reais, para o PaymentInfo do pai. */
  onTotalChange?: (total: number) => void
  /** Paciente dono do planejamento — usado ao registrar a evolução da execução. */
  patientId?: string
}

export function OdontologicoTab({
  procedures,
  professionals,
  tratamentos,
  onChange,
  locked = false,
  desconto,
  onDescontoChange,
  patientId,
}: Props) {
  const [denticao, setDenticao] = useState<'permanente' | 'decidua'>('permanente')
  const [denteAberto, setDenteAberto] = useState<number | null>(null)
  const [editando, setEditando] = useState<{ t: Tratamento; modo: 'editar' | 'concluir' } | null>(
    null,
  )

  /** Estado visual de cada dente a partir dos tratamentos planejados. */
  const visual = useMemo(() => {
    const map: Record<string, ToothVisual> = {}
    tratamentos.forEach((t) => {
      const key = String(t.tooth || '').trim()
      if (!key) return
      const v = map[key] || { lesoes: 0 }
      if (t.status !== 'cancelado') v.lesoes += 1
      if (t.categoria === 'implante') v.implante = true
      map[key] = v
    })
    return map
  }, [tratamentos])

  /** Clique no dente = único caminho: abre o diálogo do dente direto. */
  const onToothClick = (n: number) => {
    if (locked) return
    setDenteAberto(n)
  }

  /* ---------- diálogo do dente ---------- */
  const denteItems =
    denteAberto != null ? tratamentos.filter((t) => String(t.tooth) === String(denteAberto)) : []

  const addTratamento = (t: Tratamento) => onChange([...tratamentos, t])

  const updateTratamento = (t: Tratamento) =>
    onChange(tratamentos.map((x) => (x.id === t.id ? t : x)))

  const setStatus = (id: string, status: Tratamento['status']) =>
    onChange(tratamentos.map((x) => (x.id === id ? { ...x, status } : x)))

  const remover = (id: string) => onChange(tratamentos.filter((x) => x.id !== id))

  const editarCampo = (id: string, patch: Partial<Tratamento>) =>
    onChange(tratamentos.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  /* ---------- orçamento (centavos) ---------- */
  const orcCents = orcamentoCents(tratamentos)
  const descontoC = Math.min(orcCents, Math.max(0, Math.round((desconto || 0) * 100)))
  const totalC = orcCents - descontoC
  const arcadas = subtotaisPorArcada(tratamentos)
  const msgOrcamento = mensagemOrcamento(tratamentos)
  const temProtocolo = tratamentos.some(
    (t) => t.categoria === 'protocolo' && t.status !== 'cancelado',
  )

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ---------- Odontograma clínico ---------- */}
      <Card className="card-warm p-4 space-y-3 self-start xl:sticky xl:top-16 xl:z-10 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeader className="p-0 pb-1">
            <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
              Odontograma Clínico — Planejamento Odontológico
            </CardTitle>
          </CardHeader>
          {locked && (
            <Badge className="bg-[#2E8B57] text-white text-[10px] gap-1">
              <Lock className="w-3 h-3" /> Aprovado — somente leitura
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-[#6B4F42] flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-[#C66B4D]" />
          Clique em um dente para adicionar procedimento, faces, profissional, valor e observações
          (vários por dente).
        </p>

        {/* Dentição */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[#EDE3D8] overflow-hidden">
            {(['permanente', 'decidua'] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={locked}
                className={`px-3 py-1.5 text-[11px] font-semibold ${
                  denticao === d ? 'bg-[#C66B4D] text-white' : 'bg-white text-[#6B4F42]'
                }`}
                onClick={() => setDenticao(d)}
              >
                {d === 'permanente' ? 'Permanente' : 'Decídua'}
              </button>
            ))}
          </div>
        </div>

        <OdontogramaClinico
          visual={visual}
          selecionados={denteAberto != null ? [denteAberto] : []}
          facesSelecionadas={[]}
          modo="dente"
          onToothClick={(n) => onToothClick(n)}
          onFaceClick={() => {}}
          denticao={denticao}
          locked={locked}
        />
      </Card>

      {/* ---------- Diálogo ÚNICO do dente ---------- */}
      <DenteDialog
        open={denteAberto != null}
        dente={denteAberto}
        procedures={procedures}
        profissionais={professionals}
        items={denteItems}
        locked={locked}
        onOpenChange={(o) => !o && setDenteAberto(null)}
        onAdd={addTratamento}
        onPriceChange={(id, price) => editarCampo(id, { price })}
        onRemoveItem={remover}
      />

      {/* ---------- Tratamentos e Orçamento ---------- */}
      <Card className="card-warm p-4 space-y-3 min-w-0">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Tratamentos planejados e orçamento
          </CardTitle>
        </CardHeader>

        {msgOrcamento && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            {msgOrcamento}
          </p>
        )}

        {tratamentos.length === 0 && (
          <p className="text-[11px] text-[#6B4F42]">
            Nenhum tratamento planejado ainda — clique no dente desejado no odontograma acima.
          </p>
        )}

        {tratamentos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-[#6B4F42] border-b border-[#EDE3D8]">
                  <th className="py-1.5 pr-2 font-semibold">Descrição</th>
                  <th className="py-1.5 pr-2 font-semibold">Dente/Região</th>
                  <th className="py-1.5 pr-2 font-semibold">Profissional</th>
                  <th className="py-1.5 pr-2 font-semibold w-16">Qtd</th>
                  <th className="py-1.5 pr-2 font-semibold w-28">Vlr unit.</th>
                  <th className="py-1.5 pr-2 font-semibold w-24">Subtotal</th>
                  <th className="py-1.5 pr-2 font-semibold">Status</th>
                  <th className="py-1.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {tratamentos.map((t) => {
                  const cancelado = t.status === 'cancelado'
                  const foraDoGlobal = t.incluidoNoGlobal === true
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-[#F5EEE6] ${cancelado ? 'opacity-50' : ''}`}
                    >
                      <td className="py-1.5 pr-2 text-[#2D1B14]">
                        {t.procedureName}
                        {t.categoria === 'protocolo' && (
                          <span className="ml-1 text-[9px] font-bold text-[#8B6914]">
                            ({t.modalidadePreco === 'global' ? 'global' : 'individual'})
                          </span>
                        )}
                        {foraDoGlobal && !cancelado && (
                          <span className="ml-1 text-[9px] text-[#6B4F42]">
                            — incluído no global
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-[#2D1B14]">
                        {t.tooth || t.region || '—'}
                        {t.tooth && t.faces?.length ? (
                          <span className="ml-1 font-bold text-[#C66B4D]">
                            {abrevFaces(t.faces)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-2 text-[#2D1B14]">{t.professionalName || '—'}</td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={1}
                          value={t.quantity || 1}
                          disabled={locked}
                          onChange={(e) =>
                            editarCampo(t.id, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-14 h-7 text-xs bg-white"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={t.price}
                          disabled={locked}
                          onChange={(e) =>
                            editarCampo(t.id, { price: Number(e.target.value) || 0 })
                          }
                          className="w-24 h-7 text-xs bg-white"
                          title="Valor unitário — o total e as parcelas recalculam automaticamente"
                        />
                      </td>
                      <td className="py-1.5 pr-2 font-bold text-[#2D1B14]">
                        {formatCurrency((t.price || 0) * (t.quantity || 1))}
                      </td>
                      <td className="py-1.5 pr-2">
                        <Badge
                          className={`text-[9px] border ${STATUS_COR[t.status || 'planejado']}`}
                        >
                          {STATUS_LABEL[t.status || 'planejado']}
                        </Badge>
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-0.5">
                          {!locked && (
                            <>
                              <Button
                                size="sm"
                                type="button"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-[#C66B4D]"
                                title="Editar tratamento"
                                onClick={() => setEditando({ t, modo: 'editar' })}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {t.status !== 'executado' && !cancelado && (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-[#2E8B57]"
                                  title="Concluir — registra evolução no prontuário"
                                  onClick={() => setEditando({ t, modo: 'concluir' })}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {cancelado ? (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-[#6B4F42]"
                                  title="Reativar"
                                  onClick={() => setStatus(t.id, 'planejado')}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-[#8B6914]"
                                  title="Cancelar tratamento"
                                  onClick={() => setStatus(t.id, 'cancelado')}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                type="button"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500"
                                title="Excluir"
                                onClick={() => remover(t.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totais do orçamento (centavos) */}
        {tratamentos.length > 0 && (
          <div className="space-y-1.5 border-t border-[#EDE3D8] pt-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B4F42]">Subtotal</span>
              <span className="font-semibold text-[#2D1B14]">{formatCurrency(orcCents / 100)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B4F42]">Desconto (R$)</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={desconto || ''}
                disabled={locked}
                placeholder="0,00"
                onChange={(e) => onDescontoChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 h-7 text-xs bg-white"
              />
            </div>
            {temProtocolo && (
              <div className="flex flex-wrap justify-end gap-3 text-[10px] text-[#6B4F42]">
                {arcadas.superiorCents > 0 && (
                  <span>Arcada superior: {formatCurrency(arcadas.superior)}</span>
                )}
                {arcadas.inferiorCents > 0 && (
                  <span>Arcada inferior: {formatCurrency(arcadas.inferior)}</span>
                )}
                {arcadas.ambasCents > 0 && (
                  <span>Arcadas (ambas): {formatCurrency(arcadas.ambas)}</span>
                )}
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-[#2D1B14]">Total do orçamento</span>
              <span className="text-base font-bold text-[#C66B4D]">
                {formatCurrency(totalC / 100)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* ---------- Editar / Concluir um tratamento ---------- */}
      <TratamentoDialog
        open={!!editando}
        onOpenChange={(o) => !o && setEditando(null)}
        tratamento={editando?.t ?? null}
        modo={editando?.modo ?? 'editar'}
        professionals={professionals}
        onSave={(t) => {
          updateTratamento(t)
          setEditando(null)
          if (t.status === 'executado' && patientId) {
            // Registro clínico da execução também vai ao prontuário (T7).
            createMedicalRecord({
              patient: patientId,
              anamnesis: '',
              diagnosis: `Execução — ${t.procedureName} (dente ${t.tooth || t.region || '—'})`,
              notes: [
                t.evolucao,
                t.materiais ? `Materiais: ${t.materiais}` : null,
                t.observacoes || null,
              ]
                .filter(Boolean)
                .join(' | '),
              record_date: new Date().toISOString(),
            }).catch(() => {
              /* prontuário é reforço — o registro principal fica no plano */
            })
          }
        }}
      />
    </div>
  )
}
