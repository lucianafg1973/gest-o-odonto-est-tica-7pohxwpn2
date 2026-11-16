import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  registerMovement,
  getMovementsByItem,
  InventoryItemRecord,
  InventoryMovementRecord,
} from '@/services/inventory'
import { formatCurrency } from '@/lib/price-calculation'

const EXPIRY_DAYS = 30

const emptyForm = {
  name: '',
  manufacturer: '',
  type: '',
  presentation: '',
  control_unit: 'unidade',
  batch: '',
  expiry_date: '',
  supplier: '',
  unit_cost: '',
  min_stock: '',
  storage_location: '',
}

type FormValues = typeof emptyForm

/** dias restantes até a validade (null quando não informada) */
export function diasAteVencimento(expiry?: string): number | null {
  if (!expiry) return null
  const d = new Date(expiry.length === 10 ? expiry + 'T00:00:00' : expiry)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function statusEstoque(item: InventoryItemRecord) {
  const q = Number(item.quantity) || 0
  const min = Number(item.min_stock) || 0
  const dias = diasAteVencimento(item.expiry_date)
  return {
    q,
    min,
    dias,
    abaixoMinimo: min > 0 && q < min,
    vencido: dias !== null && dias < 0,
    venceEmBreve: dias !== null && dias >= 0 && dias <= EXPIRY_DAYS,
  }
}

export default function Estoque() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'alertas'>('todos')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItemRecord | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [movItem, setMovItem] = useState<InventoryItemRecord | null>(null)
  const [movType, setMovType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada')
  const [movQty, setMovQty] = useState('')
  const [movBatch, setMovBatch] = useState('')
  const [movNote, setMovNote] = useState('')
  const [movSaving, setMovSaving] = useState(false)

  const [histItem, setHistItem] = useState<InventoryItemRecord | null>(null)
  const [hist, setHist] = useState<InventoryMovementRecord[]>([])
  const [histLoading, setHistLoading] = useState(false)

  const reload = useCallback(async () => {
    try {
      setItems(await getInventoryItems())
    } catch {
      toast({ title: 'Erro ao carregar o estoque', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return items.filter((i) => {
      if (q) {
        const hay = `${i.name} ${i.manufacturer || ''} ${i.type || ''} ${i.batch || ''} ${
          i.storage_location || ''
        }`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filtro === 'alertas') {
        const s = statusEstoque(i)
        return s.abaixoMinimo || s.vencido || s.venceEmBreve
      }
      return true
    })
  }, [items, busca, filtro])

  const abrirNovo = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const abrirEditar = (item: InventoryItemRecord) => {
    setEditing(item)
    setForm({
      name: item.name || '',
      manufacturer: item.manufacturer || '',
      type: item.type || '',
      presentation: item.presentation || '',
      control_unit: item.control_unit || 'unidade',
      batch: item.batch || '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost != null ? String(item.unit_cost) : '',
      min_stock: item.min_stock != null ? String(item.min_stock) : '',
      storage_location: item.storage_location || '',
    })
    setFormOpen(true)
  }

  const salvarForm = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Informe o nome do material', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const data: Partial<InventoryItemRecord> = {
        name: form.name.trim(),
        manufacturer: form.manufacturer,
        type: form.type,
        presentation: form.presentation,
        control_unit: form.control_unit,
        batch: form.batch,
        expiry_date: form.expiry_date || '',
        supplier: form.supplier,
        unit_cost: form.unit_cost === '' ? 0 : Number(form.unit_cost.replace(',', '.')),
        min_stock: form.min_stock === '' ? 0 : Number(form.min_stock.replace(',', '.')),
        storage_location: form.storage_location,
        active: true,
      }
      if (editing) {
        await updateInventoryItem(editing.id, data)
        toast({ title: 'Material atualizado!' })
      } else {
        await createInventoryItem({ ...data, quantity: 0 })
        toast({
          title: 'Material cadastrado!',
          description: 'Use Entrada para registrar o estoque inicial.',
        })
      }
      setFormOpen(false)
      reload()
    } catch {
      toast({ title: 'Erro ao salvar o material', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const abrirMovimento = (item: InventoryItemRecord, type: 'entrada' | 'saida' | 'ajuste') => {
    setMovItem(item)
    setMovType(type)
    setMovQty('')
    setMovBatch(item.batch || '')
    setMovNote('')
  }

  const registrarMov = async () => {
    if (!movItem) return
    const qtd = Number(movQty.replace(',', '.'))
    if (!qtd || qtd <= 0) {
      toast({ title: 'Informe uma quantidade válida', variant: 'destructive' })
      return
    }
    const atual = Number(movItem.quantity) || 0
    let delta = 0
    if (movType === 'entrada') delta = qtd
    else if (movType === 'saida') delta = -qtd
    else delta = qtd - atual // ajuste: quantidade informada é o NOVO total
    const novoTotal = atual + delta
    if (novoTotal < 0) {
      toast({
        title: 'Quantidade insuficiente em estoque',
        description: `Disponível: ${atual} ${movItem.control_unit || 'un'}.`,
        variant: 'destructive',
      })
      return
    }
    setMovSaving(true)
    try {
      await registerMovement(
        movItem.id,
        {
          type: movType,
          quantity: qtd,
          batch: movBatch,
          responsible: user?.id,
          responsible_name: user?.name || '',
          note: movNote,
        },
        delta,
        atual,
      )
      toast({ title: 'Movimento registrado!' })
      setMovItem(null)
      reload()
    } catch {
      toast({ title: 'Erro ao registrar o movimento', variant: 'destructive' })
    } finally {
      setMovSaving(false)
    }
  }

  const abrirHistorico = async (item: InventoryItemRecord) => {
    setHistItem(item)
    setHistLoading(true)
    try {
      setHist(await getMovementsByItem(item.id))
    } catch {
      setHist([])
    } finally {
      setHistLoading(false)
    }
  }

  const estornar = async (mov: InventoryMovementRecord) => {
    if (!histItem) return
    const atual = Number(histItem.quantity) || 0
    let delta = 0
    if (mov.type === 'entrada') delta = -Number(mov.quantity)
    else if (mov.type === 'saida') delta = Number(mov.quantity)
    else delta = 0 // ajuste tem estorno trivial (quantidade volta ao valor anterior? não há registro)
    if (mov.type === 'ajuste') {
      toast({
        title: 'Estorno de ajuste',
        description: 'Registre um novo ajuste com a quantidade correta.',
        variant: 'destructive',
      })
      return
    }
    const novoTotal = atual + delta
    if (novoTotal < 0) {
      toast({ title: 'Estoque não pode ficar negativo', variant: 'destructive' })
      return
    }
    try {
      await registerMovement(
        histItem.id,
        {
          type: 'estorno',
          quantity: Number(mov.quantity),
          batch: mov.batch,
          responsible: user?.id,
          responsible_name: user?.name || '',
          note: `Estorno do movimento ${mov.type} de ${mov.quantity}`,
          reverses: mov.id,
        },
        delta,
        atual,
      )
      toast({ title: 'Movimento estornado!' })
      abrirHistorico(histItem)
      reload()
    } catch {
      toast({ title: 'Erro ao estornar', variant: 'destructive' })
    }
  }

  const movLabel = {
    entrada: 'Entrada de material',
    saida: 'Saída de material',
    ajuste: 'Ajuste de inventário',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-title text-2xl font-bold text-[#2D1B14]">Estoque</h1>
          <p className="text-sm text-[#6B4F42]">
            Controle de materiais: entradas, saídas, lotes e validade.
          </p>
        </div>
        <Button className="btn-terracotta-gold" onClick={abrirNovo}>
          <Plus className="w-4 h-4 mr-1" /> Novo material
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B4F42]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, fabricante, lote…"
            className="pl-9"
          />
        </div>
        <Button
          variant={filtro === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('todos')}
        >
          Todos
        </Button>
        <Button
          variant={filtro === 'alertas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('alertas')}
        >
          <AlertTriangle className="w-4 h-4 mr-1" /> Com alerta
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B4F42]">Carregando materiais…</p>
      ) : filtered.length === 0 ? (
        <Card className="card-warm">
          <CardContent className="pt-6 pb-6 text-center text-sm text-[#6B4F42]">
            <Package className="w-8 h-8 mx-auto mb-2 text-[#C66B4D]/50" />
            {items.length === 0
              ? 'Nenhum material cadastrado ainda. Clique em "Novo material" para começar.'
              : 'Nenhum material encontrado com esse filtro.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const s = statusEstoque(item)
            return (
              <Card key={item.id} className="card-warm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#2D1B14]">{item.name}</h3>
                        {s.abaixoMinimo && (
                          <Badge className="bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Abaixo do mínimo
                          </Badge>
                        )}
                        {s.vencido && (
                          <Badge className="bg-red-100 text-red-700 border border-red-200">
                            Vencido
                          </Badge>
                        )}
                        {s.venceEmBreve && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1" /> Vence em {s.dias}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#6B4F42] mt-0.5">
                        {[item.manufacturer, item.type, item.presentation, item.supplier]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="text-[11px] text-[#6B4F42] mt-1">
                        {item.batch && <>Lote: {item.batch} · </>}
                        {item.expiry_date && <>Validade: {item.expiry_date.slice(0, 10)} · </>}
                        {item.storage_location && <>Local: {item.storage_location} · </>}
                        Custo un.: {formatCurrency(Number(item.unit_cost) || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#2D1B14]">
                        {s.q}
                        <span className="text-xs font-medium text-[#6B4F42] ml-1">
                          {item.control_unit || 'un'}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#6B4F42]">mínimo: {s.min}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMovimento(item, 'entrada')}
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Entrada
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMovimento(item, 'saida')}
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" /> Saída
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMovimento(item, 'ajuste')}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Ajuste
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => abrirHistorico(item)}>
                      <History className="w-3.5 h-3.5 mr-1" /> Histórico
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => abrirEditar(item)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Cadastro/edição de material */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg bg-white border-[#EDE3D8] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              {editing ? 'Editar material' : 'Novo material'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Dados cadastrais do material de uso clínico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome comercial *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Resina composta Z350"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fabricante</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  placeholder="3M"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="Ex.: Resina"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Apresentação</Label>
                <Input
                  value={form.presentation}
                  onChange={(e) => setForm({ ...form, presentation: e.target.value })}
                  placeholder="Ex.: Seringa 4g"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unidade de controle</Label>
                <Input
                  value={form.control_unit}
                  onChange={(e) => setForm({ ...form, control_unit: e.target.value })}
                  placeholder="un, cx, ml, g…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lote</Label>
                <Input
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Validade</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Custo unitário (R$)</Label>
                <Input
                  value={form.unit_cost}
                  onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estoque mínimo</Label>
                <Input
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fornecedor</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Local de armazenamento</Label>
                <Input
                  value={form.storage_location}
                  onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                  placeholder="Ex.: Armário 2 / Gaveta A"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button className="btn-terracotta-gold" onClick={salvarForm} disabled={saving}>
                {editing ? 'Salvar alterações' : 'Cadastrar material'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movimento de estoque */}
      <Dialog open={!!movItem} onOpenChange={(o) => !o && setMovItem(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              {movItem ? movLabel[movType] : ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              {movItem && (
                <>
                  {movItem.name} — atual: <strong>{Number(movItem.quantity) || 0}</strong>{' '}
                  {movItem.control_unit || 'un'}
                  {movType === 'ajuste' && ' · informe o NOVO total contado'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {movType === 'ajuste' ? 'Novo total' : 'Quantidade'} *
              </Label>
              <Input
                value={movQty}
                onChange={(e) => setMovQty(e.target.value)}
                inputMode="decimal"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lote</Label>
              <Input value={movBatch} onChange={(e) => setMovBatch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observação</Label>
              <Input
                value={movNote}
                onChange={(e) => setMovNote(e.target.value)}
                placeholder="Ex.: compra NF 1234 / uso clínico do dia"
              />
            </div>
            <p className="text-[11px] text-[#6B4F42]">
              Responsável: {user?.name || user?.email || '—'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMovItem(null)}>
                Cancelar
              </Button>
              <Button className="btn-terracotta-gold" onClick={registrarMov} disabled={movSaving}>
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Histórico de movimentos */}
      <Dialog open={!!histItem} onOpenChange={(o) => !o && setHistItem(null)}>
        <DialogContent className="max-w-lg bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Histórico — {histItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Movimentos registrados. O estorno cria um novo movimento — nada é apagado.
            </DialogDescription>
          </DialogHeader>
          {histLoading ? (
            <p className="text-sm text-[#6B4F42] py-4">Carregando…</p>
          ) : hist.length === 0 ? (
            <p className="text-sm text-[#6B4F42] py-4">Nenhum movimento registrado ainda.</p>
          ) : (
            <div className="space-y-2 py-2">
              {hist.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-2 border border-[#EDE3D8] rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2D1B14] capitalize">
                      {m.type === 'estorno' ? 'Estorno' : m.type}
                      {m.type !== 'ajuste' && (
                        <span className="font-normal text-[#6B4F42]">
                          {' '}
                          {m.type === 'entrada' ? '+' : m.type === 'saida' ? '−' : '±'}
                          {m.quantity} {histItem?.control_unit || 'un'}
                        </span>
                      )}
                      {m.type === 'ajuste' && (
                        <span className="font-normal text-[#6B4F42]"> → {m.quantity}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#6B4F42]">
                      {new Date(m.created).toLocaleString('pt-BR')}
                      {m.responsible_name && <> · {m.responsible_name}</>}
                      {m.batch && <> · lote {m.batch}</>}
                      {m.note && <> · {m.note}</>}
                    </p>
                  </div>
                  {m.type !== 'estorno' && (
                    <Button size="sm" variant="ghost" onClick={() => estornar(m)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Estornar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
