import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, PatientRecord } from '@/services/patients'
import { Users, Plus, Search, ChevronRight, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { onlyDigits } from '@/components/patients/PatientFormDialog'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'

export default function Pacientes() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadPatients = useCallback(async () => {
    try {
      const list = await getPatients()
      setPatients(list)
    } catch {
      // erro silencioso: a listagem simplesmente fica vazia
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const term = searchTerm.trim().toLowerCase()
  const digits = onlyDigits(searchTerm)
  const filtered = patients.filter((p) => {
    if (!term) return true
    const byName = p.name?.toLowerCase().includes(term)
    const byCpf = digits && p.cpf && onlyDigits(p.cpf).includes(digits)
    const byPhone = digits && p.phone && onlyDigits(p.phone).includes(digits)
    return !!(byName || byCpf || byPhone)
  })

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
          className="btn-terracotta-gold text-xs font-semibold w-full sm:w-auto"
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
              placeholder="Buscar por nome, CPF ou telefone..."
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
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-[#C66B4D] shrink-0">
                    <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                      {pat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-[#2D1B14] truncate">{pat.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6B4F42] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#C66B4D]" /> {pat.phone}
                      </span>
                      {pat.cpf && <span className="hidden sm:inline">CPF: {pat.cpf}</span>}
                      {pat.email && (
                        <span className="hidden md:flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#D4AF37]" /> {pat.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#C66B4D] font-medium hidden sm:inline">
                    Ver Ficha
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
          {loaded && filtered.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-[#D4AF37]/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#2D1B14]">
                {searchTerm
                  ? 'Nenhum paciente encontrado para a busca.'
                  : 'Nenhum paciente cadastrado ainda.'}
              </p>
              <p className="text-xs text-[#6B4F42] mt-1 mb-4">
                {searchTerm
                  ? 'Tente buscar por outro nome, CPF ou telefone.'
                  : 'Cadastre o primeiro paciente para começar.'}
              </p>
              <Button className="btn-terracotta-gold text-xs" onClick={() => setOpenModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo Paciente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAB visível em telas pequenas, onde o header rola para fora da tela */}
      <button
        type="button"
        aria-label="Novo Paciente"
        onClick={() => setOpenModal(true)}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#C66B4D] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      <PatientFormDialog open={openModal} onOpenChange={setOpenModal} onSaved={loadPatients} />
    </div>
  )
}
