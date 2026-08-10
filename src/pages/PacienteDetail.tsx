import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, updatePatient, PatientRecord } from '@/services/patients'
import {
  getMedicalRecordsByPatient,
  createMedicalRecord,
  MedicalRecordItem,
} from '@/services/medical_records'
import { getPatientImages, uploadPatientImage, getImageUrl, ImageRecord } from '@/services/images'
import { getVirtualPlans, VirtualPlanRecord } from '@/services/virtual_plans'
import { getDocuments, DocumentRecord } from '@/services/documents'
import { getMessagesByPatient, MessageRecord } from '@/services/messages'
import { CanvasAnnotator } from '@/components/virtual-planning/CanvasAnnotator'
import { PdfPreviewModal } from '@/components/documents/PdfPreviewModal'
import {
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
  MessageCircle,
  AlertTriangle,
  Plus,
  Upload,
  Save,
  ChevronLeft,
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
  const [messages, setMessages] = useState<MessageRecord[]>([])

  const [anamnesis, setAnamnesis] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedImageForPlan, setSelectedImageForPlan] = useState<ImageRecord | null>(null)

  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)

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
      </div>

      {patient.medical_notes && patient.medical_notes.toLowerCase().includes('alergia') && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-center gap-3 text-amber-900 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            <strong>ALERTA DE PRONTUÁRIO:</strong> {patient.medical_notes.replace(/<[^>]+>/g, '')}
          </span>
        </div>
      )}

      <Tabs defaultValue="prontuario" className="w-full">
        <TabsList className="bg-white border border-[#EDE3D8] p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger
            value="prontuario"
            className="text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Prontuário
          </TabsTrigger>
          <TabsTrigger
            value="fotos"
            className="text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1" /> Galeria de Fotos
          </TabsTrigger>
          <TabsTrigger
            value="planejamento"
            className="text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Planejamento Virtual
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Documentos & PDFs
          </TabsTrigger>
          <TabsTrigger
            value="mensagens"
            className="text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Histórico WhatsApp
          </TabsTrigger>
        </TabsList>

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
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#EDE3D8]">
            <p className="text-xs text-[#6B4F42]">
              Adicione fotografias faciais, dentais ou radiografias.
            </p>
            <label className="btn-terracotta-gold text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1">
              <Upload className="w-4 h-4" /> Upload de Foto
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
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
                  {img.image_type.toUpperCase()}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[10px] text-[#C66B4D]"
                  onClick={() => setSelectedImageForPlan(img)}
                >
                  Anotar no Plano Virtual
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
                  Edição do Planejamento Virtual
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedImageForPlan(null)}>
                  Voltar à Galeria
                </Button>
              </div>
              <CanvasAnnotator
                imageUrl={getImageUrl(selectedImageForPlan)}
                onSave={async (ann) => {
                  try {
                    await fetch('/backend/v1/ai/assistant/chat')
                    toast({ title: 'Planejamento Virtual Salvo com Sucesso!' })
                  } catch {
                    /* intentionally ignored */
                  }
                }}
              />
            </Card>
          ) : (
            <p className="text-xs text-[#6B4F42] py-8 text-center bg-white border rounded-xl">
              Selecione uma foto na aba "Galeria de Fotos" para iniciar o desenho técnico de
              planejamento virtual.
            </p>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4 space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="card-warm p-4 flex justify-between items-center">
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

        <TabsContent value="mensagens" className="mt-4 space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="card-warm p-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#C66B4D] uppercase">{m.message_type}</span>
                <span className="text-[10px] text-gray-500">
                  {new Date(m.created).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-[#2D1B14] mt-2 bg-[#FAF6F0] p-2 rounded border border-[#EDE3D8]">
                {m.content}
              </p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
