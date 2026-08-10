import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getProposals, createProposal, updateProposal, ProposalRecord } from '@/services/proposals'
import { getLeads, LeadRecord } from '@/services/leads'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import { Plus, TrendingUp, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
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

const statusConfig: Record<string, { color: string; icon: any }> = {
  enviada: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  pendente: { color: 'bg-amber-100 text-amber-800', icon: Clock },
  aceita: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  recusada: { color: 'bg-rose-100 text-rose-800', icon: XCircle },
}

export default function Vendas() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [leadId, setLeadId] = useState(''),
    [procedureId, setProcedureId] = useState(''),
    [value, setValue] = useState(''),
    [notes, setNotes] = useState('')

  const loadData = async () => {
    setProposals(await getProposals())
    setLeads(await getLeads())
    setProcedures(await getProcedures())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('proposals', () => loadData())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProposal({
        lead: leadId || undefined,
        procedure: procedureId || undefined,
        value: parseFloat(value) || 0,
        status: 'enviada',
        sent_date: new Date().toISOString().slice(0, 10),
        notes,
      })
      toast({ title: 'Proposta enviada!' })
      setOpenModal(false)
      setLeadId('')
      setProcedureId('')
      setValue('')
      setNotes('')
      loadData()
    } catch {
      toast({ title: 'Erro ao criar proposta', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (id: string, status: any) => {
    await updateProposal(id, { status })
    toast({ title: `Proposta ${status}` })
    loadData()
  }

  const totalValue = proposals.reduce((s, p) => s + (p.value || 0), 0)
  const acceptedValue = proposals
    .filter((p) => p.status === 'aceita')
    .reduce((s, p) => s + (p.value || 0), 0)
  const pendingCount = proposals.filter(
    (p) => p.status === 'pendente' || p.status === 'enviada',
  ).length
  const conversionRate =
    proposals.length > 0
      ? Math.round((proposals.filter((p) => p.status === 'aceita').length / proposals.length) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">Vendas & Propostas</h2>
          <p className="text-xs text-[#6B4F42] mt-1">Funil de vendas, propostas e conversão.</p>
        </div>
        <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Proposta
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="card-warm border-t-4 border-t-[#C66B4D]">
          <CardContent className="pt-4">
            <DollarSign className="w-4 h-4 text-[#C66B4D] mb-1" />
            <p className="text-xl font-bold text-[#2D1B14]">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] text-[#6B4F42] uppercase">Valor Total</p>
          </CardContent>
        </Card>
        <Card className="card-warm border-t-4 border-t-emerald-500">
          <CardContent className="pt-4">
            <CheckCircle className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-xl font-bold text-[#2D1B14]">
              R$ {acceptedValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] text-[#6B4F42] uppercase">Aceitas</p>
          </CardContent>
        </Card>
        <Card className="card-warm border-t-4 border-t-amber-500">
          <CardContent className="pt-4">
            <Clock className="w-4 h-4 text-amber-600 mb-1" />
            <p className="text-xl font-bold text-[#2D1B14]">{pendingCount}</p>
            <p className="text-[10px] text-[#6B4F42] uppercase">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="card-warm border-t-4 border-t-[#D4AF37]">
          <CardContent className="pt-4">
            <TrendingUp className="w-4 h-4 text-[#D4AF37] mb-1" />
            <p className="text-xl font-bold text-[#2D1B14]">{conversionRate}%</p>
            <p className="text-[10px] text-[#6B4F42] uppercase">Conversão</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-3">
          <CardTitle className="font-serif-title text-base text-[#2D1B14]">Propostas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {proposals.map((p) => {
              const cfg = statusConfig[p.status] || statusConfig.enviada
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#2D1B14]">
                      {p.expand?.lead?.name || p.expand?.patient?.name || 'Lead'}
                    </p>
                    <p className="text-[11px] text-[#6B4F42]">
                      {p.notes} — R$ {(p.value || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${cfg.color}`}
                    >
                      {p.status}
                    </span>
                    <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v)}>
                      <SelectTrigger className="w-28 text-[11px] h-7 bg-white border-[#EDE3D8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aceita">Aceita</SelectItem>
                        <SelectItem value="recusada">Recusada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">Nova Proposta</DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Registre uma proposta enviada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Lead</Label>
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
            <div>
              <Label className="text-xs font-semibold">Procedimento</Label>
              <Select value={procedureId} onValueChange={setProcedureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (R$ {p.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Valor (R$)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Enviar Proposta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
