import { useEffect, useMemo, useState } from 'react'
import { pb } from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Sparkles, Send, Check, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/price-calculation'
import { PatientRecord, getPatients } from '@/services/patients'
import { openWhatsApp } from '@/lib/whatsapp'
import { getProcedures, ProcedureRecord } from '@/services/procedures'

/**
 * Simulador de Campanha — criativo com IA (agente nativo Skip Cloud) e envio
 * de WhatsApp por paciente com revisão obrigatória e registro manual de envio.
 *
 * - IA: rota nativa /backend/v1/ai/campaign/creative (pb_hooks + agente nativo
 *   'criativo-campanhas') — produz apenas uma PROPOSTA editável; nada é
 *   publicado automaticamente.
 * - WhatsApp: texto montado por paciente, aberto para revisão; o registro
 *   "mensagem enviada" só existe após confirmação manual da usuária
 *   (coleção campaign_messages), com data e usuário.
 * - LGPD: só entram na lista pacientes com comm_pref marcando aceitação
 *   explícita de comunicações (ver aceitoComercial).
 */

interface CampaignConfig {
  id: string
  name: string
  description?: string
  discount_percent: number
  target_procedures: string[]
  start_date: string
  end_date: string
}

interface Props {
  campaigns: CampaignConfig[]
  onCreateCampaign: (data: Omit<CampaignConfig, 'id'>) => void
  onUpdateCampaign: (id: string, data: Partial<CampaignConfig>) => void
  onDeleteCampaign: (id: string) => void
}

interface PatientTarget {
  patient: PatientRecord
  proc: ProcedureRecord | null
  message: string
}

interface CampaignMessageRecord {
  id: string
  campaign: string
  patient: string
  message: string
  sent_at: string
  sent_by: string
}

const aceitoComercial = (p: PatientRecord): boolean => {
  const pref = (p as any).comm_pref
  if (!pref) return false
  const txt = String(pref).toLowerCase()
  return txt.includes('comercial') || txt.includes('promo') || txt.includes('tudo')
}

const primeiroNome = (p: PatientRecord) => (p.name || '').trim().split(/\s+/)[0] || 'cliente'

const dataBR = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split(' ')[0].split('-')
  return `${d}/${m}/${y}`
}

