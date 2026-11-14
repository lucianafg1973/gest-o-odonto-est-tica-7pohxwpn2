import { useEffect, useState } from 'react'
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
import type { Tratamento, ItemStatus } from '@/lib/plan-types'
import { STATUS_ITEM, STATUS_LABEL } from '@/lib/plan-types'
import { FACE_LABEL } from '@/lib/tooth-data'
import { formatCurrency } from '@/lib/price-calculation'

/**
 * Diálogo de um item de tratamento — modo EDITAR (todos os campos: nome,
 * código, dente, faces, profissional, valor, quantidade, data, status,
 * observações e flag "incluído no preço global") ou modo CONCLUIR (registro da
 * execução: data, evolução, materiais e intercorrências — alimentam a
 * evolução clínica do prontuário).
 */

const FACES = ['O', 'V', 'L', 'M', 'D', 'C']

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  tratamento: Tratamento | null
  modo: 'editar' | 'concluir'
  professionals: { id: string; name: string }[]
  onSave: (t: Tratamento) => void
}

export function TratamentoDialog({
  open,
  onOpenChange,
  tratamento,
  modo,
  professionals,
  onSave,
}: Props) {
  const [r, setR] = useState<Tratamento | null>(tratamento)
  useEffect(() => {
    setR(tratamento ? { ...tratamento } : null)
  }, [tratamento])

  if (!r) return null
  const set = (patch: Partial<Tratamento>) => setR({ ...r, ...patch })
  const concluir = modo === 'concluir'

  const salvar = () => {
    if (concluir) {
      onSave({
        ...r,
        status: 'executado',
        dataExecucao: new Date().toISOString().slice(0, 10),
      })
    } else {
      onSave(r)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            {concluir ? `Concluir — ${r.procedureName}` : `Editar tratamento — ${r.procedureName}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            {concluir
              ? 'Registra a execução real: gera evolução clínica no Prontuário e preserva o histórico.'
              : 'Registro individual — vários tratamentos do mesmo dente coexistem sem se sobrescrever.'}
          </DialogDescription>
        </DialogHeader>

        {concluir ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data da execução</Label>
              <Input
                type="date"
                value={r.dataExecucao || new Date().toISOString().slice(0, 10)}
                onChange={(e) => set({ dataExecucao: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Evolução / descrição do realizado</Label>
              <Input
                value={r.evolucao || ''}
                onChange={(e) => set({ evolucao: e.target.value })}
                placeholder="Ex.: endodontia completada, obturação satisfatória…"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Materiais utilizados</Label>
              <Input
                value={r.materiais || ''}
                onChange={(e) => set({ materiais: e.target.value })}
                placeholder="Ex.: broca 1090, resina Z350,Anestesia…"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Intercorrências / observações</Label>
              <Input
                value={r.observacoes || ''}
                onChange={(e) => set({ observacoes: e.target.value })}
                placeholder="Opcional"
                className="text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Procedimento</Label>
                <Input
                  value={r.procedureName}
                  onChange={(e) => set({ procedureName: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Código</Label>
                <Input
                  value={r.procedureCode || ''}
                  onChange={(e) => set({ procedureCode: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dente (FDI)</Label>
                <Input
                  value={r.tooth}
                  onChange={(e) => set({ tooth: e.target.value, region: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Profissional executor</Label>
                <Select
                  value={r.professionalId || undefined}
                  onValueChange={(v) =>
                    set({
                      professionalId: v,
                      professionalName: professionals.find((p) => p.id === v)?.name || '',
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-white text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Faces</Label>
              <div className="flex flex-wrap gap-1">
                {FACES.map((f) => {
                  const ativo = (r.faces || []).includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      title={FACE_LABEL[f] || f}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                        ativo
                          ? 'bg-[#C66B4D] text-white border-[#C66B4D]'
                          : 'bg-white text-[#6B4F42] border-[#EDE3D8]'
                      }`}
                      onClick={() =>
                        set({
                          faces: ativo
                            ? (r.faces || []).filter((x) => x !== f)
                            : [...(r.faces || []), f],
                        })
                      }
                    >
                      {f}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Valor unitário (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={r.price}
                  onChange={(e) => set({ price: Number(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={r.quantity || 1}
                  onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data do planejamento</Label>
                <Input
                  type="date"
                  value={r.dataPlanejamento}
                  onChange={(e) => set({ dataPlanejamento: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={r.status} onValueChange={(v) => set({ status: v as ItemStatus })}>
                  <SelectTrigger className="w-full bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ITEM.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-[11px] text-[#2D1B14] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!r.incluidoNoGlobal}
                    onChange={(e) => set({ incluidoNoGlobal: e.target.checked })}
                    className="accent-[#C66B4D]"
                  />
                  Já incluído no preço global de um protocolo (não somar no orçamento)
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observações clínicas</Label>
              <Input
                value={r.observacoes || ''}
                onChange={(e) => set({ observacoes: e.target.value })}
                className="text-xs"
              />
            </div>
            <p className="text-[11px] text-[#6B4F42]">
              Subtotal do item: {formatCurrency((r.price || 0) * (r.quantity || 1))}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" className="btn-terracotta-gold text-xs" onClick={salvar}>
            {concluir ? 'Concluir e registrar evolução' : 'Salvar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
