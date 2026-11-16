import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Search, Trash2, Users, MessageCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { PatientRecord } from '@/services/patients'

/**
 * SEGMENTAÇÃO + LISTA PRÉ-ENVIO.
 *
 * Etapa 1: filtros (sexo, idade mín/máx, consentimento LGPD, autorização de
 * comunicações, último atendimento). O sistema lista quem atende.
 * Etapa 2: lista pré-envio com OK final — cada paciente tem botão de excluir
 * (remove SÓ daquele envio, sem tocar no cadastro) e o envio por WhatsApp
 * acontece um a um, só depois da confirmação da usuária.
 */

export interface Filtros {
  sexo: 'todos' | 'feminino' | 'masculino' | 'outro' | 'nao_informado'
  idadeMin: string
  idadeMax: string
  consentimento: 'todos' | 'liberados'
  semHaMeses: string
}

export const FILTROS_INICIAIS: Filtros = {
  sexo: 'todos',
  idadeMin: '',
  idadeMax: '',
  consentimento: 'todos',
  semHaMeses: '',
}

const SEXO_LABEL: Record<Filtros['sexo'], string> = {
  todos: 'Todos',
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
}

const idade = (p: PatientRecord): number | null => {
  const iso = (p.birth_date || '').slice(0, 10)
  if (!iso) return null
  const birth = new Date(iso + 'T00:00:00')
  if (isNaN(birth.getTime())) return null
  const hoje = new Date()
  let a = hoje.getFullYear() - birth.getFullYear()
  const m = hoje.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < birth.getDate())) a--
  return a < 0 ? null : a
}

const dataBR = (iso?: string) => {
  if (!iso) return '—'
  const d = iso.split(' ')[0]
  const [y, m, dia] = d.split('-')
  return y && m && dia ? `${dia}/${m}/${y}` : iso
}

/** Último atendimento (appointments status 'concluido') por paciente. */
export function ultimoAtendimentoMap(
  appointments: { patient: string; date: string; status?: string }[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of appointments) {
    if (a.status && a.status !== 'concluido') continue
    const d = (a.date || '').slice(0, 10)
    if (!d) continue
    const atual = map[a.patient]
    if (!atual || d > atual) map[a.patient] = d
  }
  return map
}

function atende(p: PatientRecord, f: Filtros, ultimoMap: Record<string, string>): boolean {
  if (f.sexo !== 'todos') {
    const g = p.gender || 'nao_informado'
    if (f.sexo === 'nao_informado' ? g !== 'nao_informado' : g !== f.sexo) return false
  }
  const i = idade(p)
  if (f.idadeMin.trim() !== '' && (i == null || i < Number(f.idadeMin))) return false
  if (f.idadeMax.trim() !== '' && (i == null || i > Number(f.idadeMax))) return false
  if (f.consentimento === 'liberados' && p.comm_pref !== 'liberado') return false
  if (f.semHaMeses.trim() !== '') {
    const ult = ultimoMap[p.id]
    if (!ult) return true // nunca atendido: conta como "sem ir há meses"
    const meses = Number(f.semHaMeses)
    const limite = new Date()
    limite.setMonth(limite.getMonth() - meses)
    if (new Date(ult + 'T00:00:00') >= limite) return false
  }
  return true
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  patients: PatientRecord[]
  appointments: { patient: string; date: string; status?: string }[]
  /** Monta a mensagem do WhatsApp para o paciente escolhido. */
  mensagemPara: (p: PatientRecord) => string
  /** Registro manual "mensagem enviada" (coleção campaign_messages). */
  registrarEnvio: (p: PatientRecord, message: string) => Promise<void>
  /** Texto fixo escolhido (do post/criativo da IA); vazio usa o padrão da campanha. */
  textoFixo?: string
}

