import { useState } from 'react'
import { PatientRecord } from '@/services/patients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Printer, FileText } from 'lucide-react'

interface TemplateDef {
  id: string
  title: string
  description: string
  build: (p: PatientRecord) => string
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')

export const DOCUMENT_TEMPLATES: TemplateDef[] = [
  {
    id: 'contrato',
    title: 'Contrato de Prestação de Serviços',
    description:
      'Contrato entre clínica e paciente para prestação de serviços odontológicos/estéticos.',
    build: (p) => `
      <h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ODONTOLÓGICOS</h2>
      <p><strong>CONTRATANTE:</strong> ${p.name}, CPF nº ${p.cpf || '________________'}, residente em ______________________.</p>
      <p><strong>CONTRATADA:</strong> Clínica LFG Estética Odontológica, responsável pelos serviços prestados.</p>
      <p><strong>Cláusula 1ª</strong> — A CONTRATADA prestará serviços de saúde bucal e estética ao CONTRATANTE, conforme plano de tratamento apresentado.</p>
      <p><strong>Cláusula 2ª</strong> — O CONTRATANTE se compromete a comparecer às consultas agendadas e a seguir as recomendações profissionais.</p>
      <p><strong>Cláusula 3ª</strong> — Os valores, prazos e formas de pagamento constam do orçamento/planejamento anexo.</p>
      <p><strong>Cláusula 4ª</strong> — Este contrato pode ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.</p>
      <p class="sig">São Paulo, ${fmtDate()}.</p>
      <p class="sig">______________________________<br/>${p.name}</p>
      <p class="sig">______________________________<br/>Clínica LFG Estética Odontológica</p>`,
  },
  {
    id: 'tcle',
    title: 'TCLE — Termo de Consentimento Livre e Esclarecido',
    description:
      'Consentimento do paciente para realização de procedimentos odontológicos e estéticos.',
    build: (p) => `
      <h2>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)</h2>
      <p>Eu, <strong>${p.name}</strong>, CPF nº ${p.cpf || '________________'}, declaro ter sido informado(a) sobre o tratamento proposto, riscos, benefícios e alternativas, e consento livremente com a sua realização.</p>
      <p>Autorizo ainda o registro fotográfico das etapas do tratamento, para fins de documentação clínica.</p>
      <p>Estou ciente de que posso retirar este consentimento a qualquer momento, sem prejuízo ao meu tratamento.</p>
      <p class="sig">Local e data: ____________________, ${fmtDate()}</p>
      <p class="sig">______________________________<br/>${p.name}</p>`,
  },
  {
    id: 'receituario',
    title: 'Receituário',
    description: 'Receituário em branco identificado com os dados do paciente.',
    build: (p) => `
      <h2>RECEITUÁRIO</h2>
      <p>Paciente: <strong>${p.name}</strong> — CPF: ${p.cpf || '____________'}</p>
      <p>Data: ${fmtDate()}</p>
      <br/>
      <p>Rx 1. ___________________________________________________</p>
      <br/>
      <p>Rx 2. ___________________________________________________</p>
      <br/>
      <p>Rx 3. ___________________________________________________</p>
      <p class="sig">______________________________<br/>Responsável técnico — CRO: __________</p>`,
  },
  {
    id: 'anamnese',
    title: 'Ficha de Anamnese',
    description: 'Ficha de anamnese com dados gerais e de saúde do paciente.',
    build: (p) => `
      <h2>FICHA DE ANAMNESE</h2>
      <p><strong>Nome:</strong> ${p.name}</p>
      <p><strong>Como prefere ser chamado(a):</strong> ${p.preferred_name || '—'} | <strong>RG:</strong> ${p.identity_rg || '—'}</p>
      <p><strong>Data de nascimento:</strong> ${p.birth_date ? fmtDate(p.birth_date) : '—'} | <strong>Sexo:</strong> ${p.gender || '—'}</p>
      <p><strong>Telefone:</strong> ${p.phone || '—'} | <strong>E-mail:</strong> ${p.email || '—'}</p>
      <p><strong>CPF:</strong> ${p.cpf || '—'}</p>
      <p><strong>Parentesco de algum cliente:</strong> ${p.kinship || '—'}</p>
      <br/>
      <p><strong>Está em tratamento médico?</strong> ( ) Sim ( ) Não — Qual? ____________________</p>
      <p><strong>Faz uso de medicação?</strong> ( ) Sim ( ) Não — Qual? ____________________</p>
      <p><strong>Possui alergias?</strong> ( ) Sim ( ) Não — A quê? ____________________</p>
      <p><strong>Está gestante?</strong> ( ) Sim ( ) Não</p>
      <p><strong>Possui alguma das seguintes doenças?</strong> Diabetes ( ) Hipertensão ( ) Cardíaca ( ) Osteoporose ( ) Hepatite ( ) Outra: ______________</p>
      <p><strong>Fuma?</strong> ( ) Sim ( ) Não | <strong>Consome álcool?</strong> ( ) Sim ( ) Não</p>
      <br/>
      <p><strong>Queixa principal:</strong> ___________________________________________________</p>
      <p class="sig">Assinatura do paciente: ______________________________</p>`,
  },
  {
    id: 'autorizacao',
    title: 'Autorização de Uso de Imagem',
    description: 'Autorização para uso de fotografias do paciente em divulgação clínica.',
    build: (p) => `
      <h2>AUTORIZAÇÃO DE USO DE IMAGEM</h2>
      <p>Eu, <strong>${p.name}</strong>, autorizo a Clínica LFG Estética Odontológica a utilizar fotografias e imagens obtidas durante meu tratamento, para fins científicos, didáticos e de divulgação clínica, resguardando minha identidade quando solicitado.</p>
      <p class="sig">Local e data: ____________________, ${fmtDate()}</p>
      <p class="sig">______________________________<br/>${p.name}</p>`,
  },
]

interface Props {
  patient: PatientRecord
}

export function DocumentTemplates({ patient }: Props) {
  const [printing, setPrinting] = useState<TemplateDef | null>(null)

  const printHtml = (tpl: TemplateDef) => {
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <title>${tpl.title}</title>
      <style>
        body { font-family: Georgia, serif; color: #2D1B14; padding: 48px 56px; line-height: 1.6; }
        h2 { text-align: center; border-bottom: 2px solid #C66B4D; padding-bottom: 8px; color: #2D1B14; }
        p { margin: 8px 0; font-size: 13px; }
        .sig { margin-top: 48px; }
      </style></head><body>${tpl.build(patient)}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
    setPrinting(null)
  }

  return (
    <Card className="card-warm">
      <CardHeader className="border-b border-[#EDE3D8] pb-3">
        <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#C66B4D]" /> Documentos Prontos para Impressão
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        <p className="text-[11px] text-[#6B4F42]">
          Modelos prontos preenchidos com os dados de {patient.name}. Abra e imprima quando
          aplicável.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DOCUMENT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-start justify-between gap-2 border border-[#EDE3D8] bg-white rounded-xl p-3"
            >
              <div>
                <p className="text-xs font-bold text-[#2D1B14]">{tpl.title}</p>
                <p className="text-[10px] text-[#6B4F42]">{tpl.description}</p>
              </div>
              <Button
                size="sm"
                className="btn-terracotta-gold text-[10px] shrink-0"
                onClick={() => {
                  setPrinting(tpl)
                  printHtml(tpl)
                }}
              >
                <Printer className="w-3 h-3 mr-1" /> Imprimir
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
