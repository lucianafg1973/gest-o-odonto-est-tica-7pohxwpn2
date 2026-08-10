import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getLeads, createLead, updateLead, LeadRecord } from '@/services/leads'
import { getProfessionals, ProfessionalRecord } from '@/services/professionals'
import { Plus, Phone, MessageCircle, Clock, Filter } from 'lucide-react'
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

const statusColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  avaliacao: 'bg-amber-100 text-amber-800',
  tratamento: 'bg-emerald-100 text-emerald-800',
  recuperado: 'bg-blue-100 text-blue-800',
  reativado: 'bg-purple-100 text-purple-800',
}
const sourceLabels: Record<string, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  anuncios: 'Anúncios',
  indicacoes: 'Indicações',
  manual: 'Manual',
}

export default function Leads() {
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [email, setEmail] = useState('')
  const [source, setSource] = useState('manual'),
    [profId, setProfId] = useState(''),
    [notes, setNotes] = useState('')

  const loadData = async () => {
    setLeads(await getLeads())
    setProfessionals(await getProfessionals())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('leads', () => loadData())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createLead({
        name,
        phone,
        email,
        source: source as any,
        status: 'lead',
        professional: profId || undefined,
        notes,
      })
      toast({ title: 'Lead cadastrado!' })
      setOpenModal(false)
      setName('')
      setPhone('')
      setEmail('')
      setNotes('')
      loadData()
    } catch {
      toast({ title: 'Erro ao cadastrar', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (id: string, status: any) => {
    await updateLead(id, { status })
    toast({ title: `Status alterado para ${status}` })
    loadData()
  }

  const openWhatsApp = (lead: LeadRecord) => {
    const phone = lead.phone.replace(/\D/g, '')
    window.open(
      `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${lead.name}! Entramos em contato da Clínica LFG.`)}`,
      '_blank',
    )
  }

  const filtered = statusFilter === 'all' ? leads : leads.filter((l) => l.status === statusFilter)
  const funnelStages = ['lead', 'avaliacao', 'tratamento', 'recuperado', 'reativado']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
            LFG FLOW — Captação & Vendas
          </h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Gestão de leads, funil de vendas e follow-up.
          </p>
        </div>
        <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Novo Lead
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {funnelStages.map((stage) => {
          const count = leads.filter((l) => l.status === stage).length
          return (
            <Card key={stage} className="card-warm p-3 text-center">
              <p className="text-2xl font-bold text-[#C66B4D]">{count}</p>
              <p className="text-[10px] text-[#6B4F42] uppercase font-semibold mt-1">{stage}</p>
            </Card>
          )
        })}
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-4 flex flex-row items-center justify-between">
          <CardTitle className="font-serif-title text-base text-[#2D1B14]">
            Lista de Leads
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {funnelStages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 bg-[#FFFDF9] border border-[#EDE3D8] rounded-xl hover:border-[#C66B4D]/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D1B14]">{lead.name}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#6B4F42] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#C66B4D]" />
                        {lead.phone}
                      </span>
                      <span className="text-[#D4AF37] font-medium">
                        {sourceLabels[lead.source] || lead.source}
                      </span>
                      {lead.follow_up_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lead.follow_up_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                    <SelectTrigger className="w-32 text-[11px] h-7 bg-white border-[#EDE3D8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {funnelStages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-emerald-600 border-emerald-200"
                    onClick={() => openWhatsApp(lead)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">Novo Lead</DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Cadastro de captação de leads.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs font-semibold">Telefone/WhatsApp *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Origem</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Profissional</Label>
                <Select value={profId} onValueChange={setProfId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir..." />
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
            <div>
              <Label className="text-xs font-semibold">Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Salvar Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
