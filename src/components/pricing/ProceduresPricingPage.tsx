import { useMemo, useRef, useState } from 'react'
import { ProcedureRecord, createProcedure, updateProcedureWithHistory } from '@/services/procedures'
import { ProcedurePriceDialog } from '@/components/pricing/ProcedurePriceDialog'
import CsvImporter from '@/components/pricing/CsvImporter'
import DiscountSimulator from '@/components/pricing/DiscountSimulator'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/price-calculation'
import {
  precificar,
  precoEfetivo,
  ProcPricingConfig,
  DEFAULT_PRICING_CONFIG,
  FAMILY_SUGGESTIONS,
  SPECIALTIES,
} from '@/lib/pricing-engine'
import { CsvRow, publicarCsv, parseCsv } from '@/lib/csv-import'
import { Upload, Search, Pencil, RefreshCw, Download, Copy, Power } from 'lucide-react'

/**
 * TABELA DE PROCEDIMENTOS E PREÇOS + PRECIFICAÇÃO INTELIGENTE.
 * Uma única área para tabela e precificação (não há segunda tabela
 * "desejada"). Importação por CSV acionada por botão, com prévia.
 * CRUD sem exclusão definitiva: catálogo se gerencia por DUPLICAR e
 * INATIVAR/REATIVAR (inativo some da seleção no planejamento, mas
 * continua visível aqui, com marcação).
 */
interface Props {
  procedures: ProcedureRecord[]
  horaClinica: number
  onReload: () => void
}

type Precificado = { proc: ProcedureRecord; p: ReturnType<typeof precificar> }