export function CampaignSimulator({
  campaigns,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
}: Props) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('10')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  )
  const [targetProcedures, setTargetProcedures] = useState<string[]>([])
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [sentMessages, setSentMessages] = useState<CampaignMessageRecord[]>([])

  const [criativoOpen, setCriativoOpen] = useState(false)
  const [criativoLoading, setCriativoLoading] = useState(false)
  const [criativoText, setCriativoText] = useState('')

  const [waOpen, setWaOpen] = useState(false)
  const [targets, setTargets] = useState<PatientTarget[]>([])
  const [waSearch, setWaSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [procs, pats, msgs] = await Promise.all([
          getProcedures(),
          getPatients(),
          pb.collection('campaign_messages').getFullList<CampaignMessageRecord>({
            sort: '-sent_at',
            filter: 'campaign != ""',
          }),
        ])
        setProcedures(procs)
        setPatients(pats)
        setSentMessages(msgs)
      } catch {
        /* silencioso: sem procedimentos/pacientes ainda */
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sentByPatient = useMemo(() => {
    const map: Record<string, CampaignMessageRecord> = {}
    sentMessages.forEach((m) => {
      if (!map[m.patient]) map[m.patient] = m // lista é desc por sent_at
    })
    return map
  }, [sentMessages])

  const elegiveis = useMemo(
    () => patients.filter((p) => aceitoComercial(p) && (p.phone || '').trim() !== ''),
    [patients],
  )
  const bloqueados = patients.length - elegiveis.length

  const alvo = useMemo(() => {
    if (targetProcedures.length === 0) return null
    const id = targetProcedures[0]
    return procedures.find((p) => p.id === id) ?? null
  }, [targetProcedures, procedures])

  const precoBase = alvo?.price ?? 0
  const precoPromo = precoBase * (1 - (parseFloat(discount) || 0) / 100)

  const resetCampanha = () => {
    setName('')
    setDescription('')
    setDiscount('10')
    setTargetProcedures([])
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  }

  const criarCampanha = () => {
    if (!name.trim()) {
      toast({ title: 'Informe o nome da campanha', variant: 'destructive' })
      return
    }
    onCreateCampaign({
      name: name.trim(),
      description: description.trim(),
      discount_percent: parseFloat(discount) || 0,
      target_procedures: targetProcedures,
      start_date: startDate,
      end_date: endDate,
    })
    toast({ title: 'Campanha criada!', description: name })
    resetCampanha()
  }

  const gerarCriativo = async (campaign: CampaignConfig) => {
    setCriativoOpen(true)
    setCriativoLoading(true)
    setCriativoText('')
    try {
      const res = await fetch('/api/lfg/campaign-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: campaign.name,
          descricao: campaign.description || '',
          desconto: campaign.discount_percent,
          procedimento: alvo?.name || '',
          preco_base: precoBase,
          preco_promo: precoPromo,
          validade: dataBR(campaign.end_date),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Erro ${res.status}`)
      }
      const body = await res.json()
      setCriativoText(body.criativo || '')
      toast({ title: 'Criativo gerado!', description: 'Edite o texto antes de usar.' })
    } catch (e: any) {
      toast({
        title: 'Não foi possível gerar o criativo',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      })
      setCriativoOpen(false)
    } finally {
      setCriativoLoading(false)
    }
  }

  const copiarCriativo = async () => {
    try {
      await navigator.clipboard.writeText(criativoText)
      toast({ title: 'Texto copiado!' })
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' })
    }
  }

  const montarMensagem = (p: PatientRecord): string => {
    const nomeProc = alvo?.name || 'nosso tratamento especial'
    const linhas = [
      `Olá, ${primeiroNome(p)}!`,
      '',
      `Temos uma condição especial para você: ${name || 'campanha'} — ${discount}% de desconto em ${nomeProc}.`,
      precoBase > 0 ? `De ${formatCurrency(precoBase)} por ${formatCurrency(precoPromo)}.` : '',
      description ? description : '',
      `Válido até ${dataBR(endDate)}.`,
      '',
      'Responda aqui para agendar sua avaliação! 💛',
    ]
    return linhas.filter((l) => l !== '').join('\n')
  }

  const abrirWhatsApp = () => {
    const escolhidos = targets.filter((t) => selected[t.patient.id])
    if (escolhidos.length === 0) {
      toast({ title: 'Selecione pelo menos um paciente', variant: 'destructive' })
      return
    }
    if (escolhidos.length > 1) {
      // abre o primeiro para revisão; os demais ficam na fila da lista
      toast({
        title: 'Revisão individual',
        description:
          'A mensagem abre uma por vez para revisão. Revise e confirme o envio de cada uma.',
      })
    }
    const primeiro = escolhidos[0]
    openWhatsApp(primeiro.patient.phone || '', primeiro.message)
  }

  const registrarEnvio = async (t: PatientTarget) => {
    setConfirming(t.patient.id)
    try {
      const rec = await pb.collection('campaign_messages').create<CampaignMessageRecord>({
        campaign: name || 'campanha',
        patient: t.patient.id,
        message: t.message,
        sent_at: new Date().toISOString(),
        sent_by: user?.id || '',
      })
      setSentMessages((prev) => [rec, ...prev])
      setTargets((prev) => prev.filter((x) => x.patient.id !== t.patient.id))
      setSelected((prev) => {
        const n = { ...prev }
        delete n[t.patient.id]
        return n
      })
      toast({
        title: 'Envio registrado',
        description: `${t.patient.name} • ${new Date().toLocaleDateString('pt-BR')}`,
      })
    } catch {
      toast({ title: 'Erro ao registrar envio', variant: 'destructive' })
    } finally {
      setConfirming(null)
    }
  }

  const abrirLista = () => {
    if (elegiveis.length === 0) {
      toast({
        title: 'Nenhum paciente elegível',
        description: 'Só entram pacientes com telefone e consentimento de comunicações (LGPD).',
        variant: 'destructive',
      })
      return
    }
    setTargets(
      elegiveis.map((p) => ({
        patient: p,
        proc: alvo,
        message: montarMensagem(p),
      })),
    )
    setSelected({})
    setWaOpen(true)
  }

  const filtrados = targets.filter((t) =>
    t.patient.name.toLowerCase().includes(waSearch.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <Card className="border-[#EDE3D8]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-serif-title text-[#2D1B14]">Nova campanha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Nome da campanha</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Clareamento de verão"
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Descrição / mensagem da campanha</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Texto base da campanha (usado na mensagem e no criativo de IA)"
              className="bg-[#FFFDF9] border-[#EDE3D8] min-h-16"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Procedimentos-alvo</Label>
            <div className="max-h-36 overflow-y-auto border border-[#EDE3D8] rounded-md bg-[#FFFDF9] p-2 space-y-1">
              {procedures.length === 0 && (
                <p className="text-xs text-[#6B4F42]">Nenhum procedimento cadastrado.</p>
              )}
              {procedures.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={targetProcedures.includes(p.id)}
                    onCheckedChange={(v) =>
                      setTargetProcedures((prev) =>
                        v ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                      )
                    }
                  />
                  <span className="text-[#2D1B14]">{p.name}</span>
                  {p.price > 0 && (
                    <span className="text-[#6B4F42]">— {formatCurrency(p.price)}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="btn-terracotta-gold" onClick={criarCampanha}>
              Criar campanha
            </Button>
          </div>
        </CardContent>
      </Card>

      {campaigns.map((c) => (
        <Card key={c.id} className="border-[#EDE3D8]">
          <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-serif-title text-[#2D1B14]">{c.name}</CardTitle>
              {c.description && <p className="text-xs text-[#6B4F42] mt-1">{c.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-[#D4AF37] text-[#2D1B14]">{c.discount_percent}% OFF</Badge>
                <span className="text-[10px] text-[#6B4F42]">
                  {dataBR(c.start_date)} → {dataBR(c.end_date)}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="border-[#C66B4D] text-[#C66B4D]"
                onClick={() => gerarCriativo(c)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Fazer criativo com IA (ChatGPT)
              </Button>
              <Button size="sm" className="btn-terracotta-gold" onClick={abrirLista}>
                <Send className="h-3.5 w-3.5 mr-1" />
                WhatsApp p/ clientes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500"
                onClick={() => onDeleteCampaign(c.id)}
              >
                Excluir
              </Button>
            </div>
          </CardHeader>
          {c.target_procedures.length > 0 && (
            <CardContent className="pt-0">
              <p className="text-[11px] text-[#6B4F42]">
                {c.target_procedures.length} procedimento(s) selecionado(s)
              </p>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Diálogo do criativo de IA — proposta EDITÁVEL */}
      <Dialog open={criativoOpen} onOpenChange={setCriativoOpen}>
        <DialogContent className="max-w-lg bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Criativo com IA (editável)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Proposta gerada pela IA — edite à vontade. Nada é publicado automaticamente.
            </DialogDescription>
          </DialogHeader>
          {criativoLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#C66B4D]" />
              <span className="ml-3 text-sm text-[#6B4F42]">Gerando criativo…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={criativoText}
                onChange={(e) => setCriativoText(e.target.value)}
                className="min-h-56 bg-[#FFFDF9] border-[#EDE3D8] text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={copiarCriativo}>
                  Copiar texto
                </Button>
                <Button className="btn-terracotta-gold" onClick={() => setCriativoOpen(false)}>
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo WhatsApp — revisão antes do envio + registro manual */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-2xl bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Mensagem de WhatsApp — revisão antes do envio
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Abra a conversa, revise o texto e só depois confirme “mensagem enviada”.{' '}
              {bloqueados > 0 &&
                `${bloqueados} paciente(s) fora da lista (sem consentimento de comunicações).`}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#6B4F42]" />
            <Input
              value={waSearch}
              onChange={(e) => setWaSearch(e.target.value)}
              placeholder="Buscar paciente…"
              className="pl-8 bg-[#FFFDF9] border-[#EDE3D8]"
            />
          </div>
          <div className="space-y-2">
            {filtrados.map((t) => {
              const jaEnviada = sentByPatient[t.patient.id]
              return (
                <div
                  key={t.patient.id}
                  className="border border-[#EDE3D8] rounded-lg p-2.5 bg-[#FAF6F0]"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={!!selected[t.patient.id]}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [t.patient.id]: !!v }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-[#2D1B14]">{t.patient.name}</p>
                        {jaEnviada && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Check className="h-3 w-3 mr-0.5" />
                            enviada {dataBR(jaEnviada.sent_at)}
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        value={t.message}
                        onChange={(e) =>
                          setTargets((prev) =>
                            prev.map((x) =>
                              x.patient.id === t.patient.id ? { ...x, message: e.target.value } : x,
                            ),
                          )
                        }
                        className="mt-1.5 min-h-20 bg-white border-[#EDE3D8] text-xs"
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#25D366] text-[#128C4A]"
                          onClick={() => openWhatsApp(t.patient.phone || '', t.message)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Abrir WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          className="btn-terracotta-gold"
                          disabled={confirming === t.patient.id}
                          onClick={() => registrarEnvio(t)}
                        >
                          {confirming === t.patient.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Mensagem enviada'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtrados.length === 0 && (
              <p className="text-xs text-[#6B4F42] py-4 text-center">
                {targets.length === 0
                  ? 'Nenhum paciente elegível (telefone + consentimento).'
                  : 'Nenhum resultado para a busca.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
