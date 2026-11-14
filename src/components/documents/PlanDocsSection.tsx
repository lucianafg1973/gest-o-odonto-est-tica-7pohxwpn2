import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, FileSignature, FileDown, Paperclip, Eye, PenLine, History } from 'lucide-react'
import { DocumentRecord } from '@/services/documents'
import { parseArchiveMeta } from '@/lib/plan-archive'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

interface PlanDocsSectionProps {
  /** Documentos do paciente (já filtrados por ele no pai). */
  docs: DocumentRecord[]
  /** Registra a assinatura de um documento (data + usuário). */
  onRegisterSignature: (docId: string, signedDate: string) => Promise<void>
  /** Anexa o PDF digitalizado assinado no documento. */
  onAttachSignedPdf: (docId: string, file: File) => Promise<void>
}

const LABEL_TIPO: Record<string, string> = {
  orcamento: 'Orçamento apresentado',
  aprovado: 'Planejamento aprovado',
  aceite: 'Termo de aceite',
  assinado: 'Documento assinado',
  contrato: 'Termo/contrato',
  informativo: 'Proposta',
}

/**
 * Área "Documentos do Planejamento": lista os documentos gerados/arquivados do
 * planejamento (proposta, aprovado, aceite, assinado) com data de geração,
 * versão e status da assinatura — e permite anexar o PDF digitalizado assinado.
 * Documentos arquivados guardam snapshot do conteúdo: mudanças posteriores no
 * planejamento NÃO os alteram (T9/T12).
 */
export function PlanDocsSection({
  docs,
  onRegisterSignature,
  onAttachSignedPdf,
}: PlanDocsSectionProps) {
  const { user } = useAuth()
  const [assinandoDoc, setAssinandoDoc] = useState<DocumentRecord | null>(null)
  const [assinadoData, setAssinadoData] = useState(() => new Date().toISOString().slice(0, 10))
  const [savingSig, setSavingSig] = useState(false)

  /** Somente os documentos vindos do fluxo de planejamento (têm cabeçalho de auditoria). */
  const docsPlanejamento = useMemo(
    () => docs.filter((d) => (d.content || '').includes('# Plano Nº:')),
    [docs],
  )

  const registrarAssinatura = async () => {
    if (!assinandoDoc) return
    setSavingSig(true)
    try {
      await onRegisterSignature(assinandoDoc.id, assinadoData)
      toast({ title: 'Assinatura registrada no documento!' })
      setAssinandoDoc(null)
    } catch (_) {
      toast({ title: 'Erro ao registrar a assinatura', variant: 'destructive' })
    } finally {
      setSavingSig(false)
    }
  }

  const anexarPdf = async (doc: DocumentRecord, file: File) => {
    try {
      await onAttachSignedPdf(doc.id, file)
      toast({ title: 'Documento assinado anexado com sucesso!' })
    } catch (_) {
      toast({ title: 'Erro ao anexar o documento assinado', variant: 'destructive' })
    }
  }

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-3">
        <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-[#C66B4D]" /> Documentos do Planejamento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {docsPlanejamento.length === 0 && (
          <p className="text-xs text-[#6B4F42] text-center py-4">
            Nenhum documento do planejamento arquivado ainda — gere uma prévia/impressão na aba do
            planejamento (Odontológico ou HOF) e ela aparece aqui com data, versão e assinatura.
          </p>
        )}
        {docsPlanejamento.map((doc) => {
          const meta = parseArchiveMeta(doc)
          const assinado = meta.assinaturaStatus === 'assinado'
          return (
            <div
              key={doc.id}
              className="bg-white border border-[#EDE3D8] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-[#2D1B14] truncate">{doc.title}</p>
                  <Badge className="bg-[#FBF3DC] text-[#8B6914] border border-[#D4AF37] text-[10px]">
                    {LABEL_TIPO[doc.document_type] || doc.document_type}
                  </Badge>
                  <Badge
                    className={`text-[10px] text-white ${
                      assinado ? 'bg-[#2E8B57]' : 'bg-[#C66B4D]'
                    }`}
                  >
                    {assinado ? 'Assinado' : 'Aguardando assinatura'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#6B4F42] flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <History className="w-3 h-3" /> v{meta.versao} • gerado em{' '}
                    {meta.geradoEm || new Date(doc.created).toLocaleDateString('pt-BR')}
                  </span>
                  {meta.geradoPor && <span>• por {meta.geradoPor}</span>}
                  {assinado && (
                    <span className="inline-flex items-center gap-1 text-[#2E8B57] font-semibold">
                      <PenLine className="w-3 h-3" /> assinado — registrado por {user?.name || '—'}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!assinado && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] text-[#2E8B57] border-[#2E8B57]/40 hover:bg-[#E8F5EE]"
                    onClick={() => {
                      setAssinandoDoc(doc)
                      setAssinadoData(new Date().toISOString().slice(0, 10))
                    }}
                  >
                    <PenLine className="w-3 h-3 mr-1" /> Registrar assinatura
                  </Button>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) anexarPdf(doc, f)
                      e.target.value = ''
                    }}
                  />
                  <span className="inline-flex items-center gap-1 text-[11px] rounded-md border border-[#C66B4D]/40 bg-white px-3 h-8 hover:bg-[#FBF3DC] transition-colors">
                    <Paperclip className="w-3 h-3 text-[#C66B4D]" /> Anexar PDF assinado
                  </span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] text-[#7A3B25] border-[#D4AF37] hover:bg-[#FBF3DC]"
                  onClick={() => {
                    const win = window.open('', '_blank')
                    if (!win) return
                    win.document.write(
                      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${doc.title}</title></head><body><pre style="font-family:Georgia,serif;font-size:12px;white-space:pre-wrap;padding:24px">${(doc.content || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] || c)}</pre></body></html>`,
                    )
                    win.document.close()
                  }}
                  title="Abrir conteúdo arquivado"
                >
                  <Eye className="w-3 h-3 mr-1" /> Ver
                </Button>
                {doc.pdf_file && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] text-[#7A3B25] border-[#D4AF37] hover:bg-[#FBF3DC]"
                    onClick={() =>
                      window.open(pb.files.getURL(doc, doc.pdf_file), '_blank', 'noopener')
                    }
                    title="Baixar PDF arquivado"
                  >
                    <FileDown className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>

      <Dialog open={!!assinandoDoc} onOpenChange={(o) => !o && setAssinandoDoc(null)}>
        <DialogContent className="max-w-md bg-white border-[#EDE3D8]">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-[#2D1B14] text-base flex items-center gap-2">
              <PenLine className="w-4 h-4 text-[#C66B4D]" /> Registrar assinatura do paciente
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B4F42]">
              Confirme a data em que o paciente assinou o documento impresso. A assinatura é
              independente da aprovação do planejamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-xs font-semibold">Data da assinatura</Label>
            <Input
              type="date"
              value={assinadoData}
              onChange={(e) => setAssinadoData(e.target.value)}
            />
            <p className="text-[10px] text-[#6B4F42]">
              Registrada em nome de <strong>{user?.name || 'usuário atual'}</strong>.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setAssinandoDoc(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-[#2E8B57] hover:bg-[#257047] text-white text-xs font-semibold"
              disabled={savingSig || !assinadoData}
              onClick={registrarAssinatura}
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
