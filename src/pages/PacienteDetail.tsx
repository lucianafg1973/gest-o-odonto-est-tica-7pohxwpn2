import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, PatientRecord } from '@/services/patients'
import {
  getMedicalRecordsByPatient,
  createMedicalRecord,
  MedicalRecordItem,
} from '@/services/medical_records'
import { getPatientImages, uploadPatientImage, getImageUrl, ImageRecord } from '@/services/images'
import { getVirtualPlans, VirtualPlanRecord } from '@/services/virtual_plans'
import { getDocuments, DocumentRecord } from '@/services/documents'
import { getFinancialTransactions, FinancialTransactionRecord } from '@/services/financial'
import { getMessagesByPatient, MessageRecord } from '@/services/messages'
import { CanvasAnnotator } from '@/components/virtual-planning/CanvasAnnotator'
import { PdfPreviewModal } from '@/components/documents/PdfPreviewModal'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import { CadastroTab } from '@/components/patients/CadastroTab'
import { FinanceiroTab } from '@/components/patients/FinanceiroTab'
import {
  FileText,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
  MessageCircle,
  AlertTriangle,
  Upload,
  ChevronLeft,
  Pencil,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'

export default function PacienteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordItem[]>([])
  const [images, setImages] = useState<ImageRecord[]>([])
  const [plans, setPlans] = useState<VirtualPlanRecord[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [transactions, setTransactions] = useState<FinancialTransactionRecord[]>([])
  const [messages, setMessages] = useState<MessageRecord[]>([])

  const [anamnesis, setAnamnesis] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedImageForPlan, setSelectedImageForPlan] = useState<ImageRecord | null>(null)

  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const loadAllData = async () => {
    if (!id) return
    try {
      const pat = await getPatient(id)
      setPatient(pat)
      const med = await getMedicalRecordsByPatient(id)
      setMedicalRecords(med)
      const imgs = await getPatientImages(id)
      setImages(imgs)
      const vp = await getVirtualPlans(id)
      setPlans(vp)
      const docs = await getDocuments(id)
      setDocuments(docs)
      const trans = await getFinancialTransactions(`patient="${id}"`)
      setTransactions(trans)
      const msgs = await getMessagesByPatient(id)
      setMessages(msgs)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadAllData()
  }, [id])

  const handleAddMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      await createMedicalRecord({
        patient: id,
        anamnesis,
        diagnosis,
        notes,
        record_date: new Date().toISOString(),
      })
      toast({ title: 'Evolução registrada no prontuário!' })
      setAnamnesis('')
      setDiagnosis('')
      setNotes('')
      loadAllData()
    } catch (_) {
      toast({ title: 'Erro ao registrar prontuário', variant: 'destructive' })
    }
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('patient', id)
    formData.append('image_type', 'facial')
    formData.append('file', file)
    formData.append('caption', 'Foto Facial de Prontuário')

    try {
      await uploadPatientImage(formData)
      toast({ title: 'Foto salva com sucesso!' })
      loadAllData()
    } catch (_) {
      toast({ title: 'Erro ao fazer upload da imagem', variant: 'destructive' })
    }
  }

  if (!patient)
    return <div className="p-8 text-center text-xs text-[#6B4F42]">Carregando paciente...</div>

  const tabTriggerClass = 'text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pacientes')}>
          <ChevronLeft className="w-5 h-5 text-[#2D1B14]" />
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-[#D4AF37]">
            <AvatarFallback className="bg-[#C66B4D] text-white font-bold">
              {patient.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">{patient.name}</h2>
            <p className="text-xs text-[#6B4F42]">
              Tel: {patient.phone} | CPF: {patient.cpf || 'Não informado'}
            </p>
          </div>
        </div>
        <div className="ml-auto">
          <Button
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-4 h-4 mr-1" /> Editar Cadastro
          </Button>
        </div>
      </div>

      {patient.medical_notes && patient.medical_notes.toLowerCase().includes('alergia') && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-center gap-3 text-amber-900 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            <strong>ALERTA DE PRONTUÁRIO:</strong> {patient.medical_notes.replace(/<[^>]+>/g, '')}
          </span>
        </div>
      )}

      <div ref={tabsRef}>
        <Tabs defaultValue="cadastro" className="w-full">
          <TabsList className="bg-white border border-[#EDE3D8] p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="cadastro" className={tabTriggerClass}>
              <User className="w-3.5 h-3.5 mr-1" /> Cadastro
            </TabsTrigger>
            <TabsTrigger value="prontuario" className={tabTriggerClass}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Prontuário
            </TabsTrigger>
            <TabsTrigger value="fotos" className={tabTriggerClass}>
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> Fotografias e Radiografias
            </TabsTrigger>
            <TabsTrigger value="planejamento" className={tabTriggerClass}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Planejamento HOF
            </TabsTrigger>
            <TabsTrigger value="documentos" className={tabTriggerClass}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="financeiro" className={tabTriggerClass}>
              <DollarSign className="w-3.5 h-3.5 mr-1" /> Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="mt-4">
            <CadastroTab patient={patient} onEdit={() => setEditOpen(true)} />
          </TabsContent>

          <TabsContent value="prontuario" className="mt-4 space-y-6">
            <Card className="card-warm">
              <CardHeader className="border-b border-[#EDE3D8] pb-3">
                <CardTitle className="font-serif-title text-base text-[#2D1B14]">
                  Nova Evolução Médica / Odontológica
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleAddMedicalRecord} className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Anamnese / Queixa Principal</Label>
                    <Input
                      value={anamnesis}
                      onChange={(e) => setAnamnesis(e.target.value)}
                      placeholder="Queixa do paciente..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Diagnóstico</Label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Diagnóstico de saúde..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">
                      Anotações do Procedimento / Evolução
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Evolução realizada hoje..."
                    />
                  </div>
                  <Button type="submit" className="btn-terracotta-gold text-xs">
                    Registrar no Prontuário
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
                Histórico do Prontuário
              </h3>
              {medicalRecords.map((m) => (
                <Card key={m.id} className="card-warm p-4 space-y-2">
                  <p className="text-[11px] font-bold text-[#C66B4D]">
                    {new Date(m.created).toLocaleDateString('pt-BR')} -{' '}
                    {m.expand?.procedure?.name || 'Consulta'}
                  </p>
                  {m.anamnesis && (
                    <p className="text-xs text-[#2D1B14]">
                      <strong>Anamnese:</strong> {m.anamnesis}
                    </p>
                  )}
                  {m.diagnosis && (
                    <p className="text-xs text-[#2D1B14]">
                      <strong>Diagnóstico:</strong> {m.diagnosis}
                    </p>
                  )}
                  {m.notes && (
                    <p className="text-xs text-[#6B4F42]">
                      <strong>Evolução:</strong> {m.notes}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fotos" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-[#EDE3D8]">
              <p className="text-xs text-[#6B4F42]">
                Adicione fotografias faciais, dentais ou radiografias.
              </p>
              <label className="btn-terracotta-gold text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1">
                <Upload className="w-4 h-4" /> Upload de Foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadImage}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="bg-white border border-[#EDE3D8] p-2 rounded-xl text-center space-y-2"
                >
                  <img
                    src={getImageUrl(img)}
                    alt="Prontuário"
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <p className="text-[11px] font-semibold text-[#2D1B14]">
                    {img.image_type?.toUpperCase()}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] text-[#C66B4D]"
                    onClick={() => setSelectedImageForPlan(img)}
                  >
                    Anotar no Plano HOF
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="planejamento" className="mt-4 space-y-6">
            {selectedImageForPlan ? (
              <Card className="card-warm p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif-title text-base font-bold text-[#2D1B14]">
                    Edição do Planejamento HOF
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedImageForPlan(null)}>
                    Voltar à Galeria
                  </Button>
                </div>
                <CanvasAnnotator
                  imageUrl={getImageUrl(selectedImageForPlan)}
                  onSave={async () => {
                    toast({ title: 'Planejamento HOF salvo com sucesso!' })
                  }}
                />
              </Card>
            ) : (
              <p className="text-xs text-[#6B4F42] py-8 text-center bg-white border rounded-xl">
                Selecione uma foto na aba "Fotografias e Radiografias" para iniciar o desenho
                técnico de planejamento HOF.
              </p>
            )}
          </TabsContent>

          <TabsContent value="documentos" className="mt-4 space-y-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="card-warm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
              >
                <div>
                  <p className="font-bold text-sm text-[#2D1B14]">{doc.title}</p>
                  <p className="text-xs text-[#6B4F42]">
                    Tipo: {doc.document_type.toUpperCase()} | Data:{' '}
                    {new Date(doc.created).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="btn-terracotta-gold text-xs"
                  onClick={() => {
                    setPreviewDoc(doc)
                    setPdfModalOpen(true)
                  }}
                >
                  Visualizar PDF
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="financeiro" className="mt-4">
            <FinanceiroTab transactions={transactions} />
          </TabsContent>
        </Tabs>
      </div>

      {previewDoc && (
        <PdfPreviewModal
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          title={previewDoc.title}
          patientName={patient.name}
          content={previewDoc.content || ''}
          dateStr={new Date(previewDoc.created).toLocaleDateString('pt-BR')}
        />
      )}

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSaved={loadAllData}
      />
    </div>
  )
}
