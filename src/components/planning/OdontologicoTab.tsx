import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, CheckCircle2, Ban, RotateCcw, Trash2, Bone, Lock } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import type { Tratamento, CondicaoClinica } from '@/lib/plan-types'
import { CONDICOES, STATUS_LABEL, STATUS_COR, tratamentoFromProcedure } from '@/lib/plan-types'
import {
  orcamentoCents,
  orcamentoTotal,
  subtotaisPorArcada,
  mensagemOrcamento,
} from '@/lib/orcamento'
import {
  OdontogramaClinico,
  ToothVisual,
  ModoSelecao,
} from '@/components/planning/OdontogramaClinico'
import { TratamentoDialog } from '@/components/planning/TratamentoDialog'
import { ImplantPanel } from '@/components/planning/ImplantPanel'

/**
 * Aba "Planejamento Odontológico" — conecta o odontograma clínico anatômico
 * (OdontogramaClinico) ao diálogo de tratamento (TratamentoDialog), à lista/
 * orçamento em centavos (lib/orcamento) e ao painel de implantes/protocolos
 * (ImplantPanel). Vários tratamentos por dente coexistem; o total alimenta
 * as condições de pagamento (PaymentInfo) no componente pai.
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
}

/** Marcações clínicas (condições) por dente — mantidas em memória da sessão. */
type Marcas = Record<
  string,
  { condicoes: CondicaoClinica[]; faces: Partial<Record<string, CondicaoClinica>> }
>

export function OdontologicoTab({
  procedures,
  professionals,
  tratamentos,
  onChange,
  locked = false,
  desconto,
  onDescontoChange,
}: Props) {
  const [denticao, setDenticao] = useState<'permanente' | 'decidua'>('permanente')
  const [condicaoAtiva, setCondicaoAtiva] = useState<CondicaoClinica | null>(null)
  const [marcas, setMarcas] = useState<Marcas>({})
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [facesSelecionadas, setFacesSelecionadas] = useState<string[]>([])
  const [modoFaces, setModoFaces] = useState(false)
  const [denteAberto, setDenteAberto] = useState<number | null>(null)
  const [novoProcId, setNovoProcId] = useState('')
  const [editando, setEditando] = useState<{ t: Tratamento; modo: 'editar' | 'concluir' } | null>(
    null,
  )
  const [painelImplantes, setPainelImplantes] = useState(false)

  const modo: ModoSelecao = condicaoAtiva ? 'condicao' : modoFaces ? 'face' : 'dente'

  /** Estado visual de cada dente a partir dos tratamentos + marcações. */
  const visual = useMemo(() => {
    const map: Record<string, ToothVisual> = {}
    tratamentos.forEach((t) => {
      const key = String(t.tooth || '').trim()
      if (!key) return
      const v = map[key] || { condicoes: [], faces: {}, tratamentos: 0 }
      if (t.status !== 'cancelado') v.tratamentos += 1
      if (t.categoria === 'implante') v.implante = true
      map[key] = v
    })
    Object.entries(marcas).forEach(([k, m]) => {
      const v = map[k] || { condicoes: [], faces: {}, tratamentos: 0 }
      v.condicoes = m.condicoes || []
      v.faces = m.faces || {}
      v.ausente = (m.condicoes || []).includes('ausente')
      map[k] = v
    })
    return map
  }, [tratamentos, marcas])

  const onToothClick = (n: number, mult: boolean) => {
    if (locked) return
    if (condicaoAtiva) {
      setMarcas((prev) => {
        const cur = prev[String(n)] || { condicoes: [], faces: {} }
        const tem = cur.condicoes.includes(condicaoAtiva)
        const condicoes = tem
          ? cur.condicoes.filter((c) => c !== condicaoAtiva)
          : [...cur.condicoes, condicaoAtiva]
        return { ...prev, [String(n)]: { ...cur, condicoes } }
      })
      return
    }
    if (mult) {
      setSelecionados((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
      return
    }
    setSelecionados([n])
    setDenteAberto(n)
  }

  const onFaceClick = (dente: number, face: string) => {
    if (locked) return
    const key = `${dente}:${face}`
    if (condicaoAtiva) {
      setMarcas((prev) => {
        const cur = prev[String(dente)] || { condicoes: [], faces: {} }
        const faces = { ...cur.faces }
        if (faces[face] === condicaoAtiva) delete faces[face]
        else faces[face] = condicaoAtiva
        return { ...prev, [String(dente)]: { ...cur, faces } }
      })
      return
    }
    setFacesSelecionadas((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    )
  }

  /* ---------- diálogo do dente ---------- */
  const denteItems =
    denteAberto != null ? tratamentos.filter((t) => String(t.tooth) === String(denteAberto)) : []
  const denteFaces =
    denteAberto != null
      ? facesSelecionadas.filter((f) => f.startsWith(`${denteAberto}:`)).map((f) => f.split(':')[1])
      : []
  const denteSubtotal = denteItems
    .filter((t) => t.status !== 'cancelado')
    .reduce((s, t) => s + (t.price || 0) * (t.quantity || 1), 0)

  const addTratamento = () => {
    if (denteAberto == null) return
    const proc = procedures.find((p) => p.id === novoProcId) || procedures[0]
    if (!proc) return
    const t = tratamentoFromProcedure(proc, {
      tooth: String(denteAberto),
      region: String(denteAberto),
      faces: denteFaces,
    })
    onChange([...tratamentos, t])
    setNovoProcId('')
  }

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
    <div className="space-y-4">
      {/* ---------- Odontograma clínico ---------- */}
      <Card className="card-warm p-4 space-y-3">
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
        <p className="text-[11px] text-[#6B4F42]">
          Clique em um dente para gerenciar seus tratamentos (canal, pino, restauração… — vários por
          dente). Escolha uma condição na legenda para marcar o exame clínico; com &quot;Faces&quot;
          ativo, clique nas faces da coroa.
        </p>

        {/* Dentição + modo */}
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
          <Button
            type="button"
            size="sm"
            variant={modoFaces ? 'default' : 'outline'}
            disabled={locked}
            className={`text-[11px] h-8 ${modoFaces ? 'btn-terracotta-gold' : 'text-[#C66B4D] border-[#C66B4D]/40'}`}
            onClick={() => {
              setModoFaces((v) => !v)
              setCondicaoAtiva(null)
            }}
          >
            Selecionar faces
          </Button>
          {(selecionados.length > 0 || facesSelecionadas.length > 0) && !locked && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[11px] h-8 text-[#6B4F42]"
              onClick={() => {
                setSelecionados([])
                setFacesSelecionadas([])
              }}
            >
              Limpar seleção
            </Button>
          )}
        </div>

        {/* Condições clínicas (exame) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-[#EDE3D8] rounded-xl p-2">
          <span className="text-[10px] font-bold uppercase text-[#6B4F42] mr-1">
            Condição (clique no dente):
          </span>
          {CONDICOES.map((c) => (
            <button
              key={c.key}
              type="button"
              title={c.descricao}
              disabled={locked}
              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                condicaoAtiva === c.key ? 'text-white' : 'text-[#2D1B14]'
              }`}
              style={
                condicaoAtiva === c.key
                  ? { background: c.cor, borderColor: c.cor }
                  : { background: `${c.cor}22`, borderColor: c.cor }
              }
              onClick={() => {
                setCondicaoAtiva((cur) => (cur === c.key ? null : c.key))
                setModoFaces(false)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <OdontogramaClinico
          visual={visual}
          selecionados={selecionados}
          facesSelecionadas={facesSelecionadas}
          modo={modo}
          condicaoAtiva={condicaoAtiva}
          onToothClick={onToothClick}
          onFaceClick={(dente, face, _m) => onFaceClick(dente, face)}
          denticao={denticao}
          locked={locked}
        />
      </Card>

      {/* ---------- Tratamentos e Orçamento ---------- */}
      <Card className="card-warm p-4 space-y-3">
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
                      <td className="py-1.5 pr-2 text-[#2D1B14]">{t.tooth || t.region || '—'}</td>
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

        {/* Painel de implantes/protocolos */}
        {!locked && (
          <div className="border-t border-[#EDE3D8] pt-2">
            <Button
              type="button"
              size="sm"
              variant={painelImplantes ? 'default' : 'outline'}
              className={`text-xs font-semibold ${painelImplantes ? 'btn-terracotta-gold' : 'text-[#C66B4D] border-[#C66B4D]/40'}`}
              onClick={() => setPainelImplantes((v) => !v)}
            >
              <Bone className="w-3.5 h-3.5 mr-1" />
              {painelImplantes ? 'Ocultar implantes e protocolos' : 'Implantes e protocolos'}
            </Button>
            {painelImplantes && (
              <div className="mt-3">
                <ImplantPanel
                  procedures={procedures}
                  tratamentos={tratamentos}
                  onChange={onChange}
                  professionals={professionals}
                  locked={locked}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ---------- Diálogo do dente (múltiplos tratamentos) ---------- */}
      <Dialog open={denteAberto != null} onOpenChange={(o) => !o && setDenteAberto(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Dente {denteAberto}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Todos os tratamentos deste dente — adicione vários (canal + pino + coroa…), cada um
              com preço editável. Nenhum sobrescreve o outro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold">Tratamento da tabela</Label>
                <Select value={novoProcId} disabled={locked} onValueChange={setNovoProcId}>
                  <SelectTrigger className="w-full bg-white text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                className="btn-terracotta-gold text-xs"
                onClick={addTratamento}
                disabled={locked || procedures.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" /> Incluir
              </Button>
            </div>

            {denteItems.length === 0 && (
              <p className="text-[11px] text-[#6B4F42]">Nenhum tratamento neste dente ainda.</p>
            )}

            <div className="space-y-2">
              {denteItems.map((it) => (
                <div
                  key={it.id}
                  className={`bg-[#FAF6F0] rounded-lg p-2 border border-[#EDE3D8] space-y-1.5 ${
                    it.status === 'cancelado' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#2D1B14] flex-1 min-w-0 truncate">
                      {it.procedureName}
                    </span>
                    <Badge className={`text-[9px] border ${STATUS_COR[it.status || 'planejado']}`}>
                      {STATUS_LABEL[it.status || 'planejado']}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.price}
                      disabled={locked}
                      onChange={(e) => editarCampo(it.id, { price: Number(e.target.value) || 0 })}
                      className="w-24 h-7 text-xs"
                      title="Valor unitário"
                    />
                    <span className="text-[11px] text-[#6B4F42] flex-1">
                      {formatCurrency((it.price || 0) * (it.quantity || 1))}
                    </span>
                    {!locked && (
                      <>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-[#C66B4D]"
                          title="Editar"
                          onClick={() => setEditando({ t: it, modo: 'editar' })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {it.status !== 'executado' && it.status !== 'cancelado' && (
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-[#2E8B57]"
                            title="Concluir"
                            onClick={() => setEditando({ t: it, modo: 'concluir' })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {it.status === 'cancelado' ? (
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-[#6B4F42]"
                            title="Reativar"
                            onClick={() => setStatus(it.id, 'planejado')}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-[#8B6914]"
                            title="Cancelar"
                            onClick={() => setStatus(it.id, 'cancelado')}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          title="Excluir"
                          onClick={() => remover(it.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {denteItems.length > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[#EDE3D8]">
                <span className="text-[#6B4F42]">Subtotal do dente:</span>
                <span className="font-bold text-[#C66B4D]">{formatCurrency(denteSubtotal)}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
        }}
      />
    </div>
  )
}
