import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Search, Trash2, MousePointerClick, Plus, X, Loader2 } from 'lucide-react'
import type { ProcedureRecord } from '@/services/procedures'
import { getProcedures } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { precoEfetivo } from '@/lib/pricing-engine'
import type { Tratamento } from '@/lib/plan-types'
import { tratamentoFromProcedure } from '@/lib/plan-types'
import { FACE_LABEL, facesDeFDI } from '@/lib/tooth-data'
import { OdontogramaClinico, ToothVisual } from '@/components/planning/OdontogramaClinico'

/**
 * NOVO FLUXO "Adicionar procedimento" — tela cheia com DUAS áreas lado a lado:
 * (1) odontograma anatômico interativo (OdontogramaClinico) para selecionar o
 *     dente que será tratado; (2) a tabela COMPLETA de procedimentos da tabela
 *     oficial (código, especialidade/família, nome, faces do dente selecionáveis
 *     por linha e valor editável). Permite acumular VÁRIOS tratamentos no mesmo
 *     dente (lista agrupada por dente com subtotal) antes de confirmar — cada
 *     tratamento segue como registro individual no planejamento.
 */

/**
 * BUGFIX 0.0.42: com a tabela de procedimentos vazia/inativa, NEM a busca nem
 * os chips de faces tinham qualquer efeito (não havia linha para clicar) — o
 * usuário lia isso como "nada acontece". Agora o painel carrega a tabela sozinho
 * se o pai não trouxe nada, e distingue visualmente "tabela vazia" de
 * "nenhum resultado para esta busca".
 */

/** Ordem canônica de abreviação das faces (ex.: "16 MOD"). */
const ORDEM_FACES = ['M', 'O', 'D', 'V', 'L', 'C']

/** Abreviação das faces no formato odontológico: M+O+D → "MOD". */
export const abrevFaces = (faces: string[]) => ORDEM_FACES.filter((f) => faces.includes(f)).join('')

interface Pendente {
  key: string
  proc: ProcedureRecord
  tooth: string
  faces: string[]
  preco: number
}

interface Props {
  open: boolean
  procedures: ProcedureRecord[]
  profissionais: { id: string; name: string }[]
  /** Estado visual do odontograma do planejamento (lesões/marcas existentes). */
  visual: Record<string, ToothVisual>
  /** Dente pré-selecionado (quando aberto a partir do diálogo de um dente). */
  denteInicial?: string | null
  onOpenChange: (open: boolean) => void
  /** Recebe os novos Tratamentos (registros individuais) para acrescentar à lista. */
  onConfirm: (novos: Tratamento[]) => void
}

