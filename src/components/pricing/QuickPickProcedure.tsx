import { useMemo, useState } from 'react'
import { ProcedureRecord } from '@/services/procedures'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/price-calculation'
import { precoEfetivo, SPECIALTIES, FAMILY_SUGGESTIONS } from '@/lib/pricing-engine'
import { Search, Star, Clock, ChevronRight, ArrowLeft } from 'lucide-react'

/**
 * PAINEL DE SELEÇÃO RÁPIDA — Especialidades → Famílias → Procedimentos →
 * Preço oficial preenchido automaticamente → Profissional executor →
 * Adicionar ao planejamento. Inclui Favoritos, Recentes e pesquisa.
 */

export interface SelecaoRapidaResult {
  proc: ProcedureRecord
  preco: number
  profissionalId: string
}

interface Props {
  open: boolean
  procedures: ProcedureRecord[]
  profissionais: { id: string; name: string }[]
  favoritosIniciais?: string[]
  onClose: () => void
  onAdd: (result: SelecaoRapidaResult) => void
}

const FAV_KEY = 'lfg_fav_procs'
const REC_KEY = 'lfg_recent_procs'

const loadIds = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export default function QuickPickProcedure({
  open,
  procedures,
  profissionais,
  favoritosIniciais,
  onClose,
  onAdd,
}: Props) {
  const [especialidade, setEspecialidade] = useState<string | null>(null)
  const [familia, setFamilia] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [preco, setPreco] = useState('')
  const [profissional, setProfissional] = useState('')
  const [selecionado, setSelecionado] = useState<ProcedureRecord | null>(null)
  const [favoritos, setFavoritos] = useState<string[]>(favoritosIniciais || loadIds(FAV_KEY))
  const [recentes] = useState<string[]>(() => loadIds(REC_KEY).slice(0, 8))

  const porId = useMemo(() => new Map(procedures.map((p) => [p.id, p])), [procedures])

  const ativos = procedures.filter((p) => p.active !== false && (p.price ?? 0) > 0)

  const especialidades = useMemo(() => {
    const usadas = Array.from(new Set(ativos.map((p) => p.specialty).filter(Boolean) as string[]))
    return usadas.length ? usadas : [...SPECIALTIES]
  }, [ativos])

  const familias = useMemo(() => {
    if (!especialidade) return []
    const daLista = Array.from(
      new Set(
        ativos
          .filter((p) => p.specialty === especialidade)
          .map((p) => p.family)
          .filter(Boolean) as string[],
      ),
    )
    return daLista.length ? daLista : FAMILY_SUGGESTIONS[especialidade] || ['Todas']
  }, [especialidade, ativos])

  const procedimentos = useMemo(() => {
    let lista = ativos
    if (especialidade) lista = lista.filter((p) => p.specialty === especialidade)
    if (familia) lista = lista.filter((p) => p.family === familia)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (p) => p.name?.toLowerCase().includes(q) || p.external_code?.toLowerCase().includes(q),
      )
    }
    return lista
  }, [ativos, especialidade, familia, busca])

  const abrir = (proc: ProcedureRecord) => {
    setSelecionado(proc)
    setPreco(String(precoEfetivo(proc)))
  }

  const confirmar = () => {
    if (!selecionado) return
    const ids = [selecionado.id, ...recentes.filter((id) => id !== selecionado.id)].slice(0, 12)
    localStorage.setItem(REC_KEY, JSON.stringify(ids))
    onAdd({
      proc: selecionado,
      preco: Number(preco.replace(',', '.')) || 0,
      profissionalId: profissional,
    })
    onClose()
    setSelecionado(null)
    setEspecialidade(null)
    setFamilia(null)
    setBusca('')
  }

  const toggleFav = (id: string) => {
    const next = favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id]
    setFavoritos(next)
    localStorage.setItem(FAV_KEY, JSON.stringify(next))
  }

  const step = !especialidade ? 1 : !familia ? 2 : !selecionado ? 3 : 4

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            Adicionar procedimento
          </DialogTitle>
          <p className="text-[11px] text-[#6B4F42]">
            {step === 1 && '1/4 — Escolha a especialidade'}
            {step === 2 && '2/4 — Escolha a família'}
            {step === 3 && '3/4 — Escolha o procedimento'}
            {step === 4 && '4/4 — Confirme preço e executor'}
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B4F42]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome ou código…"
            className="pl-8 bg-[#FFFDF9] border-[#EDE3D8] text-xs"
          />
        </div>

        {/* Nível: especialidades */}
        {!especialidade && (
          <div className="space-y-1">
            {favoritos.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase text-[#6B4F42] flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#D4AF37]" /> Favoritos
                </p>
                {favoritos.map((id) => {
                  const p = porId.get(id)
                  if (!p) return null
                  return (
                    <ProcRow
                      key={id}
                      proc={p}
                      onClick={() => abrir(p)}
                      fav
                      onToggleFav={() => toggleFav(id)}
                    />
                  )
                })}
              </>
            )}
            {recentes.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase text-[#6B4F42] mt-2">
                  Recentemente utilizados
                </p>
                {recentes.map((id) => {
                  const p = porId.get(id)
                  if (!p) return null
                  return <ProcRow key={id} proc={p} onClick={() => abrir(p)} />
                })}
              </>
            )}
            <p className="text-[10px] font-bold uppercase text-[#6B4F42] mt-2">Especialidades</p>
            {especialidades.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setEspecialidade(s)
                  setFamilia(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#EDE3D8] bg-white hover:bg-[#FAF6F0] text-xs font-semibold text-[#2D1B14]"
              >
                {s}
                <ChevronRight className="w-3.5 h-3.5 text-[#C66B4D]" />
              </button>
            ))}
          </div>
        )}

        {/* Nível: famílias */}
        {especialidade && !familia && !busca.trim() && (
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#C66B4D] text-xs"
              onClick={() => setEspecialidade(null)}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {especialidade}
            </Button>
            {familias.map((f) => (
              <button
                key={f}
                onClick={() => setFamilia(f)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#EDE3D8] bg-white hover:bg-[#FAF6F0] text-xs font-semibold text-[#2D1B14]"
              >
                {f}
                <ChevronRight className="w-3.5 h-3.5 text-[#C66B4D]" />
              </button>
            ))}
            <button
              onClick={() => setFamilia('*')}
              className="w-full px-3 py-2 rounded-lg text-[11px] text-[#6B4F42] hover:bg-[#FAF6F0]"
            >
              Ver todos de {especialidade}
            </button>
          </div>
        )}

        {/* Nível: procedimentos */}
        {(familia || busca.trim()) && !selecionado && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              {especialidade && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#C66B4D] text-xs"
                  onClick={() => setFamilia(null)}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />{' '}
                  {familia === '*' ? especialidade : familia}
                </Button>
              )}
            </div>
            {procedimentos.map((p) => (
              <ProcRow
                key={p.id}
                proc={p}
                onClick={() => abrir(p)}
                fav={favoritos.includes(p.id)}
                onToggleFav={() => toggleFav(p.id)}
              />
            ))}
            {procedimentos.length === 0 && (
              <p className="text-[11px] text-[#6B4F42] italic py-4 text-center">
                Nenhum procedimento encontrado nesta especialidade/família.
              </p>
            )}
          </div>
        )}

        {/* Nível: confirmação */}
        {selecionado && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#C66B4D] text-xs"
              onClick={() => setSelecionado(null)}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {selecionado.name}
            </Button>
            <div>
              <Label className="text-[11px] font-semibold">Preço oficial (R$)</Label>
              <Input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="bg-[#FFFDF9] border-[#EDE3D8] text-xs"
              />
              <p className="text-[10px] text-[#6B4F42] mt-0.5">
                Preenchido automaticamente pela tabela oficial — edite somente com permissão.
              </p>
            </div>
            <div>
              <Label className="text-[11px] font-semibold">Profissional executor</Label>
              <select
                value={profissional}
                onChange={(e) => setProfissional(e.target.value)}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                <option value="">Selecione…</option>
                {profissionais.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
            {selecionado.duration_minutes ? (
              <Badge variant="outline" className="text-[10px] border-[#C66B4D] text-[#C66B4D]">
                <Clock className="w-3 h-3 mr-1" /> {selecionado.duration_minutes} min
              </Badge>
            ) : null}
            <Button className="btn-terracotta-gold w-full text-xs" onClick={confirmar}>
              Adicionar ao planejamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProcRow({
  proc,
  onClick,
  fav,
  onToggleFav,
}: {
  proc: ProcedureRecord
  onClick: () => void
  fav?: boolean
  onToggleFav?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#EDE3D8] bg-white hover:bg-[#FAF6F0]">
      <button onClick={onClick} className="flex-1 text-left">
        <p className="text-xs font-semibold text-[#2D1B14]">{proc.name}</p>
        <p className="text-[10px] text-[#6B4F42]">
          {proc.external_code ? `${proc.external_code} · ` : ''}
          {formatCurrency(precoEfetivo(proc))}
        </p>
      </button>
      {onToggleFav && (
        <button onClick={onToggleFav} className="p-1">
          <Star
            className={`w-3.5 h-3.5 ${fav ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#C9BBA9]'}`}
          />
        </button>
      )}
    </div>
  )
}
