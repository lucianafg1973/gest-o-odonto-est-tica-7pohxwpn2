import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import { getClinicalHourConfig, ClinicalHourConfig } from '@/services/clinical-hour'
import { ClinicalHourCard } from '@/components/pricing/ClinicalHourCard'
import { ProcedurePriceDialog } from '@/components/pricing/ProcedurePriceDialog'
import { calculateClinicalHourPortion, formatCurrency } from '@/lib/price-calculation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Receipt, Pencil } from 'lucide-react'

const categoryColors: Record<string, string> = {
  dentista: 'bg-blue-100 text-blue-800',
  estetica: 'bg-purple-100 text-purple-800',
  harmonizacao: 'bg-pink-100 text-pink-800',
}

export default function TabelaPrecos() {
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [config, setConfig] = useState<ClinicalHourConfig | null>(null)
  const [editProc, setEditProc] = useState<ProcedureRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadData = async () => {
    setProcedures(await getProcedures())
    setConfig(await getClinicalHourConfig())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('procedures', () => loadData())
  useRealtime('clinical_hour_config', () => loadData())

  const hourValue = config?.clinical_hour_value || 0

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <h2 className="font-serif-title text-xl font-bold text-[#2D1B14] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#C66B4D]" /> Tabela de Preços
        </h2>
        <p className="text-xs text-[#6B4F42] mt-1">
          Gerencie os componentes de custo e o preço final de cada procedimento.
        </p>
      </div>

      <ClinicalHourCard config={config} onUpdate={loadData} />

      <Card className="card-warm">
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#EDE3D8]">
                  <TableHead className="text-[#6B4F42]">Procedimento</TableHead>
                  <TableHead className="text-[#6B4F42]">Categoria</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Duração</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Hora Clínica</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Material</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Laboratório</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Retrabalho</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Taxas</TableHead>
                  <TableHead className="text-[#6B4F42] text-right">Preço Final</TableHead>
                  <TableHead className="text-[#6B4F42] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map((proc) => {
                  const chp = calculateClinicalHourPortion(hourValue, proc.duration_minutes || 0)
                  const taxes =
                    (proc.card_fee_percent || 0) +
                    (proc.ir_percent || 0) +
                    (proc.sales_commission_percent || 0) +
                    (proc.executor_percent || 0)
                  return (
                    <TableRow key={proc.id} className="border-[#EDE3D8] hover:bg-[#FAF6F0]">
                      <TableCell className="font-medium text-[#2D1B14]">{proc.name}</TableCell>
                      <TableCell>
                        <Badge
                          className={categoryColors[proc.category] || 'bg-gray-100 text-gray-800'}
                          variant="secondary"
                        >
                          {proc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[#6B4F42]">
                        {proc.duration_minutes || 0} min
                      </TableCell>
                      <TableCell className="text-right text-[#C66B4D] font-medium">
                        {formatCurrency(chp)}
                      </TableCell>
                      <TableCell className="text-right text-[#6B4F42]">
                        {formatCurrency(proc.material_cost || 0)}
                      </TableCell>
                      <TableCell className="text-right text-[#6B4F42]">
                        {formatCurrency(proc.lab_price || 0)}
                      </TableCell>
                      <TableCell className="text-right text-[#6B4F42]">
                        {formatCurrency(proc.rework_cost || 0)}
                      </TableCell>
                      <TableCell className="text-right text-[#6B4F42]">
                        {taxes.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {proc.use_manual_price && (
                            <Badge className="bg-[#D4AF37] text-[#2D1B14]" variant="secondary">
                              Manual
                            </Badge>
                          )}
                          <span className="font-bold text-[#2D1B14]">
                            {formatCurrency(proc.price || 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-[#C66B4D]"
                          onClick={() => {
                            setEditProc(proc)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {procedures.length === 0 && (
            <p className="text-center text-sm text-[#6B4F42] py-8">
              Nenhum procedimento cadastrado.
            </p>
          )}
        </CardContent>
      </Card>

      <ProcedurePriceDialog
        procedure={editProc}
        clinicalHourValue={hourValue}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={loadData}
      />
    </div>
  )
}
