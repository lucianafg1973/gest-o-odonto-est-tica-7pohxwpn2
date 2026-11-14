import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Lock, Trash2, Info } from 'lucide-react'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { novoId } from '@/lib/payment-calc'
import type { Tratamento } from '@/lib/plan-types'

/**
 * Painel de Implantodontia e Protocolos sobre Implantes:
 * - implantes unitários/múltiplos com componentes (marcador, pilar, prótese),
 *   enxertos, seio maxilar, exodontias — um registro por dente/região;
 * - "Reabilitação Total — Protocolo sobre Implantes" por arcada, com
 *   precificação em DUAS modalidades: global (itens já incluídos não são
 *   somados de novo) ou individual (soma dos itens).
 */

interface Props {
  procedures: ProcedureRecord[]
  tratamentos: Tratamento[]
  onChange: (ts: Tratamento[]) => void
  professionals: { id: string; name: string }[]
  locked?: boolean
}

const TIPOS_PROTESE = [
  'Fixa (protocolo)',
  'Provisória (acrílico)',
  'Removível (overdenture)',
  'Mucossuportada',
  'Implantossuportada',
]
const MATERIAIS = [
  'Acrílico sobre titânio',
  'Zircônia',
  'Metalocerâmica',
  'Resina milled',
  'Malha titânio + acrílico',
]

