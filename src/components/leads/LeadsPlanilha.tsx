import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getLeads, LeadRecord } from '@/services/leads'
import { getProfessionals, ProfessionalRecord } from '@/services/professionals'
import {
  getLeadEvaluations,
  createLeadEvaluation,
  updateLeadEvaluation,
  deleteLeadEvaluation,
  LeadEvaluationRecord,
  fechadoC,
  planC,
  abertoC,
  totaisPlanilha,
  brl,
  dataBR,
} from '@/services/lead_evaluations'
import { Plus, Trash2, TrendingDown, TrendingUp, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

/**
 * Planilha de acompanhamento de avaliações/fechamentos da aba Leads.
 * Cada linha = uma avaliação (collection lead_evaluations). Feedback e data de
 * nova contatação são editáveis inline e salvam direto no banco (blur/enter).
 * "Valor não realizado" é derivado: valor do tratamento − valor fechado.
 */
export default function LeadsPlanilha() {
  const [rows, setRows] = useState<LeadEvaluationRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [leadId, setLeadId] = useState(''),
    [evalDate, setEvalDate] = useState(''),
    [planValue, setPlanValue] = useState(''),
    [closedValue, setClosedValue] = useState(''),
    [profId, setProfId] = useState(''),
    [feedback, setFeedback] = useState('')

  const loadData = async () => {
    setRows(await getLeadEvaluations())
    setLeads(await getLeads())
    setProfessionals(await getProfessionals())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('lead_evaluations', () => loadData())

  const nomeLead = (r: LeadEvaluationRecord) =>
    r.expand?.lead?.name || r.expand?.patient?.name || '—'

  const nomeProf = (r: LeadEvaluationRecord) => r.expand?.professional?.name || '—'

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId) {
      toast({ title: 'Escolha o cliente (lead) da linha', variant: 'destructive' })
      return
    }
    try {
      await createLeadEvaluation({
        lead: leadId,
        professional: profId || undefined,
        evaluation_date: evalDate || undefined,
        plan_value: parseFloat(planValue) || 0,
        closed_value: parseFloat(closedValue) || 0,
        feedback: feedback || undefined,
      })
      toast({ title: 'Avaliação adicionada à planilha!' })
      setOpenModal(false)
      setLeadId('')
      setEvalDate('')
      setPlanValue('')
      setClosedValue('')
      setProfId('')
      setFeedback('')
      loadData()
    } catch {
      toast({ title: 'Erro ao salvar avaliação', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadEvaluation(id)
      toast({ title: 'Linha removida da planilha' })
      loadData()
    } catch {
      toast({ title: 'Erro ao remover linha', variant: 'destructive' })
    }
  }

  /** Salvamento inline com debounce curto (blur/enter já dispara). */
  const saveInline = async (id: string, data: Partial<LeadEvaluationRecord>) => {
    try {
      await updateLeadEvaluation(id, data)
      loadData()
    } catch {
      toast({ title: 'Erro ao salvar alteração', variant: 'destructive' })
    }
  }

  const totais = totaisPlanilha(rows)

  const th =
    'px-2 py-2 text-left text-[10px] font-bold uppercase text-[#6B4F42] border-b border-[#EDE3D8] whitespace-nowrap'
  const td = 'px-2 py-1.5 border-b border-[#EDE3D8]/70 text-xs text-[#2D1B14] align-middle'
  const inputCls =
    'w-full bg-transparent border border-transparent hover:border-[#EDE3D8] focus:border-[#C66B4D] rounded px-1.5 py-1 text-xs focus:bg-white outline-none transition-colors'

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#C66B4D]" />
            Planilha de Avaliações & Fechamentos
          </CardTitle>
          <p className="text-xs text-[#6B4F42] mt-1">
            Acompanhamento de orçamentos: o que foi proposto, o que fechou e o follow-up.
          </p>
        </div>
        <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova linha
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Somatórios */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="card-warm border-t-4 border-t-emerald-500">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-lg font-bold text-[#2D1B14] leading-tight">
                  {brl(totais.fechadoCents)}
                </p>
                <p className="text-[10px] text-[#6B4F42] uppercase font-semibold">
                  Valor fechado total
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-warm border-t-4 border-t-[#C66B4D]">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#C66B4D]" />
              <div>
                <p className="text-lg font-bold text-[#2D1B14] leading-tight">
                  {brl(totais.abertoCents)}
                </p>
                <p className="text-[10px] text-[#6B4F42] uppercase font-semibold">
                  Valor em aberto total
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-warm border-t-4 border-t-[#D4AF37] sm:col-span-1 col-span-2">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#D4AF37]" />
              <div>
                <p className="text-lg font-bold text-[#2D1B14] leading-tight">
                  {brl(totais.planCents)}
                </p>
                <p className="text-[10px] text-[#6B4F42] uppercase font-semibold">
                  Valor total de tratamentos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Planilha */}
        <div className="overflow-x-auto rounded-xl border border-[#EDE3D8] bg-[#FFFDF9]">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-[#FBF3DC]/60">
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>Data avaliação</th>
                <th className={th}>Profissional</th>
                <th className={th}>Valor tratamento</th>
                <th className={th}>Valor fechado</th>
                <th className={th}>Valor não realizado</th>
                <th className={th + ' min-w-[220px]'}>Feedback</th>
                <th className={th}>Nova contatação</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-xs text-[#6B4F42] py-8">
                    Nenhuma avaliação registrada. Use “Nova linha” para começar a planilha.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#FBF3DC]/40 transition-colors">
                  <td className={td + ' font-semibold'}>{nomeLead(r)}</td>
                  <td className={td}>
                    <Input
                      type="date"
                      className={inputCls}
                      defaultValue={r.evaluation_date?.slice(0, 10) || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (r.evaluation_date?.slice(0, 10) || ''))
                          saveInline(r.id, { evaluation_date: e.target.value || undefined })
                      }}
                    />
                  </td>
                  <td className={td}>
                    <Select
                      value={r.professional || '__none'}
                      onValueChange={(v) =>
                        saveInline(r.id, { professional: v === '__none' ? undefined : v })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs bg-white border-[#EDE3D8] w-full min-w-[130px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={td}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputCls + ' w-28 text-right'}
                      defaultValue={r.plan_value ?? ''}
                      onBlur={(e) => {
                        if (String(r.plan_value ?? '') !== e.target.value)
                          saveInline(r.id, { plan_value: parseFloat(e.target.value) || 0 })
                      }}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputCls + ' w-28 text-right text-emerald-700'}
                      defaultValue={r.closed_value ?? ''}
                      onBlur={(e) => {
                        if (String(r.closed_value ?? '') !== e.target.value)
                          saveInline(r.id, { closed_value: parseFloat(e.target.value) || 0 })
                      }}
                    />
                  </td>
                  <td className={td + ' text-right text-[#C66B4D] font-semibold'}>
                    {brl(abertoC(r))}
                  </td>
                  <td className={td}>
                    <Input
                      className={inputCls + ' min-w-[220px]'}
                      placeholder="O que o cliente falou..."
                      defaultValue={r.feedback || ''}
                      onBlur={(e) => {
                        if ((r.feedback || '') !== e.target.value)
                          saveInline(r.id, { feedback: e.target.value })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      type="date"
                      className={inputCls}
                      defaultValue={r.next_contact_date?.slice(0, 10) || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (r.next_contact_date?.slice(0, 10) || ''))
                          saveInline(r.id, { next_contact_date: e.target.value || undefined })
                      }}
                    />
                  </td>
                  <td className={td}>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-rose-600 border-rose-200"
                      onClick={() => handleDelete(r.id)}
                      title="Remover linha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Nova linha */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Nova linha — avaliação
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Escolha o cliente e registre a avaliação. Os campos podem ser editados depois direto
              na planilha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Cliente (lead) *</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Data da avaliação</Label>
                <Input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Profissional</Label>
                <Select value={profId} onValueChange={setProfId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Valor do tratamento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planValue}
                  onChange={(e) => setPlanValue(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Valor fechado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closedValue}
                  onChange={(e) => setClosedValue(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Feedback</Label>
              <Input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="O que o cliente falou..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Salvar linha
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