export default function CampaignSegmentacao({
  open,
  onOpenChange,
  patients,
  appointments,
  mensagemPara,
  registrarEnvio,
  textoFixo,
}: Props) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [etapa, setEtapa] = useState<'filtros' | 'lista'>('filtros')
  const [excluidos, setExcluidos] = useState<Record<string, boolean>>({})
  const [busca, setBusca] = useState('')
  const [editMsg, setEditMsg] = useState<Record<string, string>>({})
  const [registrando, setRegistrando] = useState<string | null>(null)
  const [enviandoAtual, setEnviandoAtual] = useState<string | null>(null)

  const ultimoMap = useMemo(() => ultimoAtendimentoMap(appointments), [appointments])

  const segmento = useMemo(
    () => patients.filter((p) => atende(p, filtros, ultimoMap)),
    [patients, filtros, ultimoMap],
  )

  // Lista pré-envio: do segmento, retira os excluídos manualmente e os sem telefone.
  const lista = useMemo(
    () =>
      segmento
        .filter((p) => !excluidos[p.id])
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [segmento, excluidos],
  )

  const comTelefone = lista.filter((p) => (p.phone || '').trim() !== '')
  const semTelefone = lista.length - comTelefone.length
  const visiveis = comTelefone.filter((p) =>
    (p.name || '').toLowerCase().includes(busca.toLowerCase()),
  )

  const setF = (patch: Partial<Filtros>) => setFiltros((prev) => ({ ...prev, ...patch }))

  const msgDe = (p: PatientRecord) => editMsg[p.id] ?? mensagemPara(p)

  const abrirWhatsApp = (p: PatientRecord) => {
    const digits = (p.phone || '').replace(/\D/g, '')
    const intl = digits.startsWith('55') ? digits : `55${digits}`
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msgDe(p))}`, '_blank', 'noopener')
    setEnviandoAtual(p.id)
  }

  const confirmarEnvio = async (p: PatientRecord) => {
    setRegistrando(p.id)
    try {
      await registrarEnvio(p, msgDe(p))
      setEnviandoAtual(null)
    } finally {
      setRegistrando(null)
    }
  }

  const fechar = (o: boolean) => {
    if (!o) {
      setEtapa('filtros')
      setExcluidos({})
      setBusca('')
      setEditMsg({})
      setEnviandoAtual(null)
    }
    onOpenChange(o)
  }

  const descFiltros = [
    filtros.sexo !== 'todos' ? SEXO_LABEL[filtros.sexo].toLowerCase() : '',
    filtros.idadeMin || filtros.idadeMax
      ? `${filtros.idadeMin || '0'}–${filtros.idadeMax || '∞'} anos`
      : '',
    filtros.consentimento === 'liberados' ? 'com comunicação liberada' : '',
    filtros.semHaMeses ? `sem ir há ${filtros.semHaMeses}+ meses` : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-2xl bg-white border-[#EDE3D8] max-h-[85vh] overflow-y-auto">
        {etapa === 'filtros' ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif-title text-[#2D1B14]">
                Segmentar destinatários
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B4F42]">
                Escolha o público (ex.: homens de 30 a 65 anos). O sistema lista quem atende e
                <strong> nada é enviado</strong> sem a sua revisão e o seu OK, paciente por
                paciente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Sexo</Label>
                <Select
                  value={filtros.sexo}
                  onValueChange={(v) => setF({ sexo: v as Filtros['sexo'] })}
                >
                  <SelectTrigger className="text-xs bg-[#FFFDF9] border-[#EDE3D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['todos', 'feminino', 'masculino', 'outro', 'nao_informado'] as const).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {SEXO_LABEL[s]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Idade mínima</Label>
                <Input
                  type="number"
                  min={0}
                  value={filtros.idadeMin}
                  onChange={(e) => setF({ idadeMin: e.target.value })}
                  placeholder="Ex.: 30"
                  className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Idade máxima</Label>
                <Input
                  type="number"
                  min={0}
                  value={filtros.idadeMax}
                  onChange={(e) => setF({ idadeMax: e.target.value })}
                  placeholder="Ex.: 65"
                  className="text-xs bg-[#FFFDF9] border-[#EDE3D8]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="seg-consent"
                  checked={filtros.consentimento === 'liberados'}
                  onCheckedChange={(v) => setF({ consentimento: v ? 'liberados' : 'todos' })}
                />
                <Label htmlFor="seg-consent" className="text-xs font-normal text-[#2D1B14]">
                  Somente quem autorizou comunicações (LGPD)
                </Label>
              </div>
              <div>
                <Label className="text-xs font-semibold">Último atendimento</Label>
                <Select
                  value={filtros.semHaMeses || 'qualquer'}
                  onValueChange={(v) => setF({ semHaMeses: v === 'qualquer' ? '' : v })}
                >
                  <SelectTrigger className="text-xs bg-[#FFFDF9] border-[#EDE3D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualquer">Qualquer data</SelectItem>
                    <SelectItem value="3">Sem ir há 3+ meses</SelectItem>
                    <SelectItem value="6">Sem ir há 6+ meses</SelectItem>
                    <SelectItem value="12">Sem ir há 12+ meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-[#6B4F42]">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                <strong>{segmento.length}</strong> paciente(s) no segmento
                {descFiltros && <> — {descFiltros}</>}.
              </p>
              <Button
                className="btn-terracotta-gold text-xs"
                disabled={segmento.length === 0}
                onClick={() => setEtapa('lista')}
              >
                Ver lista de envio
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif-title text-[#2D1B14]">
                Lista de envio — OK final
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B4F42]">
                {textoFixo ? (
                  <>Texto escolhido da IA (editável por paciente abaixo). </>
                ) : (
                  <>Mensagem da campanha (editável por paciente abaixo). </>
                )}
                Exclua quem não deve receber. O WhatsApp abre uma por vez e o registro de “mensagem
                enviada” só acontece após a sua confirmação.
              </DialogDescription>
            </DialogHeader>
            {textoFixo && (
              <div className="border border-[#EDE3D8] rounded-md bg-[#FAF6F0] p-2 text-xs text-[#2D1B14] whitespace-pre-wrap max-h-24 overflow-y-auto">
                {textoFixo}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#6B4F42]" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar paciente…"
                className="pl-8 bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
            <div className="space-y-2">
              {visiveis.map((p) => (
                <div key={p.id} className="border border-[#EDE3D8] rounded-lg p-2.5 bg-[#FAF6F0]">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-[#2D1B14]">{p.name}</p>
                        {(() => {
                          const i = idade(p)
                          return i != null ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {i} anos
                            </Badge>
                          ) : null
                        })()}
                        {ultimoMap[p.id] && (
                          <Badge variant="secondary" className="text-[10px]">
                            último: {dataBR(ultimoMap[p.id])}
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        value={msgDe(p)}
                        onChange={(e) =>
                          setEditMsg((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="mt-1.5 min-h-20 bg-white border-[#EDE3D8] text-xs"
                      />
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#25D366] text-[#128C4A] text-xs"
                          onClick={() => abrirWhatsApp(p)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Abrir WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          className="btn-terracotta-gold text-xs"
                          disabled={registrando === p.id}
                          onClick={() => confirmarEnvio(p)}
                        >
                          {registrando === p.id ? 'Registrando…' : 'Mensagem enviada'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 text-xs"
                          title="Excluir deste envio (não toca no cadastro)"
                          onClick={() => setExcluidos((prev) => ({ ...prev, [p.id]: true }))}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir da lista
                        </Button>
                      </div>
                      {enviandoAtual === p.id && (
                        <p className="text-[10px] text-[#6B4F42] mt-1">
                          Revise a mensagem no WhatsApp e só depois confirme “Mensagem enviada”.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {visiveis.length === 0 && (
                <p className="text-xs text-[#6B4F42] py-4 text-center">
                  {comTelefone.length === 0
                    ? 'Ninguém no segmento com telefone cadastrado.'
                    : 'Nenhum resultado para a busca.'}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-[#6B4F42]">
                {comTelefone.length} com telefone • {semTelefone} sem telefone (não recebem) •{' '}
                {Object.keys(excluidos).length} excluído(s) desta lista
              </p>
              <Button variant="outline" className="text-xs" onClick={() => setEtapa('filtros')}>
                Voltar aos filtros
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
