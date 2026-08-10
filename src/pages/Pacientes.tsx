import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, createPatient, PatientRecord } from '@/services/patients'
import { Users, Plus, Search, ChevronRight, Phone, Mail, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'

export default function Pacientes() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [openModal, setOpenModal] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [address, setAddress] = useState('')

  const loadPatients = async () => {
    const list = await getPatients()
    setPatients(list)
  }

  useEffect(() => {
    loadPatients()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPatient({ name, email, phone, cpf, address })
      toast({ title: 'Paciente cadastrado!', description: 'Disponível em todo o sistema.' })
      setOpenModal(false)
      setName('')
      setEmail('')
      setPhone('')
      setCpf('')
      setAddress('')
      loadPatients()
    } catch (_) {
      toast({ title: 'Erro ao cadastrar paciente', variant: 'destructive' })
    }
  }

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm)) ||
      (p.phone && p.phone.includes(searchTerm)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">Base de Pacientes</h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Prontuários, arquivos, planejamentos virtuais e histórico.
          </p>
        </div>
        <Button
          className="btn-terracotta-gold text-xs font-semibold"
          onClick={() => setOpenModal(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Novo Paciente
        </Button>
      </div>

      <Card className="card-warm">
        <CardHeader className="border-b border-[#EDE3D8] pb-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="divide-y divide-[#EDE3D8]">
            {filtered.map((pat) => (
              <div
                key={pat.id}
                onClick={() => navigate(`/pacientes/${pat.id}`)}
                className="py-4 flex items-center justify-between hover:bg-[#FAF0EB]/60 px-3 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-[#C66B4D]">
                    <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                      {pat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-[#2D1B14]">{pat.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#6B4F42] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#C66B4D]" /> {pat.phone}
                      </span>
                      {pat.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#D4AF37]" /> {pat.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#C66B4D] font-medium hidden sm:inline">
                    Ver Prontuário
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Novo Cadastro de Paciente
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Insira os dados cadastrais principais.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Maria das Dores"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Telefone/WhatsApp *</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="(11) 99999-8888"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CPF</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Endereço Residencial</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, cidade"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE3D8]">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-terracotta-gold">
                Salvar Paciente
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