export function ImplantPanel({
  procedures,
  tratamentos,
  onChange,
  professionals,
  locked = false,
}: Props) {
  const [tab, setTab] = useState<'implante' | 'protocolo'>('implante')

  // --- estado do formulário de implante ---
  const [impProcedimento, setImpProcedimento] = useState('')
  const [impDentes, setImpDentes] = useState('')
  const [impRegiao, setImpRegiao] = useState('')
  const [impQtde, setImpQtde] = useState(1)
  const [impProf, setImpProf] = useState('')
  const [impComponentes, setImpComponentes] = useState('')
  const [impExodontias, setImpExodontias] = useState('')
  const [impEnxerto, setImpEnxerto] = useState('')

  // --- estado do protocolo ---
  const [proArcada, setProArcada] = useState<'superior' | 'inferior' | 'ambas'>('superior')
  const [proProcedimento, setProProcedimento] = useState('')
  const [proModalidade, setProModalidade] = useState<'global' | 'individual'>('global')
  const [proValor, setProValor] = useState('')
  const [proQtdeImplantes, setProQtdeImplantes] = useState(4)
  const [proTipoProtese, setProTipoProtese] = useState(TIPOS_PROTESE[0])
  const [proMaterial, setProMaterial] = useState(MATERIAIS[0])
  const [proLab, setProLab] = useState('')
  const [proRegiao, setProRegiao] = useState('')
  const [proExodontias, setProExodontias] = useState('')
  const [proEnxerto, setProEnxerto] = useState('')
  const [proComp, setProComp] = useState('')
  const [proProf, setProProf] = useState('')

  const procsImplante = procedures.filter(
    (p) => /implante/i.test(p.name) || /implante/i.test(p.category || ''),
  )
  const procsProtocolo = procedures.filter((p) => /protocolo|reabilita/i.test(p.name))
  const procsComplementares = procedures.filter((p) => !/protocolo|reabilita/i.test(p.name))

  const profName = (id: string) => professionals.find((p) => p.id === id)?.name || ''

  const addImplante = () => {
    if (locked) return
    const proc =
      procedures.find((p) => p.id === impProcedimento) || procsImplante[0] || procedures[0]
    if (!proc) return
    const dentes = impDentes
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const targets: { tooth: string; region: string }[] = dentes.length
      ? dentes.map((d) => ({ tooth: d, region: '' }))
      : [{ tooth: '', region: impRegiao || 'Maxila (enxerto/seio)' }]
    const novos: Tratamento[] = targets.map((t) => ({
      id: novoId(),
      procedureId: proc.id,
      procedureName: proc.name,
      tooth: t.tooth,
      region: t.region,
      faces: [],
      price:
        proc.use_manual_price && proc.manual_price != null ? proc.manual_price : (proc.price ?? 0),
      quantity: 1,
      categoria: 'implante',
      professionalId: impProf,
      professionalName: profName(impProf),
      status: 'planejado',
      dataPlanejamento: new Date().toISOString().slice(0, 10),
      observacoes: '',
      componentes: impComponentes,
      exodontias: impExodontias,
      enxerto: impEnxerto,
    }))
    onChange([...tratamentos, ...novos])
    setImpDentes('')
    setImpRegiao('')
    setImpComponentes('')
    setImpExodontias('')
    setImpEnxerto('')
  }

  const addProtocolo = () => {
    if (locked) return
    const proc =
      procedures.find((p) => p.id === proProcedimento) || procsProtocolo[0] || procedures[0]
    if (!proc) return
    const valor = proValor !== '' ? Number(proValor) : 0
    const rotuloArcada =
      proArcada === 'superior'
        ? 'Arcada superior'
        : proArcada === 'inferior'
          ? 'Arcada inferior'
          : 'Arcadas (superior + inferior)'
    const novo: Tratamento = {
      id: novoId(),
      procedureId: proc.id,
      procedureName: `Reabilitação Total — Protocolo sobre Implantes (${rotuloArcada})`,
      tooth: '',
      region: proRegiao || rotuloArcada,
      faces: [],
      price: valor,
      quantity: 1,
      categoria: 'protocolo',
      professionalId: proProf,
      professionalName: profName(proProf),
      status: 'planejado',
      dataPlanejamento: new Date().toISOString().slice(0, 10),
      observacoes: '',
      arcada: proArcada,
      modalidadePreco: proModalidade,
      implantesCount: proQtdeImplantes,
      tipoProtese: proTipoProtese,
      materialProtese: proMaterial,
      laboratorio: proLab,
      exodontias: proExodontias,
      enxerto: proEnxerto,
      componentes: proComp,
      proteseProvisoria: true,
      proteseDefinitiva: true,
      // No global, os itens complementares listados ficam marcados como incluídos
      incluidoNoGlobal: false,
    }
    onChange([...tratamentos, novo])
    setProValor('')
    setProRegiao('')
    setProLab('')
    setProExodontias('')
    setProEnxerto('')
    setProComp('')
  }

  const protocolos = tratamentos.filter((t) => t.categoria === 'protocolo')
  const implantes = tratamentos.filter((t) => t.categoria === 'implante')

  const removeItem = (id: string) => onChange(tratamentos.filter((t) => t.id !== id))

  const updatePrice = (id: string, price: number) =>
    onChange(tratamentos.map((t) => (t.id === id ? { ...t, price } : t)))

  const porArcada = (a: string) => protocolos.filter((t) => (t.arcada || 'ambas') === a)
  const somaArcada = (a: string) =>
    Math.round(
      porArcada(a)
        .filter((t) => t.status !== 'cancelado')
        .reduce((s, t) => s + t.price * (t.quantity || 1), 0) * 100,
    ) / 100

  return (
    <Card className="card-warm p-4 space-y-4">
      <div>
        <CardHeader className="p-0 pb-1">
          <CardTitle className="font-serif-title text-base font-bold text-[#2D1B14]">
            Implantodontia &amp; Protocolos sobre Implantes
          </CardTitle>
        </CardHeader>
        <p className="text-[11px] text-[#6B4F42] mt-1">
          Implantes unitários/múltiplos com componentes e enxertos; protocolo total por arcada com
          preço global (itens incluídos não são somados de novo) ou individualizado.
        </p>
      </div>

      {locked && (
        <Badge className="bg-[#2E8B57] text-white text-[10px] gap-1">
          <Lock className="w-3 h-3" /> Aprovado — somente leitura
        </Badge>
      )}

      {!locked && (
        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            variant={tab === 'implante' ? 'default' : 'outline'}
            className={tab === 'implante' ? 'btn-terracotta-gold text-xs' : 'text-xs'}
            onClick={() => setTab('implante')}
          >
            Implantes
          </Button>
          <Button
            size="sm"
            type="button"
            variant={tab === 'protocolo' ? 'default' : 'outline'}
            className={tab === 'protocolo' ? 'btn-terracotta-gold text-xs' : 'text-xs'}
            onClick={() => setTab('protocolo')}
          >
            Protocolo sobre Implantes
          </Button>
        </div>
      )}

      {/* ---- Formulário de implantes ---- */}
      {!locked && tab === 'implante' && (
        <div className="bg-white border border-[#EDE3D8] rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Procedimento de implante</Label>
              <Select
                value={impProcedimento || (procsImplante[0]?.id ?? '')}
                onValueChange={setImpProcedimento}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(procsImplante.length ? procsImplante : procedures).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} —{' '}
                      {formatCurrency(
                        p.use_manual_price && p.manual_price != null
                          ? p.manual_price
                          : (p.price ?? 0),
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Dente(s) FDI (ex.: 14, 24)</Label>
              <Input
                value={impDentes}
                onChange={(e) => setImpDentes(e.target.value)}
                placeholder="14, 24"
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">ou Região</Label>
              <Input
                value={impRegiao}
                onChange={(e) => setImpRegiao(e.target.value)}
                placeholder="Maxila posterior direita"
                className="text-xs"
                disabled={locked}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Nº de implantes</Label>
              <Input
                type="number"
                min={1}
                value={impQtde}
                onChange={(e) => setImpQtde(Number(e.target.value) || 1)}
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Profissional</Label>
              <Select value={impProf} onValueChange={setImpProf}>
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Exodontias associadas</Label>
              <Input
                value={impExodontias}
                onChange={(e) => setImpExodontias(e.target.value)}
                placeholder="14, 15"
                className="text-xs"
                disabled={locked}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Enxerto / seio maxilar / ROG</Label>
              <Input
                value={impEnxerto}
                onChange={(e) => setImpEnxerto(e.target.value)}
                placeholder="Levantamento de seio + enxerto"
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Componentes protéticos</Label>
              <Input
                value={impComponentes}
                onChange={(e) => setImpComponentes(e.target.value)}
                placeholder="Cicatrizador, mini-pilar, provisória"
                className="text-xs"
                disabled={locked}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              type="button"
              className="btn-terracotta-gold text-xs"
              onClick={addImplante}
              disabled={locked || procedures.length === 0}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Registrar implante
            </Button>
          </div>
        </div>
      )}

      {/* ---- Formulário de protocolo ---- */}
      {!locked && tab === 'protocolo' && (
        <div className="bg-white border border-[#EDE3D8] rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Arcada</Label>
              <Select
                value={proArcada}
                onValueChange={(v) => setProArcada(v as 'superior' | 'inferior' | 'ambas')}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superior" className="text-xs">
                    Superior
                  </SelectItem>
                  <SelectItem value="inferior" className="text-xs">
                    Inferior
                  </SelectItem>
                  <SelectItem value="ambas" className="text-xs">
                    Ambas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Procedimento base</Label>
              <Select
                value={proProcedimento || (procsProtocolo[0]?.id ?? procedures[0]?.id ?? '')}
                onValueChange={setProProcedimento}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(procsProtocolo.length ? procsProtocolo : procedures).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Modalidade de preço</Label>
              <Select
                value={proModalidade}
                onValueChange={(v) => setProModalidade(v as 'global' | 'individual')}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global" className="text-xs">
                    Preço global (inclui itens)
                  </SelectItem>
                  <SelectItem value="individual" className="text-xs">
                    Preço individualizado (soma itens)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Nº de implantes</Label>
              <Input
                type="number"
                min={1}
                value={proQtdeImplantes}
                onChange={(e) => setProQtdeImplantes(Number(e.target.value) || 1)}
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">
                {proModalidade === 'global' ? 'Valor global (R$)' : 'Valor de referência (R$)'}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={proValor}
                onChange={(e) => setProValor(e.target.value)}
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Profissional</Label>
              <Select value={proProf} onValueChange={setProProf}>
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Tipo de prótese</Label>
              <Select value={proTipoProtese} onValueChange={setProTipoProtese}>
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PROTESE.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Material</Label>
              <Select value={proMaterial} onValueChange={setProMaterial}>
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAIS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Laboratório</Label>
              <Input
                value={proLab}
                onChange={(e) => setProLab(e.target.value)}
                className="text-xs"
                disabled={locked}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Exodontias</Label>
              <Input
                value={proExodontias}
                onChange={(e) => setProExodontias(e.target.value)}
                placeholder="ex.: todos os dentes remanescentes"
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Enxertos / seio</Label>
              <Input
                value={proEnxerto}
                onChange={(e) => setProEnxerto(e.target.value)}
                className="text-xs"
                disabled={locked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Componentes inclusos</Label>
              <Input
                value={proComp}
                onChange={(e) => setProComp(e.target.value)}
                placeholder="minipilar, cicatrizador, provisória…"
                className="text-xs"
                disabled={locked}
              />
            </div>
          </div>
          {proModalidade === 'global' && (
            <p className="text-[10px] text-[#8B6914] bg-[#FBF3DC] border border-[#D4AF37] rounded-lg p-2 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              No preço GLOBAL, marque abaixo os itens já incluídos: eles ficam fora da soma do
              orçamento (o valor global já os cobre) e não geram cobrança repetida.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              type="button"
              className="btn-terracotta-gold text-xs"
              onClick={addProtocolo}
              disabled={locked || procedures.length === 0}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Registrar protocolo
            </Button>
          </div>
        </div>
      )}

      {/* ---- Lista de protocolos ---- */}
      {protocolos.length > 0 && (
        <div className="space-y-2 border-t border-[#EDE3D8] pt-3">
          <p className="text-[10px] font-bold uppercase text-[#6B4F42]">Protocolos registrados</p>
          {(['superior', 'inferior', 'ambas'] as const).map((a) =>
            porArcada(a).length ? (
              <div key={a} className="rounded-xl border border-[#EDE3D8] bg-white p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D1B14] capitalize">Arcada {a}</span>
                  <span className="text-xs font-bold text-[#C66B4D]">
                    {formatCurrency(somaArcada(a))}
                  </span>
                </div>
                {porArcada(a).map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 text-[11px] bg-[#FAF6F0] rounded-lg p-2"
                  >
                    <Badge className="bg-[#2D1B14] text-white text-[9px]">Protocolo</Badge>
                    <span className="flex-1 min-w-0 truncate text-[#2D1B14]">
                      {t.procedureName}
                    </span>
                    <span className="text-[10px] text-[#6B4F42]">
                      {t.implantesCount} impl. · {t.tipoProtese} · {t.materialProtese}
                    </span>
                    <Badge
                      className={
                        t.modalidadePreco === 'global'
                          ? 'bg-[#2E8B57] text-white text-[9px]'
                          : 'bg-[#FBF3DC] text-[#8B6914] text-[9px]'
                      }
                    >
                      {t.modalidadePreco === 'global' ? 'Global' : 'Individual'}
                    </Badge>
                    {!locked && (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={t.price}
                        onChange={(e) => updatePrice(t.id, Number(e.target.value) || 0)}
                        className="w-24 h-7 text-xs bg-white"
                        title="Valor do protocolo"
                      />
                    )}
                    {locked ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                        onClick={() => removeItem(t.id)}
                        title="Remover protocolo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : null,
          )}
          <p className="text-[10px] text-[#6B4F42]">
            Subtotal por arcada e total geral aparecem no painel de Orçamento à direita.
          </p>
        </div>
      )}

      {/* ---- Lista de implantes ---- */}
      {implantes.length > 0 && (
        <div className="space-y-2 border-t border-[#EDE3D8] pt-3">
          <p className="text-[10px] font-bold uppercase text-[#6B4F42]">Implantes registrados</p>
          {implantes.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-2 text-[11px] bg-[#FAF6F0] rounded-lg p-2 border border-[#EDE3D8]"
            >
              <Badge className="bg-[#2E8B57] text-white text-[9px]">Implante</Badge>
              <span className="font-semibold text-[#2D1B14]">{t.tooth || t.region}</span>
              <span className="flex-1 min-w-0 truncate text-[#2D1B14]">{t.procedureName}</span>
              {t.exodontias && (
                <span className="text-[10px] text-[#6B4F42]">Exo.: {t.exodontias}</span>
              )}
              {t.enxerto && (
                <span className="text-[10px] text-[#6B4F42]">Enxerto: {t.enxerto}</span>
              )}
              {t.componentes && (
                <span className="text-[10px] text-[#6B4F42]">Comp.: {t.componentes}</span>
              )}
              <Input
                type="number"
                min={0}
                step="0.01"
                value={t.price}
                disabled={locked}
                onChange={(e) => updatePrice(t.id, Number(e.target.value) || 0)}
                className="w-24 h-7 text-xs bg-white"
              />
              {!locked && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                  onClick={() => removeItem(t.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
