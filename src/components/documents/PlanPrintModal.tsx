import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Printer, Download, Eye, FileDown, MessageCircle } from 'lucide-react'
import {
  PlanDocSnapshot,
  DocOptions,
  DocModo,
  buildPlanDocHtml,
  planDocCss,
  printPlanDoc,
  downloadPlanDoc,
  totalDocCents,
  parcelasExpandidas,
} from '@/lib/plan-doc'
import { formatCurrency } from '@/lib/price-calculation'
import { sharePlanDocWhatsApp } from '@/lib/whatsapp'

interface PlanPrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: PlanDocSnapshot
  emitidoPor?: string
  /** Gera e compartilha o PDF pelo WhatsApp (botão dedicado). */
  onShareWhatsapp?: () => void
}

/**
 * Prévia do documento A4 do planejamento (exatamente o que sai no PDF):
 * alternância detalhado/resumido, caixa independente "Ocultar todos os
 * valores" e impressão para assinatura (aceite).
 */
export function PlanPrintModal({ open, onOpenChange, snapshot, emitidoPor }: PlanPrintModalProps) {
  const [modo, setModo] = useState<DocModo>('detalhado')
  const [hideValues, setHideValues] = useState(false)
  const [signature, setSignature] = useState(false)

  const opts: DocOptions = useMemo(
    () => ({ modo, hideValues, signature, emitidoPor, emitidoEm: new Date().toISOString() }),
    [modo, hideValues, signature, emitidoPor],
  )

  const html = useMemo(() => (open ? buildPlanDocHtml(snapshot, opts) : ''), [open, snapshot, opts])
  const body = html.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '')
  const css = html.replace(/^[\s\S]*?<style>/, '').replace(/<\/style>[\s\S]*$/, '')

  const totalC = totalDocCents(snapshot)
  const nParcelas = parcelasExpandidas(snapshot.paymentPlan).length

  const avisoOculto =
    hideValues && signature ? (
      <p className="text-[11px] text-[#8B6914] bg-[#FBF3DC] border border-[#D4AF37] rounded-lg px-3 py-2">
        Com “Ocultar todos os valores” ativo, o documento gerado é CLÍNICO — não serve como aceite
        comercial definitivo. Desmarque a opção para gerar o aceite com valores.
      </p>
    ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white border-[#EDE3D8] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C66B4D]" /> Prévia do documento
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            É exatamente esta versão que sai na impressão / PDF do planejamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-[#EDE3D8]">
          <div className="flex items-center gap-1 bg-[#FBF3DC] rounded-lg p-1">
            <Button
              type="button"
              size="sm"
              variant={modo === 'detalhado' ? 'default' : 'ghost'}
              className={`text-xs h-7 px-3 ${modo === 'detalhado' ? 'bg-[#7A3B25] hover:bg-[#5E2E1C] text-white' : 'text-[#6B4F42]'}`}
              onClick={() => setModo('detalhado')}
            >
              Orçamento detalhado
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === 'resumido' ? 'default' : 'ghost'}
              className={`text-xs h-7 px-3 ${modo === 'resumido' ? 'bg-[#7A3B25] hover:bg-[#5E2E1C] text-white' : 'text-[#6B4F42]'}`}
              onClick={() => setModo('resumido')}
            >
              Orçamento resumido
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-values"
              checked={hideValues}
              onCheckedChange={(v) => setHideValues(v === true)}
            />
            <Label htmlFor="hide-values" className="text-xs text-[#2D1B14] cursor-pointer">
              Ocultar todos os valores
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sig-mode"
              checked={signature}
              onCheckedChange={(v) => setSignature(v === true)}
            />
            <Label htmlFor="sig-mode" className="text-xs text-[#2D1B14] cursor-pointer">
              Imprimir para assinatura (aceite)
            </Label>
          </div>
          <span className="ml-auto text-[11px] text-[#6B4F42]">
            {hideValues
              ? 'Documento clínico, sem valores'
              : signature
                ? `Aceite com total ${formatCurrency(totalC / 100)}${nParcelas ? ` e ${nParcelas} parcela(s)` : ''}`
                : modo === 'detalhado'
                  ? `Total ${formatCurrency(totalC / 100)} com valores por procedimento`
                  : `Resumido: apenas “Investimento total: ${formatCurrency(totalC / 100)}”`}
          </span>
        </div>
        {avisoOculto}

        <div className="flex-1 min-h-0 overflow-y-auto bg-[#EDE3D8] rounded-xl p-3">
          <style>{planDocCss}</style>
          <style>{css}</style>
          <div
            className="doc-preview mx-auto bg-white shadow-lg"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-[#2E7D5B] border-[#2E8B57]/40 hover:bg-[#E8F5EE]"
            onClick={() => sharePlanDocWhatsApp(snapshot, opts)}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Enviar pelo WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-[#7A3B25] border-[#D4AF37] hover:bg-[#FBF3DC]"
            onClick={() => downloadPlanDoc(snapshot, opts)}
          >
            <FileDown className="w-3.5 h-3.5 mr-1" /> Baixar arquivo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-[#7A3B25] border-[#C66B4D]/40 hover:bg-[#FBF3DC]"
            onClick={() => printPlanDoc(snapshot, opts)}
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
          </Button>
          <Button
            size="sm"
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => {
              downloadPlanDoc(snapshot, opts)
              printPlanDoc(snapshot, opts)
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Gerar PDF
          </Button>
        </div>
        <p className="text-[10px] text-[#6B4F42] -mt-1 pb-1">
          O PDF é gerado pelo próprio navegador (“Salvar como PDF” na janela de impressão) —
          fidelidade total com esta prévia. “Baixar arquivo” entrega o documento A4 pronto para
          anexar no WhatsApp.
        </p>
      </DialogContent>
    </Dialog>
  )
}
