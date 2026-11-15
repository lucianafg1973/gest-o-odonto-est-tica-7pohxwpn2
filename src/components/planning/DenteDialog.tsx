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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Trash2, Loader2, Plus } from 'lucide-react'
import type { ProcedureRecord } from '@/services/procedures'
import { getProcedures } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { precoEfetivo } from '@/lib/pricing-engine'
import type { Tratamento } from '@/lib/plan-types'
import { tratamentoFromProcedure } from '@/lib/plan-types'
import { FACE_LABEL, facesDeFDI } from '@/lib/tooth-data'

/**
 * Diálogo ÚNICO do dente (fluxo simplificado 0.0.46): clicar num dente do
 * odontograma abre aqui tudo o que a clínica pediu — busca de procedimento
 * pela 1ª letra (NFD), chips de faces, profissional executor, valor editável
 * pré-preenchido com o preço da tabela e observações. Sem painéis extras.
 * Cada "Adicionar" cria um registro INDIVIDUAL — vários tratamentos no mesmo
 * dente coexistem, e o subtotal do dente aparece no rodapé.
 */

/** Ordem canônica de abreviação das faces (ex.: "16 MOD"). */
const ORDEM_FACES = ['M', 'O', 'D', 'V', 'L', 'C']

/** Abreviação das faces no formato odontológico: M+O+D → "MOD". */
export const abrevFaces = (faces: string[]) => ORDEM_FACES.filter((f) => faces.includes(f)).join('')

interface Props {
  open: boolean
  /** Dente FDI aberto (o diálogo só abre com dente). */
  dente: number | null
  procedures: ProcedureRecord[]
  profissionais: { id: string; name: string }[]
  /** Tratamentos JÁ existentes deste dente. */
  items: Tratamento[]
  locked?: boolean
  onOpenChange: (open: boolean) => void
  /** Acrescenta o novo Tratamento à lista do planejamento (append). */
  onAdd: (t: Tratamento) => void
  /** Edita o valor unitário de um tratamento já listado. */
  onPriceChange: (id: string, price: number) => void
  /** Remove um tratamento da lista. */
  onRemoveItem: (id: string) => void
}