export function AddProcedureFlow({
  open,
  procedures,
  profissionais,
  visual,
  denteInicial,
  onOpenChange,
  onConfirm,
}: Props) {
  const [denticao, setDenticao] = useState<'permanente' | 'decidua'>('permanente')
  const [dente, setDente] = useState<number | null>(null)
  /** Busca ao digitar a primeira letra — insensível a maiúsculas e acentos. */
  const [busca, setBusca] = useState('')
  const [buscaSemAcento, setBuscaSemAcento] = useState('')
  /** Valor editável por linha (procId → string do input). */
  const [precos, setPrecos] = useState<Record<string, string>>({})
  /** Faces selecionadas por linha (procId → faces[]). */
  const [facesPorLinha, setFacesPorLinha] = useState<Record<string, string[]>>({})
  /** Tratamentos acumulados antes de confirmar. */
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [profissionalId, setProfissionalId] = useState('')
  /** Carregamento da tabela oficial dentro do próprio painel. */
  const [carregando, setCarregando] = useState(false)

  /**
   * Fonte de verdade local da tabela: nasce do prop e é recarregada do banco
   * quando o painel abre sem nenhum procedimento (o pai pode ainda não ter
   * terminado de carregar, ou ter carregado uma tabela vazia/inativa).
   */
  const [tabelaLocal, setTabelaLocal] = useState<ProcedureRecord[]>(procedures)
  useEffect(() => setTabelaLocal(procedures), [procedures])

  // Reabertura limpa: dente inicial (ou nenhum), filtros e lista zerados.
  useEffect(() => {
    if (!open) return
    setDente(denteInicial ? Number(denteInicial) : null)
    setPendentes([])
    setBusca('')
    setBuscaSemAcento('')
    setPrecos({})
    setFacesPorLinha({})
    setProfissionalId('')
    // Sem dados no pai → busca a tabela oficial direto do banco.
    if (procedures.length === 0) {
      setCarregando(true)
      getProcedures()
        .then((regs) => {
          setTabelaLocal(regs)
          setCarregando(false)
        })
        .catch(() => setCarregando(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, denteInicial])

  /** Trocar o dente zera as faces escolhidas por linha (pertencem ao dente). */
  const escolherDente = (n: number | null) => {
    setDente(n)
    setFacesPorLinha({})
  }

  // Itens ativos da tabela oficial; se NENHUM item estiver ativo (ex.: tabela
  // legada anterior à importação do CSV, marcada active=false), cai para a
  // tabela completa — o painel nunca fica sem opções (bug 0.0.41: sem linhas,
  // nem a busca nem os chips de faces tinham efeito).
  const ativos = useMemo(() => {
    const act = tabelaLocal.filter((p) => p.active !== false)
    return act.length > 0 ? act : tabelaLocal
  }, [tabelaLocal])

  const lista = useMemo(() => {
    // Filtro insensível a maiúsculas e acentos (busca direta e sem acento) —
    // lista dinâmica: ao digitar a 1ª letra já mostra tudo que começa com ela.
    const qn = buscaSemAcento.trim().toLowerCase()
    if (!qn) return ativos
    return ativos.filter((p) =>
      [p.name, p.external_code, p.family].some((v) =>
        (v || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(qn),
      ),
    )
  }, [ativos, buscaSemAcento])

  const precoStrDe = (p: ProcedureRecord) => precos[p.id] ?? String(precoEfetivo(p) || 0)

  const facesDoDente = dente != null ? facesDeFDI(dente) : []

  const toggleFaceLinha = (procId: string, face: string) => {
    setFacesPorLinha((prev) => {
      const cur = prev[procId] || []
      return {
        ...prev,
        [procId]: cur.includes(face) ? cur.filter((f) => f !== face) : [...cur, face],
      }
    })
  }

  const adicionar = (p: ProcedureRecord) => {
    const preco = Number(precoStrDe(p)) || 0
    const item: Pendente = {
      key: `pd${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      proc: p,
      tooth: dente != null ? String(dente) : '',
      faces:
        dente != null ? (facesPorLinha[p.id] || []).filter((f) => facesDoDente.includes(f)) : [],
      preco,
    }
    setPendentes((prev) => [...prev, item])
    setFacesPorLinha((prev) => ({ ...prev, [p.id]: [] }))
  }

  const removerPendente = (key: string) => setPendentes((prev) => prev.filter((x) => x.key !== key))

  /** Lista agrupada por dente com subtotal (centavos). */
  const porDente = useMemo(() => {
    const acc: Record<string, { itens: Pendente[]; cents: number }> = {}
    pendentes.forEach((it) => {
      const k = it.tooth || 'regiao'
      acc[k] = acc[k] || { itens: [], cents: 0 }
      acc[k].itens.push(it)
      acc[k].cents += Math.round(it.preco * 100)
    })
    return acc
  }, [pendentes])

  const totalCents = pendentes.reduce((s, it) => s + Math.round(it.preco * 100), 0)

  const confirmar = () => {
    if (pendentes.length === 0) return
    const prof = profissionais.find((p) => p.id === profissionalId)
    const novos = pendentes.map((it) =>
      tratamentoFromProcedure(it.proc, {
        tooth: it.tooth,
        region: it.tooth,
        faces: it.faces,
        price: it.preco,
        professionalId: profissionalId,
        professionalName: prof?.name || '',
      }),
    )
    onConfirm(novos)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1400px,96vw)] w-[96vw] bg-[#FFFBF5] border-[#EDE3D8] h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2 border-b border-[#EDE3D8]">
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            Adicionar procedimento
            {dente != null && (
              <Badge className="bg-[#C66B4D] text-white text-[11px]">Dente {dente}</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Selecione o dente no odontograma à esquerda e adicione um ou vários procedimentos pela
            tabela à direita — escolha as faces, ajuste o valor e acumule quantos tratamentos quiser
            no mesmo dente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 pt-3 overflow-hidden">
          {/* ---------- (1) Odontograma ---------- */}
          <div className="min-h-0 overflow-y-auto pr-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase text-[#6B4F42] flex items-center gap-1">
                <MousePointerClick className="w-3.5 h-3.5 text-[#C66B4D]" /> 1. Selecione o dente
              </p>
              <div className="flex rounded-xl border border-[#EDE3D8] overflow-hidden">
                {(['permanente', 'decidua'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`px-2.5 py-1 text-[10px] font-semibold ${
                      denticao === d ? 'bg-[#C66B4D] text-white' : 'bg-white text-[#6B4F42]'
                    }`}
                    onClick={() => setDenticao(d)}
                  >
                    {d === 'permanente' ? 'Permanente' : 'Decídua'}
                  </button>
                ))}
              </div>
            </div>
            {dente != null && (
              <div className="flex items-center justify-between bg-white border border-[#C66B4D]/40 rounded-xl px-3 py-2">
                <span className="text-sm font-bold text-[#2D1B14]">
                  Dente selecionado: {dente}
                  <span className="text-[11px] font-normal text-[#6B4F42] ml-2">
                    faces na tabela abaixo
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-[#6B4F42]"
                  title="Remover seleção do dente"
                  onClick={() => setDente(null)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="bg-white border border-[#EDE3D8] rounded-xl p-2">
              <OdontogramaClinico
                visual={visual}
                selecionados={dente != null ? [dente] : []}
                facesSelecionadas={[]}
                modo="dente"
                onToothClick={(n) => escolherDente(dente === n ? null : n)}
                onFaceClick={() => {}}
                denticao={denticao}
              />
            </div>
            {dente == null && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Nenhum dente selecionado — é possível adicionar o procedimento sem dente (região
                global), mas as faces só aparecem após escolher o dente.
              </p>
            )}
          </div>

          {/* ---------- (2) Tabela completa de procedimentos ---------- */}
          <div className="min-h-0 flex flex-col space-y-2 overflow-hidden">
            <p className="text-[11px] font-bold uppercase text-[#6B4F42]">
              2. Tabela de procedimentos {dente != null ? `— dente ${dente}` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B4F42]" />
                <Input
                  value={busca}
                  onChange={(e) => {
                    const v = e.target.value
                    setBusca(v)
                    setBuscaSemAcento(v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
                  }}
                  placeholder="Pesquisar por nome, código ou família…"
                  className="pl-8 bg-white border-[#EDE3D8] text-xs h-8"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-[#EDE3D8] rounded-xl bg-white">
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#6B4F42]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C66B4D]" />
                  Carregando tabela de procedimentos…
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#FAF6F0] z-10">
                    <tr className="text-left text-[10px] uppercase text-[#6B4F42] border-b border-[#EDE3D8]">
                      <th className="py-2 px-2 font-semibold">Código</th>
                      <th className="py-2 px-2 font-semibold">Procedimento</th>
                      <th className="py-2 px-2 font-semibold">Especialidade/Família</th>
                      <th className="py-2 px-2 font-semibold">
                        Faces {dente != null ? `(${dente})` : ''}
                      </th>
                      <th className="py-2 px-2 font-semibold w-24">Valor (R$)</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((p) => {
                      const facesLinha = facesPorLinha[p.id] || []
                      return (
                        <tr key={p.id} className="border-b border-[#F5EEE6] hover:bg-[#FAF6F0]/60">
                          <td className="py-1.5 px-2 text-[#6B4F42] whitespace-nowrap">
                            {p.external_code || '—'}
                          </td>
                          <td className="py-1.5 px-2 font-semibold text-[#2D1B14]">{p.name}</td>
                          <td className="py-1.5 px-2 text-[10px] text-[#6B4F42]">
                            {p.specialty || '—'}
                            {p.family ? ` · ${p.family}` : ''}
                          </td>
                          <td className="py-1.5 px-2">
                            {dente == null ? (
                              <span className="text-[10px] text-[#B7A99A] italic">sem dente</span>
                            ) : (
                              <div className="flex flex-wrap gap-0.5">
                                {facesDoDente.map((f) => {
                                  const ativo = facesLinha.includes(f)
                                  return (
                                    <button
                                      key={f}
                                      type="button"
                                      title={FACE_LABEL[f] || f}
                                      className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${
                                        ativo
                                          ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                                          : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                                      }`}
                                      onClick={() => toggleFaceLinha(p.id, f)}
                                    >
                                      {f}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={precoStrDe(p)}
                              onChange={(e) =>
                                setPrecos((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className="w-20 h-7 text-xs bg-white"
                              title="Preço da tabela oficial — pode ser editado aqui"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <Button
                              type="button"
                              size="sm"
                              className="btn-terracotta-gold text-[10px] h-7 px-2"
                              onClick={() => {
                                adicionar(p)
                                setBusca('')
                                setBuscaSemAcento('')
                              }}
                            >
                              <Plus className="w-3 h-3 mr-0.5" /> Adicionar
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {lista.length === 0 && ativos.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 px-4 text-center text-[11px] text-amber-800 bg-amber-50"
                        >
                          A tabela de procedimentos está vazia ou sem itens ativos. Importe o CSV
                          oficial em <strong>Financeiro → Precificação → Importar CSV</strong> para
                          habilitar a busca, as faces e os valores aqui.
                        </td>
                      </tr>
                    )}
                    {lista.length === 0 && ativos.length > 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-[11px] text-[#6B4F42] italic"
                        >
                          Nenhum procedimento encontrado para “{busca}” — verifique a grafia ou
                          limpe a busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Rodapé: acumulados + profissional + confirmar ---------- */}
        <div className="border-t border-[#EDE3D8] pt-2 mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-[11px] font-semibold text-[#6B4F42]">
              Profissional executor:
            </Label>
            <Select value={profissionalId || undefined} onValueChange={setProfissionalId}>
              <SelectTrigger className="w-[220px] bg-white text-xs h-8">
                <SelectValue placeholder="Opcional — selecione" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id} className="text-xs">
                    {pr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <span className="text-xs text-[#6B4F42]">
              Total: <strong className="text-[#2D1B14]">{formatCurrency(totalCents / 100)}</strong>
            </span>
            <Button
              type="button"
              size="sm"
              className="btn-terracotta-gold text-xs"
              disabled={pendentes.length === 0}
              onClick={confirmar}
            >
              Concluir — adicionar {pendentes.length} tratamento{pendentes.length === 1 ? '' : 's'}
            </Button>
          </div>

          {pendentes.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Object.entries(porDente).map(([denteKey, grp]) => (
                <div
                  key={denteKey}
                  className="bg-white border border-[#EDE3D8] rounded-lg px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2D1B14]">
                      {denteKey === 'regiao' ? 'Sem dente (região/global)' : `Dente ${denteKey}`}
                    </span>
                    <span className="font-semibold text-[#C66B4D]">
                      Subtotal: {formatCurrency(grp.cents / 100)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {grp.itens.map((it) => (
                      <Badge
                        key={it.key}
                        variant="outline"
                        className="text-[10px] border-[#EDE3D8] bg-[#FAF6F0] gap-1"
                      >
                        {it.proc.name}
                        {it.faces.length ? ` ${abrevFaces(it.faces)}` : ''} —{' '}
                        {formatCurrency(it.preco)}
                        <button
                          type="button"
                          title="Remover"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => removerPendente(it.key)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#6B4F42] italic">
              Nenhum tratamento acumulado ainda — clique em “Adicionar” na tabela para acumular
              (vários no mesmo dente convivem).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddProcedureFlow
