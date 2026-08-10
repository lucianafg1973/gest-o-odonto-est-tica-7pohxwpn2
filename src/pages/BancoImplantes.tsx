import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getImplants, ImplantRecord } from '@/services/implants'
import { Search, Boxes, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function BancoImplantes() {
  const [implants, setImplants] = useState<ImplantRecord[]>([])
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const loadData = async () => {
    setImplants(await getImplants())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('implants', () => loadData())

  const brands = [...new Set(implants.map((i) => i.marca))]
  const types = [...new Set(implants.map((i) => i.tipo).filter(Boolean))]

  const filtered = implants.filter((i) => {
    const matchSearch =
      !search ||
      i.marca.toLowerCase().includes(search.toLowerCase()) ||
      i.modelo.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'all' || i.marca === brandFilter
    const matchType = typeFilter === 'all' || i.tipo === typeFilter
    return matchSearch && matchBrand && matchType
  })

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <h2 className="font-serif-title text-xl font-bold text-[#2D1B14] flex items-center gap-2">
          <Boxes className="w-5 h-5 text-[#C66B4D]" /> Banco de Implantes
        </h2>
        <p className="text-xs text-[#6B4F42] mt-1">
          Catálogo de implantes dentários de marcas mundialmente reconhecidas.
        </p>
      </div>

      <Card className="card-warm">
        <CardContent className="pt-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <Input
              placeholder="Buscar por marca ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-44 bg-[#FFFDF9] border-[#EDE3D8]">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 bg-[#FFFDF9] border-[#EDE3D8]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((imp) => (
          <Card key={imp.id} className="card-warm">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2D1B14]">{imp.marca}</p>
                  <p className="text-xs text-[#6B4F42]">{imp.modelo}</p>
                </div>
                <Badge
                  variant={imp.category === 'implante' ? 'default' : 'secondary'}
                  className={
                    imp.category === 'implante'
                      ? 'bg-[#C66B4D] text-white'
                      : 'bg-[#D4AF37] text-[#2D1B14]'
                  }
                >
                  {imp.category}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EDE3D8]">
                {imp.tamanho && imp.tamanho > 0 && (
                  <div>
                    <p className="text-[10px] text-[#6B4F42] uppercase">Tamanho</p>
                    <p className="text-sm font-semibold text-[#2D1B14]">{imp.tamanho} mm</p>
                  </div>
                )}
                {imp.espessura && (
                  <div>
                    <p className="text-[10px] text-[#6B4F42] uppercase">Diâmetro</p>
                    <p className="text-sm font-semibold text-[#2D1B14]">{imp.espessura} mm</p>
                  </div>
                )}
              </div>
              {imp.tipo && (
                <p className="text-[11px] text-[#C66B4D] font-medium">Tipo: {imp.tipo}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-[10px] text-[#6B4F42] text-center">
        {filtered.length} implante(s) encontrado(s). Utilize o catálogo no Planejamento Virtual para
        sobrepor componentes em radiografias.
      </p>
    </div>
  )
}
