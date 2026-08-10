import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, FileText } from 'lucide-react'

interface PdfPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  patientName: string
  content: string
  dateStr?: string
}

export function PdfPreviewModal({
  open,
  onOpenChange,
  title,
  patientName,
  content,
  dateStr,
}: PdfPreviewModalProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${patientName}</title>

            body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #C66B4D; padding-bottom: 15px; margin-bottom: 30px; }
            .header h1 { font-family: 'Playfair Display', Georgia, serif; color: #2D1B14; margin: 0; font-size: 24px; }
            .header p { color: #6B4F42; font-size: 13px; margin: 5px 0 0 0; }
            .doc-title { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 25px; letter-spacing: 1px; color: #2D1B14; }
            .content { font-size: 14px; text-align: justify; margin-bottom: 60px; white-space: pre-wrap; }
            .footer-sig { display: flex; justify-content: space-around; margin-top: 80px; page-break-inside: avoid; }
            .sig-line { width: 40%; text-align: center; border-top: 1px solid #000; pt: 8px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CLÍNICA ODONTO ESTÉTICA</h1>
            <p>Odontologia Avançada e Estética Facial - Dra. Luciana F. G.</p>
          </div>
          <div class="doc-title">${title}</div>
          <p><strong>Paciente:</strong> ${patientName} &nbsp;&nbsp;&nbsp; <strong>Data:</strong> ${dateStr || new Date().toLocaleDateString('pt-BR')}</p>
          <div class="content">${content}</div>
          <div class="footer-sig">
            <div class="sig-line">
              <br/>
              <strong>${patientName}</strong><br/>
              Assinatura do Paciente
            </div>
            <div class="sig-line">
              <br/>
              <strong>Dra. Luciana F. G.</strong><br/>
              Responsável Técnico
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border-[#EDE3D8]">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C66B4D]" /> Visualização do Documento
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4F42]">
            Documento pronto para impressão ou assinatura digital.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 border border-[#EDE3D8] rounded-xl bg-[#FFFDF9] shadow-inner my-2 font-serif text-[#2D1B14] leading-relaxed">
          <div className="text-center pb-4 border-b border-[#C66B4D] mb-6">
            <h2 className="text-xl font-bold tracking-wide text-[#2D1B14] font-serif-title">
              CLÍNICA ODONTO ESTÉTICA
            </h2>
            <p className="text-xs text-[#6B4F42] uppercase tracking-wider mt-1">
              Gestão de Saúde e Estética Integrada
            </p>
          </div>

          <h3 className="text-center text-lg font-bold uppercase tracking-wider mb-6 text-[#2D1B14]">
            {title}
          </h3>

          <div className="text-sm mb-4 font-sans bg-white p-3 rounded border border-[#EDE3D8] flex justify-between">
            <span>
              <strong>Paciente:</strong> {patientName}
            </span>
            <span>
              <strong>Data:</strong> {dateStr || new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="text-sm whitespace-pre-wrap text-justify my-6 font-sans">{content}</div>

          <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-gray-300 text-center font-sans text-xs">
            <div>
              <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
              <p className="font-semibold">{patientName}</p>
              <p className="text-gray-500">Assinatura do Paciente</p>
            </div>
            <div>
              <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
              <p className="font-semibold">Dra. Luciana F. G.</p>
              <p className="text-gray-500">CRO/SP 123456</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button className="btn-terracotta-gold font-medium" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