export function DenteDialog({
  open,
  dente,
  procedures,
  profissionais,
  items,
  locked = false,
  onOpenChange,
  onAdd,
  onPriceChange,
  onRemoveItem,
}: Props) {
  /** Busca ao digitar a primeira letra — insensível a maiúsculas e acentos. */
  const [busca, setBusca] = useState('')
  const [buscaSemAcento, setBuscaSemAcento] = useState('')
  const [procSel, setProcSel] = useState<ProcedureRecord | null>(null)
  const [faces, setFaces] = useState<string[]>([])
  const [precoStr, setPrecoStr] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  /** Fallback 0.0.42: carrega a tabela do banco quando o pai abre sem dados. */
  const [tabelaLocal, setTabelaLocal] = useState<ProcedureRecord[]>(procedures)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => setTabelaLocal(procedures), [procedures])

  // Reabertura limpa: nenhum procedimento/faces/valor/obs das vezes anteriores.
  useEffect(() => {
    if (!open) return
    setBusca('')
    setBuscaSemAcento('')
    setProcSel(null)
    setFaces([])
    setPrecoStr('')
    setObservacoes('')
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
  }, [open])

  // Itens ativos; se NENHUM estiver ativo (tabela legada anterior à importação
  // do CSV), cai para a tabela completa — a busca nunca fica sem opções.
  const ativos = useMemo(() => {
    const act = tabelaLocal.filter((p) => p.active !== false)
    return act.length > 0 ? act : tabelaLocal
  }, [tabelaLocal])

  const lista = useMemo(() => {
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

  const facesDoDente = dente != null ? facesDeFDI(dente) : []

  const escolherProc = (p: ProcedureRecord) => {
    setProcSel(p)
    setPrecoStr(String(precoEfetivo(p) || 0))
    setFaces([])
  }

  const toggleFace = (f: string) =>
    setFaces((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))

  const adicionar = () => {
    if (!procSel || dente == null || locked) return
    const prof = profissionais.find((p) => p.id === profissionalId)
    const t = tratamentoFromProcedure(procSel, {
      tooth: String(dente),
      region: String(dente),
      faces: faces.filter((f) => facesDoDente.includes(f)),
      price: Number(precoStr) || 0,
      professionalId: profissionalId,
      professionalName: prof?.name || '',
      observacoes: observacoes.trim(),
    })
    onAdd(t)
    // Limpa para o próximo item — o dente continua aberto (vários por dente).
    setBusca('')
    setBuscaSemAcento('')
    setProcSel(null)
    setFaces([])
    setPrecoStr('')
    setObservacoes('')
  }

  const subtotalCents = items
    .filter((t) => t.status !== 'cancelado')
    .reduce((s, t) => s + Math.round((t.price || 0) * (t.quantity || 1) * 100), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            Dente {dente}
            {faces.length > 0 && (
              <Badge className="bg-[#C66B4D] text-white text-[10px]">
                {dente}
                {abrevFaces(faces)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Adicione procedimento, faces, profissional, valor e observações — vários tratamentos
            convivem no mesmo dente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 1. Adicionar procedimento — busca pela 1ª letra */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Adicionar procedimento</Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B4F42]" />
              <Input
                value={busca}
                disabled={locked}
                onChange={(e) => {
                  const v = e.target.value
                  setBusca(v)
                  setBuscaSemAcento(v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
                }}
                placeholder="Digite a 1ª letra…"
                className="pl-8 bg-white border-[#EDE3D8] text-xs h-8"
              />
            </div>
            {carregando ? (
              <div className="flex items-center gap-2 py-3 text-xs text-[#6B4F42]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C66B4D]" /> Carregando tabela…
              </div>
            ) : lista.length === 0 ? (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {ativos.length === 0
                  ? 'A tabela de procedimentos está vazia ou sem itens ativos — importe o CSV em Financeiro → Precificação.'
                  : `Nenhum procedimento encontrado para “${busca}”.`}
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-[#EDE3D8] rounded-lg divide-y divide-[#F5EEE6]">
                {lista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={locked}
                    className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 ${
                      procSel?.id === p.id ? 'bg-[#FBF3DC]' : 'bg-white hover:bg-[#FAF6F0]'
                    }`}
                    onClick={() => escolherProc(p)}
                  >
                    <span className="font-semibold text-[#2D1B14] truncate">{p.name}</span>
                    <span className="text-[10px] text-[#6B4F42] whitespace-nowrap">
                      {formatCurrency(precoEfetivo(p) || 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Faces do dente */}
          {dente != null && facesDoDente.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Faces</Label>
              <div className="flex flex-wrap gap-1">
                {facesDoDente.map((f) => {
                  const ativo = faces.includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      disabled={locked}
                      title={FACE_LABEL[f] || f}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                        ativo
                          ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                          : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                      }`}
                      onClick={() => toggleFace(f)}
                    >
                      {f}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Profissional executor */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Profissional executor</Label>
            <Select value={profissionalId || undefined} onValueChange={setProfissionalId}>
              <SelectTrigger className="w-full bg-white text-xs">
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
          </div>

          {/* 4. Valor editável (pré-preenchido com o preço da tabela) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Valor (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={precoStr}
              disabled={locked || !procSel}
              onChange={(e) => setPrecoStr(e.target.value)}
              placeholder={procSel ? undefined : 'Escolha um procedimento'}
              className="w-28 h-8 text-xs bg-white"
              title="Preço da tabela oficial — editável"
            />
          </div>

          {/* 5. Observações */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações</Label>
            <Input
              value={observacoes}
              disabled={locked}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional — texto livre"
              className="text-xs"
            />
          </div>

          <Button
            type="button"
            size="sm"
            className="btn-terracotta-gold text-xs w-full"
            disabled={locked || !procSel}
            onClick={adicionar}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar tratamento
          </Button>

          {/* Tratamentos já planejados neste dente */}
          {items.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#EDE3D8]">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`bg-[#FAF6F0] rounded-lg px-2 py-1.5 border border-[#EDE3D8] flex items-center gap-2 ${
                    it.status === 'cancelado' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D1B14] truncate">
                      {it.procedureName}
                      {it.faces?.length ? (
                        <span className="ml-1 font-bold text-[#C66B4D]">
                          {abrevFaces(it.faces)}
                        </span>
                      ) : null}
                    </p>
                    {(it.observacoes || it.professionalName) && (
                      <p className="text-[10px] text-[#6B4F42] truncate">
                        {[it.professionalName, it.observacoes].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.price}
                    disabled={locked}
                    onChange={(e) => onPriceChange(it.id, Number(e.target.value) || 0)}
                    className="w-20 h-7 text-xs bg-white shrink-0"
                    title="Valor unitário"
                  />
                  {!locked && (
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 shrink-0"
                      title="Excluir tratamento"
                      onClick={() => onRemoveItem(it.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-[#6B4F42]">Subtotal do dente:</span>
                <span className="font-bold text-[#C66B4D]">
                  {formatCurrency(subtotalCents / 100)}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
