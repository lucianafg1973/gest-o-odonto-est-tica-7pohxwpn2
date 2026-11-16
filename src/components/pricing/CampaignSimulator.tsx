import { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
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
import {
  Loader2,
  Sparkles,
  Send,
  Check,
  Copy,
  MessageSquare,
  Image as ImageIcon,
  Megaphone,
} from 'lucide-react'
import { formatCurrency } from '@/lib/price-calculation'
import { PatientRecord, getPatients } from '@/services/patients'
import { AppointmentRecord, getAppointments } from '@/services/appointments'
import { openWhatsApp } from '@/lib/whatsapp'
import { getProcedures, ProcedureRecord } from '@/services/procedures'
import {
  SugestoesIA,
  SUGESTOES_VAZIAS,
  gerarSugestoes,
  copiarTexto,
} from '@/components/pricing/campaign-creative'
import CampaignSegmentacao from '@/components/pricing/CampaignSegmentacao'

/**
 * Simulador de Campanha — criativos com IA (agente nativo Skip Cloud) e envio
 * de WhatsApp por paciente com segmentação, revisão obrigatória e registro
 * manual de envio.
 *
 * - IA: rota nativa /backend/v1/ai/campaign/creative (pb_hooks + agente nativo
 *   'criativo-campanhas') — devolve MÚLTIPLAS opções (textos de WhatsApp,
 *   criativos visuais e posts), todas como PROPOSTA editável; nada é publicado
 *   ou enviado automaticamente.
 * - Ao escolher um texto/post, abre a SEGMENTAÇÃO (sexo, idade, consentimento,
 *   último atendimento), a lista pré-envio com OK final e exclusão individual
 *   (só daquele envio), e o WhatsApp abre um por vez para revisão.
 * - Registro "mensagem enviada": coleção campaign_messages, só após
 *   confirmação manual da usuária, com data e usuário.
 * - LGPD: comm_pref === 'liberado' marca autorização de comunicações.
 */

interface CampaignMessageRecord {
  id: string
  campaign: string
  patient: string
  message: string
  sent_at: string
  sent_by: string
  sent_by_name?: string
}

const commLiberado = (p: PatientRecord): boolean => (p as any).comm_pref === 'liberado'

const primeiroNome = (p: PatientRecord) => (p.name || '').trim().split(/\s+/)[0] || 'cliente'

const dataBR = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split(' ')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function CampaignSimulator({
  procedures,
  onClose,
}: {
  procedures: ProcedureRecord[]
  onClose?: () => void
}) {
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
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [sentMessages, setSentMessages] = useState<CampaignMessageRecord[]>([])

  // Sugestões da IA (múltiplas, todas editáveis)
  const [criativoOpen, setCriativoOpen] = useState(false)
  const [criativoLoading, setCriativoLoading] = useState(false)
  const [sugestoes, setSugestoes] = useState<SugestoesIA>(SUGESTOES_VAZIAS)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  // Segmentação + lista pré-envio
  const [segOpen, setSegOpen] = useState(false)
  const [textoFixo, setTextoFixo] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [pats, aps, msgs] = await Promise.all([
          getPatients(),
          getAppointments().catch(() => [] as AppointmentRecord[]),
          pb.collection('campaign_messages').getFullList<CampaignMessageRecord>({
            sort: '-sent_at',
          }),
        ])
        setPatients(pats)
        setAppointments(aps)
        setSentMessages(msgs)
      } catch {
        /* silencioso: coleção campaign_messages pode não existir ainda */
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

  const liberados = useMemo(
    () => patients.filter((p) => commLiberado(p) && (p.phone || '').trim() !== ''),
    [patients],
  )
  const bloqueados = patients.length - liberados.length

  const alvo = useMemo(() => {
    if (targetProcedures.length === 0) return null
    const id = targetProcedures[0]
    return procedures.find((p) => p.id === id) ?? null
  }, [targetProcedures, procedures])

  const precoBase = alvo?.price ?? 0
  const precoPromo = precoBase * (1 - (parseFloat(discount) || 0) / 100)

  const gerarCriativo = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe o nome da campanha', variant: 'destructive' })
      return
    }
    setCriativoOpen(true)
    setCriativoLoading(true)
    setSugestoes(SUGESTOES_VAZIAS)
    try {
      const briefing = [
        `Campanha: ${name.trim()}`,
        discount ? `Desconto: ${discount}%` : '',
        alvo ? `Procedimento-alvo: ${alvo.name}` : '',
        precoBase > 0
          ? `Preço oficial ${formatCurrency(precoBase)}; preço promocional ${formatCurrency(precoPromo)}.`
          : '',
        description.trim() ? `Briefing adicional: ${description.trim()}` : '',
        `Validade: ${dataBR(endDate)}`,
      ]
        .filter(Boolean)
        .join('\n')
      const res = await gerarSugestoes(briefing, conversationId)
      setSugestoes(res.sugestoes)
      setConversationId(res.conversation_id)
      toast({
        title: 'Sugestões geradas!',
        description: 'Várias opções prontas — edite a que escolher antes de usar.',
      })
    } catch (e: any) {
      toast({
        title: 'Não foi possível gerar os criativos',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      })
      setCriativoOpen(false)
    } finally {
      setCriativoLoading(false)
    }
  }

  const copiar = async (texto: string, chave: string) => {
    const ok = await copiarTexto(texto)
    if (ok) {
      setCopiado(chave)
      toast({ title: 'Texto copiado!' })
      setTimeout(() => setCopiado(null), 2000)
    } else {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' })
    }
  }

  const montarMensagem = (p: PatientRecord): string => {
    // Texto escolhido da IA (post/texto) tem prioridade — editável por paciente.
    if (textoFixo.trim()) return textoFixo
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

  /** Registro manual "mensagem enviada" (coleção campaign_messages). */
  const registrarEnvio = async (p: PatientRecord, message: string) => {
    const rec = await pb.collection('campaign_messages').create<CampaignMessageRecord>({
      campaign: name || 'campanha',
      patient: p.id,
      message,
      sent_at: new Date().toISOString(),
      sent_by: user?.id || '',
      sent_by_name: user?.name || '',
    })
    setSentMessages((prev) => [rec, ...prev])
    toast({
      title: 'Envio registrado',
      description: `${p.name} • ${new Date().toLocaleDateString('pt-BR')}`,
    })
  }

  /** Abre a segmentação com o texto escolhido (do post/texto da IA) ou padrão. */
  const escolherEEnviar = (texto: string) => {
    setTextoFixo(texto.trim())
    setSegOpen(true)
  }

  const totalSugestoes =
    sugestoes.textos.length + sugestoes.criativos.length + sugestoes.posts.length

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
            <Button
              className="border-[#C66B4D] text-[#C66B4D]"
              variant="outline"
              onClick={gerarCriativo}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Criativos com IA (vários, editáveis)
            </Button>
            <Button className="btn-terracotta-gold" onClick={() => escolherEEnviar('')}>
              <Send className="h-3.5 w-3.5 mr-1" />
              WhatsApp p/ clientes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo das sugestões da IA — MÚLTIPLAS opções EDITÁVEIS */}
      <Dialog open={criativoOpen} onOpenChange={setCriativoOpen}>
        <DialogContent className="max-w-2xl bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14]">
              Sugestões da IA (editáveis)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Textos de WhatsApp, criativos e posts propostos pela IA. Edite à vontade, escolha um e
              siga para a segmentação. <strong>Nada é enviado automaticamente.</strong>
            </DialogDescription>
          </DialogHeader>
          {criativoLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#C66B4D]" />
              <span className="ml-3 text-sm text-[#6B4F42]">Gerando sugestões…</span>
            </div>
          ) : (
            <div className="space-y-4">
              {totalSugestoes === 0 && (
                <p className="text-xs text-[#6B4F42] py-4 text-center">
                  Sem sugestões. Feche e tente gerar novamente.
                </p>
              )}

              {/* ---- Textos de WhatsApp ---- */}
              {sugestoes.textos.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-bold text-[#2D1B14] flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#C66B4D]" /> Textos para WhatsApp (
                    {sugestoes.textos.length})
                  </h4>
                  {sugestoes.textos.map((t, idx) => (
                    <div
                      key={t.id}
                      className="border border-[#EDE3D8] rounded-lg p-2.5 bg-[#FAF6F0] space-y-1.5"
                    >
                      <Input
                        value={t.titulo}
                        onChange={(e) =>
                          setSugestoes((prev) => ({
                            ...prev,
                            textos: prev.textos.map((x, i) =>
                              i === idx ? { ...x, titulo: e.target.value } : x,
                            ),
                          }))
                        }
                        className="text-xs font-semibold bg-white border-[#EDE3D8]"
                        placeholder="Título"
                      />
                      <Textarea
                        value={t.texto}
                        onChange={(e) =>
                          setSugestoes((prev) => ({
                            ...prev,
                            textos: prev.textos.map((x, i) =>
                              i === idx ? { ...x, texto: e.target.value } : x,
                            ),
                          }))
                        }
                        className="min-h-20 bg-white border-[#EDE3D8] text-xs"
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="btn-terracotta-gold text-xs"
                          onClick={() => escolherEEnviar(t.texto)}
                        >
                          <Send className="h-3 w-3 mr-1" /> Escolher e segmentar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => copiar(t.texto, t.id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {copiado === t.id ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* ---- Criativos visuais ---- */}
              {sugestoes.criativos.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-bold text-[#2D1B14] flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#C66B4D]" /> Criativos visuais (
                    {sugestoes.criativos.length})
                  </h4>
                  {sugestoes.criativos.map((c, idx) => (
                    <div
                      key={c.id}
                      className="border border-[#EDE3D8] rounded-lg p-2.5 bg-[#FAF6F0] space-y-1.5"
                    >
                      <Input
                        value={c.titulo}
                        onChange={(e) =>
                          setSugestoes((prev) => ({
                            ...prev,
                            criativos: prev.criativos.map((x, i) =>
                              i === idx ? { ...x, titulo: e.target.value } : x,
                            ),
                          }))
                        }
                        className="text-xs font-semibold bg-white border-[#EDE3D8]"
                        placeholder="Título"
                      />
                      <Textarea
                        value={c.descricao}
                        onChange={(e) =>
                          setSugestoes((prev) => ({
                            ...prev,
                            criativos: prev.criativos.map((x, i) =>
                              i === idx ? { ...x, descricao: e.target.value } : x,
                            ),
                          }))
                        }
                        className="min-h-16 bg-white border-[#EDE3D8] text-xs"
                        placeholder="Descrição do criativo (imagem, paleta, estilo)"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => copiar(`${c.titulo}\n${c.descricao}`, c.id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copiado === c.id ? 'Copiado!' : 'Copiar p/ designer'}
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              {/* ---- Posts de redes sociais ---- */}
              {sugestoes.posts.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-bold text-[#2D1B14] flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-[#C66B4D]" /> Posts de redes sociais (
                    {sugestoes.posts.length})
                  </h4>
                  {sugestoes.posts.map((p, idx) => (
                    <div
                      key={p.id}
                      className="border border-[#EDE3D8] rounded-lg p-2.5 bg-[#FAF6F0] space-y-1.5"
                    >
                      <div className="flex gap-1.5">
                        <Input
                          value={p.titulo}
                          onChange={(e) =>
                            setSugestoes((prev) => ({
                              ...prev,
                              posts: prev.posts.map((x, i) =>
                                i === idx ? { ...x, titulo: e.target.value } : x,
                              ),
                            }))
                          }
                          className="text-xs font-semibold bg-white border-[#EDE3D8]"
                          placeholder="Título"
                        />
                        <Input
                          value={p.hashtags}
                          onChange={(e) =>
                            setSugestoes((prev) => ({
                              ...prev,
                              posts: prev.posts.map((x, i) =>
                                i === idx ? { ...x, hashtags: e.target.value } : x,
                              ),
                            }))
                          }
                          className="text-xs bg-white border-[#EDE3D8]"
                          placeholder="#hashtags"
                        />
                      </div>
                      <Textarea
                        value={p.legenda}
                        onChange={(e) =>
                          setSugestoes((prev) => ({
                            ...prev,
                            posts: prev.posts.map((x, i) =>
                              i === idx ? { ...x, legenda: e.target.value } : x,
                            ),
                          }))
                        }
                        className="min-h-20 bg-white border-[#EDE3D8] text-xs"
                        placeholder="Legenda do post"
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="btn-terracotta-gold text-xs"
                          onClick={() => escolherEEnviar(p.legenda)}
                        >
                          <Send className="h-3 w-3 mr-1" /> Escolher e segmentar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => copiar(`${p.legenda}\n\n${p.hashtags}`.trim(), p.id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {copiado === p.id ? 'Copiado!' : 'Copiar post'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Segmentação + lista pré-envio com OK final e exclusão individual */}
      <CampaignSegmentacao
        open={segOpen}
        onOpenChange={setSegOpen}
        patients={patients}
        appointments={appointments}
        mensagemPara={montarMensagem}
        registrarEnvio={registrarEnvio}
        textoFixo={textoFixo}
      />

      {/* Resumo dos envios já registrados nesta sessão */}
      {sentMessages.length > 0 && (
        <Card className="border-[#EDE3D8]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif-title text-[#2D1B14] flex items-center gap-2">
              <Check className="h-4 w-4 text-[#6B8E23]" /> Últimos envios registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {sentMessages.slice(0, 5).map((m) => {
              const nome = patients.find((p) => p.id === m.patient)?.name || '—'
              return (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#2D1B14] font-medium">{nome}</span>
                  <span className="text-[#6B4F42]">
                    {m.campaign} • {dataBR(m.sent_at)}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