export default function ProceduresPricingPage({ procedures, horaClinica, onReload }: Props) {
  const { user: profile } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busca, setBusca] = useState('')
  const [especialidadeFiltro, setEspecialidadeFiltro] = useState('')
  const [editando, setEditando] = useState<ProcedureRecord | null>(null)
  const [simulando, setSimulando] = useState<Precificado | null>(null)
  const [rows, setRows] = useState<CsvRow[] | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [cfg, setCfg] = useState<ProcPricingConfig>(DEFAULT_PRICING_CONFIG)
  const [mostrarPendentes, setMostrarPendentes] = useState(false)

  const precificados = useMemo<Precificado[]>(
    () => procedures.map((proc) => ({ proc, p: precificar(proc, horaClinica, cfg) })),
    [procedures, horaClinica, cfg],
  )

  const abaixoMargem = precificados.filter((x) => x.p.abaixoMargemMinima && !x.p.pendente)
  const pendentesPreco = precificados.filter(
    (x) => x.proc.price === 0 || x.proc.import_status === 'pendente_preco',
  )

  const filtrados = precificados.filter(({ proc }) => {
    if (especialidadeFiltro && proc.specialty !== especialidadeFiltro) return false
    if (mostrarPendentes && !(proc.price === 0 || proc.import_status === 'pendente_preco'))
      return false
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (
      proc.name?.toLowerCase().includes(q) ||
      proc.external_code?.toLowerCase().includes(q) ||
      proc.family?.toLowerCase().includes(q) ||
      proc.specialty?.toLowerCase().includes(q)
    )
  })

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      try {
        setRows(parseCsvLocal(text))
      } catch {
        toast({ title: 'Não foi possível ler o CSV', variant: 'destructive' })
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const publicar = async () => {
    if (!rows) return
    setPublicando(true)
    try {
      const res = await publicarCsv(rows, procedures)
      toast({
        title: 'Importação concluída!',
        description: `${res.criados} criados · ${res.atualizados} atualizados · ${res.pendentes} pendentes de preço`,
      })
      if (res.erros.length) {
        toast({
          title: `${res.erros.length} linha(s) com erro`,
          description: res.erros.slice(0, 3).join(' | '),
          variant: 'destructive',
        })
      }
      setRows(null)
      onReload()
    } finally {
      setPublicando(false)
    }
  }

  const exportarCsv = () => {
    const header =
      'id_importacao;especialidade;familia;nome;preco_oficial;tempo_min;material;laboratorio;executor;ativo'
    const lines = procedures.map((p) =>
      [
        p.external_code || p.id,
        p.specialty || '',
        p.family || '',
        p.name,
        p.price ?? 0,
        p.duration_minutes ?? 0,
        p.material_cost ?? 0,
        p.lab_price ?? 0,
        p.executor_cost ?? 0,
        p.active === false ? 'inativo' : 'ativo',
      ].join(';'),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'procedimentos-lfg.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const duplicar = async (proc: ProcedureRecord) => {
    const novoCodigo = gerarCodigoDuplicado(proc, procedures)
    try {
      const {
        id: _id,
        history: _history,
        import_batch: _import_batch,
        import_status: _import_status,
        ...copiaveis
      } = proc
      const copia = await createProcedure({
        ...copiaveis,
        external_code: novoCodigo,
        active: false,
        import_status: 'manual',
        use_manual_price: proc.use_manual_price ?? false,
        manual_price: proc.manual_price ?? 0,
      })
      toast({
        title: 'Procedimento duplicado!',
        description: `${proc.name} → código ${novoCodigo}. Edite os dados e ative quando terminar.`,
      })
      onReload()
      setEditando(copia)
    } catch {
      toast({ title: 'Erro ao duplicar', variant: 'destructive' })
    }
  }

  const alternarAtivo = async (proc: ProcedureRecord) => {
    const novoEstado = proc.active === false
    try {
      await updateProcedureWithHistory(
        proc,
        { active: novoEstado },
        profile?.name || profile?.email || 'usuário',
      )
      toast({
        title: novoEstado ? 'Procedimento reativado!' : 'Procedimento inativado!',
        description: novoEstado
          ? `${proc.name} voltou à seleção no planejamento.`
          : `${proc.name} saiu da seleção no planejamento, mas segue listado aqui.`,
      })
      onReload()
    } catch {
      toast({
        title: novoEstado ? 'Erro ao reativar' : 'Erro ao inativar',
        variant: 'destructive',
      })
    }
  }

  /** Botão Inativar/Reativar pelo estado atual do registro. */
  const procEstaAtivo = (proc: ProcedureRecord) => proc.active !== false

  const salvarPreco = async (proc: ProcedureRecord, price: number) => {
    try {
      await updateProcedureWithHistory(
        proc,
        { price, active: price > 0 },
        profile?.name || profile?.email || 'usuário',
      )
      toast({
        title: 'Preço oficial salvo!',
        description: `${proc.name}: ${formatCurrency(price)}`,
      })
      onReload()
    } catch {
      toast({ title: 'Erro ao salvar preço', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuração de margens/descontos */}
      <Card className="card-warm">
        <CardContent className="pt-5">
          <h3 className="font-serif-title text-base font-bold text-[#2D1B14] mb-3">
            Parâmetros de precificação
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {(
              [
                ['margemDesejada', 'Margem desejada %'],
                ['margemMinima', 'Margem mínima %'],
                ['descontoPlanejado', 'Desconto planejado %'],
                ['descontoMaximo', 'Desconto máximo %'],
                ['impostosPercent', 'Impostos %'],
                ['taxaPagamentoPercent', 'Taxa pagamento %'],
                ['comissaoPercent', 'Comissão %'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-[10px] font-semibold text-[#6B4F42]">{label}</Label>
                <Input
                  type="number"
                  value={cfg[key]}
                  onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-[#FFFDF9] border-[#EDE3D8]"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#6B4F42] mt-2">
            Hora clínica aplicada: {formatCurrency(horaClinica)} (Formação da Hora Clínica).
            Percentuais incidem sobre receita e não duplicam custos fixos já embutidos na hora.
          </p>
        </CardContent>
      </Card>

      {/* Alertas */}
      {abaixoMargem.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-bold text-red-700">
            ⚠ {abaixoMargem.length} procedimento(s) abaixo da margem mínima ({cfg.margemMinima}%):
          </p>
          <p className="text-[11px] text-red-600 mt-1">
            {abaixoMargem
              .slice(0, 8)
              .map((x) => `${x.proc.name} (${x.p.margemAtual.toFixed(0)}%)`)
              .join(' · ')}
          </p>
        </div>
      )}

      {/* Barra de ações */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button className="btn-terracotta-gold text-xs" onClick={() => fileRef.current?.click()}>
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Importar CSV
        </Button>
        <Button
          variant="outline"
          className="text-xs border-[#C66B4D] text-[#C66B4D]"
          onClick={exportarCsv}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B4F42]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código, família…"
            className="pl-8 bg-[#FFFDF9] border-[#EDE3D8] text-xs"
          />
        </div>
        <select
          value={especialidadeFiltro}
          onChange={(e) => setEspecialidadeFiltro(e.target.value)}
          className="h-9 rounded-md border border-[#EDE3D8] bg-[#FFFDF9] px-2 text-xs"
        >
          <option value="">Todas as especialidades</option>
          {especialidadesUnicas(precificados).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[#6B4F42]">
          <Checkbox checked={mostrarPendentes} onCheckedChange={(v) => setMostrarPendentes(!!v)} />
          Só pendentes de preço ({pendentesPreco.length})
        </label>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onReload}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tabela de Procedimentos e Preços */}
      <Card className="card-warm">
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#6B4F42] border-b border-[#EDE3D8]">
                  <th className="py-2 pr-2">Código</th>
                  <th className="py-2 pr-2">Especialidade / Família</th>
                  <th className="py-2 pr-2">Nome</th>
                  <th className="py-2 pr-2 text-right">Tempo</th>
                  <th className="py-2 pr-2 text-right">Custos diretos</th>
                  <th className="py-2 pr-2 text-right">Preço oficial</th>
                  <th className="py-2 pr-2 text-right">Margem</th>
                  <th className="py-2 pr-2 text-right">Mínimo</th>
                  <th className="py-2 pr-2 text-right">Recomendado</th>
                  <th className="py-2 pr-2 text-right">Desc. máx.</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map(({ proc, p }) => {
                  const ativo = procEstaAtivo(proc)
                  return (
                    <tr
                      key={proc.id}
                      className={`border-b border-[#F5EEE6] hover:bg-[#FAF6F0] ${ativo ? '' : 'opacity-50'}`}
                    >
                      <td className="py-2 pr-2 font-mono text-[10px] text-[#6B4F42]">
                        {proc.external_code || '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <p className="text-[11px] font-semibold text-[#2D1B14]">
                          {proc.specialty || '—'}
                        </p>
                        <p className="text-[10px] text-[#6B4F42]">{proc.family || '—'}</p>
                      </td>
                      <td className="py-2 pr-2 text-[11px]">
                        <span className="inline-flex items-center gap-1.5">
                          {proc.name}
                          {!ativo && (
                            <Badge className="bg-[#6B4F42] text-white text-[9px]">inativo</Badge>
                          )}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right text-[11px]">
                        {proc.duration_minutes || '—'} min
                      </td>
                      <td className="py-2 pr-2 text-right text-[11px]">
                        {p.custosDiretos > 0 ? formatCurrency(p.custosDiretos) : '—'}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {p.pendente && proc.price === 0 ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[9px]">pendente</Badge>
                        ) : (
                          <span className="font-bold text-[#C66B4D]">
                            {formatCurrency(proc.price ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {p.pendente ? (
                          <span className="text-[10px] text-[#6B4F42] italic">pendente</span>
                        ) : (
                          <span
                            className={
                              p.abaixoMargemMinima ? 'text-red-600 font-bold' : 'text-[#2D1B14]'
                            }
                          >
                            {p.margemAtual.toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right text-[11px] text-[#6B4F42]">
                        {p.pendente ? '—' : formatCurrency(p.precoMinimo)}
                      </td>
                      <td className="py-2 pr-2 text-right text-[11px] text-[#6B4F42]">
                        {p.pendente ? '—' : formatCurrency(p.precoRecomendado)}
                      </td>
                      <td className="py-2 pr-2 text-right text-[11px] text-[#6B4F42]">
                        {proc.max_discount_percent != null ? `${proc.max_discount_percent}%` : '—'}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          className="h-7 w-7 text-[#C66B4D]"
                          onClick={() => setEditando(proc)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Simular desconto"
                          className="h-7 w-7 text-[#6B4F42]"
                          onClick={() => setSimulando({ proc, p })}
                          disabled={p.pendente}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={`Duplicar ${proc.name}`}
                          className="h-7 w-7 text-[#6B4F42]"
                          onClick={() => duplicar(proc)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={ativo ? `Inativar ${proc.name}` : `Reativar ${proc.name}`}
                          className={`h-7 w-7 ${ativo ? 'text-amber-600' : 'text-green-700'}`}
                          onClick={() => alternarAtivo(proc)}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <p className="text-center text-[11px] text-[#6B4F42] py-6 italic">
                Nenhum procedimento. Use “Importar CSV” para popular a Tabela de Procedimentos e
                Preços.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prévia da importação */}
      {rows && (
        <CsvImporter
          rows={rows}
          onCancel={() => setRows(null)}
          onConfirm={publicar}
          publicando={publicando}
        />
      )}

      {/* Edição de preço */}
      {editando && (
        <ProcedurePriceDialog
          procedure={editando}
          clinicalHourValue={horaClinica}
          open={!!editando}
          onOpenChange={(o) => !o && setEditando(null)}
          onSaved={onReload}
        />
      )}

      {/* Simulador de desconto */}
      {simulando && (
        <DiscountSimulator precificado={simulando} cfg={cfg} onClose={() => setSimulando(null)} />
      )}
    </div>
  )
}

function especialidadesUnicas(list: Precificado[]): string[] {
  return Array.from(new Set(list.map((x) => x.proc.specialty).filter(Boolean) as string[])).sort()
}

function parseCsvLocal(text: string): CsvRow[] {
  return parseCsv(text).rows
}

/** Código da cópia: base-C2; se já existir, incrementa até livre (-C3, -C4…). */
function gerarCodigoDuplicado(proc: ProcedureRecord, todos: ProcedureRecord[]): string {
  const base = proc.external_code || ''
  if (!base) return ''
  const dupMatch = base.match(/-C(\d+)$/)
  const prefixo = dupMatch ? base.slice(0, -dupMatch[0].length) : base
  const existentes = new Set(todos.map((p) => p.external_code).filter((c): c is string => !!c))
  for (let n = dupMatch ? Number(dupMatch[1]) + 1 : 2; ; n++) {
    const candidato = `${prefixo}-C${n}`
    if (!existentes.has(candidato)) return candidato
  }
}
