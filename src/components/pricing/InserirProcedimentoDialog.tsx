import { useMemo, useState } from 'react'
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
import { createProcedure, ProcedureRecord } from '@/services/procedures'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { SPECIALTIES, FAMILY_SUGGESTIONS } from '@/lib/pricing-engine'
import { toast } from '@/hooks/use-toast'
import { Plus, Loader2 } from 'lucide-react'

/**
 * INSERIR PROCEDIMENTO (planilha inteligente) — cadastro rápido de um NOVO
 * procedimento no MESMO catálogo da coleção procedures (nenhuma tabela nova):
 * nome, especialidade, família, duração e preço inicial. Sem preço informado o
 * registro nasce como "pendente de preço" (valor em aberto, price=0) — nunca um
 * chute — e INATIVO para não poluir a cascata do planejamento até ter preço.
 * Ao salvar, o registro entra imediatamente na lista local (sem recarregar).
 */

interface Props {
  open: boolean
  custoMinuto: number
  proceduresExistentes: ProcedureRecord[]
  onOpenChange: (open: boolean) => void
  onCreated: (proc: ProcedureRecord) => void
}

export function InserirProcedimentoDialog({
  open,
  custoMinuto,
  proceduresExistentes,
  onOpenChange,
  onCreated,
}: Props) {
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [familia, setFamilia] = useState('')
  const [minutos, setMinutos] = useState('')
  const [preco, setPreco] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const reset = () => {
    setNome('')
    setEspecialidade('')
    setFamilia('')
    setMinutos('')
    setPreco('')
    setErrors({})
  }

  const fechar = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  const especialidades = useMemo(() => {
    const usadas = Array.from(
      new Set(
        [
          ...(SPECIALTIES as readonly string[]),
          ...proceduresExistentes.map((p) => p.specialty),
        ].filter(Boolean) as string[],
      ),
    )
    return usadas.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [proceduresExistentes])

  const familias = useMemo(() => {
    const base = Array.from(
      new Set(
        [
          ...(especialidade ? FAMILY_SUGGESTIONS[especialidade] || [] : []),
          ...Object.values(FAMILY_SUGGESTIONS).flat(),
          ...proceduresExistentes
            .filter((p) => !especialidade || p.specialty === especialidade)
            .map((p) => p.family),
        ].filter(Boolean) as string[],
      ),
    )
    return base.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [especialidade, proceduresExistentes])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      setErrors({ name: 'Informe o nome do procedimento' })
      return
    }
    setErrors({})
    setSaving(true)
    const precoNum = Number(preco.replace(',', '.')) || 0
    const semPreco = preco.trim() === '' || precoNum <= 0
    try {
      const rec = await createProcedure({
        name: nome.trim(),
        specialty: especialidade || undefined,
        family: familia || undefined,
        duration_minutes: Number(minutos) || 0,
        price: semPreco ? 0 : precoNum,
        category: 'dentista',
        import_status: semPreco ? 'pendente_preco' : 'manual',
        active: !semPreco,
        external_code: '',
      })
      toast({
        title: 'Procedimento inserido!',
        description: semPreco
          ? `${rec.name} entrou na tabela como pendente de preço — preencha na coluna Preço.`
          : `${rec.name} inserido com preço de ${precoNum.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}.`,
      })
      reset()
      onOpenChange(false)
      onCreated(rec)
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao inserir procedimento', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const minutosNum = Number(minutos) || 0
  const custoHoraPrev = Math.round(custoMinuto * minutosNum * 100) / 100

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-md bg-white border-[#EDE3D8] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#C66B4D]" /> Inserir procedimento
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Cadastra no catálogo compartilhado — aparece já na precificação e no "Adicionar
            procedimento" dos planejamentos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Faceta em resina composta"
              className="bg-[#FFFDF9] border-[#EDE3D8]"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Especialidade</Label>
              <select
                value={especialidade}
                onChange={(e) => {
                  setEspecialidade(e.target.value)
                  setFamilia('')
                }}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                <option value="">—</option>
                {especialidades.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Família</Label>
              <select
                value={familia}
                onChange={(e) => setFamilia(e.target.value)}
                className="w-full h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
              >
                <option value="">—</option>
                {familias.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Duração (min)</Label>
              <Input
                type="number"
                min={0}
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                placeholder="0"
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Preço inicial (R$)</Label>
              <Input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Em aberto"
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-[#FAF6F0] rounded-lg p-2.5 border border-[#EDE3D8]">
            {preco.trim() !== '' && Number(preco.replace(',', '.')) > 0 ? (
              <Badge className="bg-[#C66B4D] text-white text-[10px]">
                Preço oficial:{' '}
                {Number(preco.replace(',', '.')).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                Nasce pendente de preço
              </Badge>
            )}
            {minutosNum > 0 && (
              <span className="text-[10px] text-[#6B4F42]">
                Custo de hora clínica:{' '}
                {custoHoraPrev.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}{' '}
                ({minutosNum} min ×{' '}
                {custoMinuto.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
                /min)
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-terracotta-gold" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {saving ? 'Salvando…' : 'Inserir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
