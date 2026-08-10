import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getProfessionals,
  createProfessional,
  deleteProfessional,
  ProfessionalRecord,
} from '@/services/professionals'
import { getFinancialTransactions } from '@/services/financial'
import { Plus, Trash2, UserCog, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'

export default function Equipe() {
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [name, setName] = useState(''),
    [specialty, setSpecialty] = useState(''),
    [commission, setCommission] = useState('')

  const loadData = async () => {
    setProfessionals(await getProfessionals())
    setTransactions(await getFinancialTransactions())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('professionals', () => loadData())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProfessional({ name, specialty, commission_rate: parseFloat(commission) || 0 })
      toast({ title: 'Profissional cadastrado!' })
      setOpenModal(false)
      setName('')
      setSpecialty('')
      setCommission('')
      loadData()
    } catch {
      toast({ title: 'Erro ao cadastrar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProfessional(id)
      toast({ title: 'Profissional removido' })
      loadData()
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  const getProduction = (profId: string) => {
    return transactions
      .filter(
        (t) => t.professional === profId && t.transaction_type === 'receita' && t.status === 'pago',
      )
      .reduce((s, t) => s + (t.amount || 0), 0)
  }

  const getCommission = (profId: string, rate: number) => {
    const prod = getProduction(profId)
    return prod * (rate / 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
            Equipe & Profissionais
          </h2>
          <p className="text-xs text-[#6B4F42] mt-1">Gestão de equipe, comissões e produção.</p>
        </div>
        <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Novo Profissional
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals.map((prof) => (
          <Card key={prof.id} className="card-warm">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-[#C66B4D]">
                    <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                      {prof.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-[#2D1B14]">{prof.name}</p>
                    <p className="text-[11px] text-[#6B4F42]">{prof.specialty || '—'}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => handleDelete(prof.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EDE3D8]">
                <div>
                  <p className="text-[10px] text-[#6B4F42] uppercase">Produção</p>
                  <p className="text-sm font-bold text-[#2D1B14]">
                    R$ {getProduction(prof.id).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B4F42] uppercase">
                    Comissão ({prof.commission_rate || 0}%)
                  </p>
                  <p className="text-sm font-bold text-[#D4AF37]">
                    R$ {getCommission(prof.id, prof.commission_rate || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">Novo Profissional</DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Cadastre um membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs font-semibold">Especialidade</Label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Odontologia, Estética..."
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Taxa de Comissão (%)</Label>
              <Input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
