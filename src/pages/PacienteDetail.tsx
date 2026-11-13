import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, getPatientPhotoUrl, PatientRecord } from '@/services/patients'
import {
  getMedicalRecordsByPatient,
  createMedicalRecord,
  MedicalRecordItem,
} from '@/services/medical_records'
import {
  getPatientImages,
  uploadPatientImage,
  deletePatientImage,
  getImageUrl,
  ImageRecord,
} from '@/services/images'
import {
  getVirtualPlans,
  createNewPlan,
  updateVirtualPlan,
  savePlanningState,
  loadPlanningState,
  PlanKind,
  VirtualPlanRecord,
  TreatmentItemRecord,
  PaymentInstallmentRecord,
} from '@/services/virtual_plans'
import { getDocuments, DocumentRecord } from '@/services/documents'
import { getFinancialTransactions, FinancialTransactionRecord } from '@/services/financial'
import { getMessagesByPatient, MessageRecord } from '@/services/messages'
import { getProcedures } from '@/services/procedures'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'
import { printPlan } from '@/lib/planPrint'
import { OdontogramNew } from '@/components/planning/OdontogramNew'
import { FacialPlanning } from '@/components/planning/FacialPlanning'
import { PaymentInfo, PaymentPlan } from '@/components/planning/PaymentInfo'
import { PlanListBar } from '@/components/planning/PlanListBar'
import { PdfPreviewModal } from '@/components/documents/PdfPreviewModal'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import CadastroTab from '@/components/patients/CadastroTab'
import { FinanceiroTab } from '@/components/patients/FinanceiroTab'
import { DocumentTemplates } from '@/components/documents/DocumentTemplates'
import {
  FileText,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Upload,
  ChevronLeft,
  Pencil,
  User,
  Trash2,
  CheckCircle2,
  Printer,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'

export type PlannedTreatment = import('@/components/planning/TreatmentList').TreatmentItem

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
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([])

  /** Planejamento ativo de cada aba (o que está aberto no editor). */
  const [activeHofPlan, setActiveHofPlan] = useState<VirtualPlanRecord | null>(null)
  const [activeDentalPlan, setActiveDentalPlan] = useState<VirtualPlanRecord | null>(null)
  const [creatingPlan, setCreatingPlan] = useState<PlanKind | null>(null)
  const [approvingPlan, setApprovingPlan] = useState(false)

  const [anamnesis, setAnamnesis] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedImageForPlan, setSelectedImageForPlan] = useState<ImageRecord | null>(null)

  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ImageRecord | null>(null)
  const [hoofTreatments, setHoofTreatments] = useState<PlannedTreatment[]>([])
  const [dentalTreatments, setDentalTreatments] = useState<PlannedTreatment[]>([])
  const [hoofPaymentPlan, setHoofPaymentPlan] = useState<PaymentPlan>({ installments: [] })
  const [dentalPaymentPlan, setDentalPaymentPlan] = useState<PaymentPlan>({ installments: [] })
  const [hofAnnotations, setHofAnnotations] = useState<string | null>(null)

  // Converte os registros persistidos (JSON em virtual_plans) para o formato dos componentes
  const mapTreatmentRecords = (recs: TreatmentItemRecord[]): PlannedTreatment[] =>
    (recs || []).map((r) => ({
      id: r.id,
      procedureId: r.procedureId,
      procedureName: r.procedureName,
      tooth: r.tooth || '',
      region: r.region || '',
      faces: r.faces || [],
      price: r.price || 0,
    }))

  const mapPaymentRecord = (r: PaymentInstallmentRecord): PaymentPlan['installments'][number] => ({
    id: r.id,
    kind: r.kind,
    method: r.method,
    amount: r.amount || 0,
    due_date: r.due_date || '',
    installments_count: r.installments_count ?? 1,
  })

  /** Carrega um registro de planejamento no editor da aba correspondente. */
  const openPlanInEditor = (plan: VirtualPlanRecord) => {
    const state = loadPlanningState(plan)
    if ((plan.kind || 'hof') === 'hof') {
      setActiveHofPlan(plan)
      setHoofTreatments(mapTreatmentRecords(state.treatments))
      setHoofPaymentPlan({ installments: state.paymentPlan.map(mapPaymentRecord) })
      setHofAnnotations(state.annotations ?? null)
    } else {
      setActiveDentalPlan(plan)
      setDentalTreatments(mapTreatmentRecords(state.treatments))
      setDentalPaymentPlan({ installments: state.paymentPlan.map(mapPaymentRecord) })
    }
  }

  // Persistência (debounce simples) dos planejamentos HOF e Odontológico
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const persistPlanning = (
    key: string,
    record: VirtualPlanRecord | null,
    treatments: PlannedTreatment[],
    paymentPlan: PaymentPlan,
  ) => {
    if (!record || record.approval_status === 'aprovado') return
    if (saveTimer.current[key]) clearTimeout(saveTimer.current[key])
    saveTimer.current[key] = setTimeout(() => {
      savePlanningState(record, {
        treatments: treatments.map((t) => ({
          id: t.id,
          procedureId: t.procedureId,
          procedureName: t.procedureName,
          tooth: t.tooth,
          region: t.region,
          faces: t.faces,
          price: t.price,
        })),
        paymentPlan: paymentPlan.installments.map((i) => ({
          id: i.id,
          kind: i.kind,
          method: i.method,
          amount: i.amount,
          due_date: i.due_date,
          installments_count: i.installments_count ?? 1,
        })),
      })
        .then((updated) => {
          // Mantém o registro ativo sincronizado com o banco (updated, etc.)
          if (key === 'hof') setActiveHofPlan((p) => (p && p.id === updated.id ? updated : p))
          else setActiveDentalPlan((p) => (p && p.id === updated.id ? updated : p))
        })
        .catch(() => {
          /* silencioso — o usuário continua editando; estado local preservado */
        })
    }, 600)
  }

  useEffect(() => {
    persistPlanning('hof', activeHofPlan, hoofTreatments, hoofPaymentPlan)
  }, [hoofTreatments, hoofPaymentPlan, activeHofPlan])

  useEffect(() => {
    persistPlanning('odontologico', activeDentalPlan, dentalTreatments, dentalPaymentPlan)
  }, [dentalTreatments, dentalPaymentPlan, activeDentalPlan])

  // Salva as anotações de desenho livre do HOF (botão "Salvar Plano" do canvas)
  const handleSaveHofAnnotations = (annotationsJson: string) => {
    setHofAnnotations(annotationsJson)
    if (!activeHofPlan || activeHofPlan.approval_status === 'aprovado') {
      toast({ title: 'Desenho salvo localmente — crie/selecione um planejamento para persistir.' })
      return
    }
    savePlanningState(activeHofPlan, {
      treatments: hoofTreatments.map((t) => ({
        id: t.id,
        procedureId: t.procedureId,
        procedureName: t.procedureName,
        tooth: t.tooth,
        region: t.region,
        faces: t.faces,
        price: t.price,
      })),
      paymentPlan: hoofPaymentPlan.installments.map((i) => ({
        id: i.id,
        kind: i.kind,
        method: i.method,
        amount: i.amount,
        due_date: i.due_date,
        installments_count: i.installments_count ?? 1,
      })),
      annotations: annotationsJson,
    })
      .then(() => toast({ title: 'Desenho salvo com sucesso!' }))
      .catch(() => toast({ title: 'Erro ao salvar o desenho', variant: 'destructive' }))
  }

  /** Cria um NOVO planejamento (rascunho vazio) e o abre no editor. */
  const handleNewPlan = async (kind: PlanKind) => {
    if (!id) return
    setCreatingPlan(kind)
    try {
      const plan = await createNewPlan(id, kind)
      setPlans((prev) => [plan, ...prev])
      openPlanInEditor(plan)
      toast({ title: 'Novo planejamento criado — ele fica salvo como rascunho.' })
    } catch (_) {
      toast({ title: 'Erro ao criar o planejamento', variant: 'destructive' })
    } finally {
      setCreatingPlan(null)
    }
  }

  /** Aprova o planejamento ativo: salva status + data e bloqueia as edições. */
  const handleApprovePlan = async (kind: PlanKind) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    if (!plan || plan.approval_status === 'aprovado') return
    setApprovingPlan(true)
    try {
      const aprovado = await updateVirtualPlan(plan.id, {
        approval_status: 'aprovado',
        approved_at: new Date().toISOString(),
      })
      setPlans((prev) => prev.map((p) => (p.id === aprovado.id ? aprovado : p)))
      if (kind === 'hof') setActiveHofPlan(aprovado)
      else setActiveDentalPlan(aprovado)
      toast({
        title: 'Planejamento aprovado! Agora você pode imprimir — as edições ficam bloqueadas.',
      })
    } catch (_) {
      toast({ title: 'Erro ao aprovar o planejamento', variant: 'destructive' })
    } finally {
      setApprovingPlan(false)
    }
  }

  const loadAllData = async () => {
    if (!id) return
    try {
      const pat = await getPatient(id)
      setPatient(pat)
      const med = await getMedicalRecordsByPatient(id)
      setMedicalRecords(med)
      const imgs = await getPatientImages(id)
      setImages(imgs)
      const docs = await getDocuments(id)
      setDocuments(docs)
      const trans = await getFinancialTransactions(`patient="${id}"`)
      setTransactions(trans)
      setProcedures(await getProcedures())
      setMessages(await getMessagesByPatient(id))
      // Todos os planejamentos do paciente (mais recente → mais antigo)
      const vp = await getVirtualPlans(id)
      setPlans(vp)
      // Abre por padrão o mais recente de cada tipo (ou nenhum, se não houver)
      const hof = vp.find((p) => (p.kind || 'hof') === 'hof') || null
      const dent = vp.find((p) => p.kind === 'odontologico') || null
      if (hof) openPlanInEditor(hof)
      if (dent) openPlanInEditor(dent)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadAllData()
  }, [id])

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return
    try {
      await deletePatientImage(imageToDelete.id)
      toast({ title: 'Imagem excluída com sucesso!' })
      if (selectedImageForPlan?.id === imageToDelete.id) setSelectedImageForPlan(null)
      setImageToDelete(null)
      loadAllData()
    } catch (_) {
      toast({ title: 'Erro ao excluir a imagem', variant: 'destructive' })
    }
  }

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

  /** Barra de status/aprovação/impressão do planejamento ativo. */
  const approvalBar = (kind: PlanKind) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    if (!plan) return null
    const aprovado = plan.approval_status === 'aprovado'
    return (
      <Card className="card-warm p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {aprovado ? (
            <Badge className="bg-[#2E8B57] text-white text-[10px] gap-1">
              <Lock className="w-3 h-3" /> Aprovado
            </Badge>
          ) : (
            <Badge className="bg-[#FBF3DC] text-[#8B6914] text-[10px] border border-[#D4AF37]">
              Rascunho — salvo automaticamente, editável
            </Badge>
          )}
          {aprovado && plan.approved_at && (
            <span className="text-[10px] text-[#6B4F42]">
              em {new Date(plan.approved_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
        {!aprovado && (
          <Button
            size="sm"
            type="button"
            className="bg-[#2E8B57] hover:bg-[#257047] text-white text-xs font-semibold"
            onClick={() => handleApprovePlan(kind)}
            disabled={approvingPlan}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar planejamento
          </Button>
        )}
        {aprovado && (
          <Button
            size="sm"
            type="button"
            className="btn-terracotta-gold text-xs font-semibold"
            onClick={() => patient && printPlan(plan, patient.name)}
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir planejamento
          </Button>
        )}
      </Card>
    )
  }

  if (!patient)
    return <div className="p-8 text-center text-xs text-[#6B4F42]">Carregando paciente...</div>

  const tabTriggerClass = 'text-xs data-[state=active]:bg-[#C66B4D] data-[state=active]:text-white'
  const photoUrl = getPatientPhotoUrl(patient)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pacientes')}>
          <ChevronLeft className="w-5 h-5 text-[#2D1B14]" />
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="w-14 h-14 border-2 border-[#D4AF37]">
            {photoUrl && <AvatarImage src={photoUrl} alt={patient.name} />}
            <AvatarFallback className="bg-[#C66B4D] text-white font-bold">
              {patient.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">
              {patient.preferred_name
                ? `${patient.name} (${patient.preferred_name})`
                : patient.name}
            </h2>
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

      <div>
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
            <TabsTrigger value="odontologico" className={tabTriggerClass}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Planejamento Odontológico
            </TabsTrigger>
            <TabsTrigger value="documentos" className={tabTriggerClass}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="financeiro" className={tabTriggerClass}>
              <DollarSign className="w-3.5 h-3.5 mr-1" /> Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="mt-4">
            <CadastroTab patient={patient} />
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
                  className="bg-white border border-[#EDE3D8] p-2 rounded-xl text-center space-y-2 relative flex flex-col"
                >
                  <img
                    src={getImageUrl(img)}
                    alt="Prontuário"
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <p className="text-[11px] font-semibold text-[#2D1B14]">
                    {img.image_type?.toUpperCase()}
                  </p>
                  {/* Ações centralizadas logo abaixo da foto, dentro da margem */}
                  <div className="w-full flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] text-[#C66B4D] border-[#C66B4D]/40 hover:bg-[#FBF3DC] whitespace-nowrap px-2"
                      onClick={() => setSelectedImageForPlan(img)}
                    >
                      Anotar no Plano HOF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 px-0 text-[10px] text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                      onClick={() => setImageToDelete(img)}
                      title="Excluir foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {images.length === 0 && (
              <p className="text-xs text-[#6B4F42] text-center py-6">
                Nenhuma foto ou radiografia cadastrada ainda.
              </p>
            )}
          </TabsContent>

          <TabsContent value="planejamento" className="mt-4 space-y-6">
            <PlanListBar
              plans={plans}
              kind="hof"
              activePlanId={activeHofPlan?.id}
              onOpenPlan={openPlanInEditor}
              onNewPlan={() => handleNewPlan('hof')}
              creating={creatingPlan === 'hof'}
            />
            {activeHofPlan ? (
              <>
                {approvalBar('hof')}
                <p className="text-xs text-[#6B4F42] bg-white border border-[#EDE3D8] rounded-xl p-3">
                  Desenhe/anote livremente sobre a foto abaixo e insira os procedimentos na
                  &quot;tabela de procedimentos&quot; (sem áreas clicáveis sobre a foto; sem
                  odontograma). Para usar outra foto, selecione-a na aba &quot;Fotografias e
                  Radiografias&quot;.
                </p>
                <FacialPlanning
                  procedures={procedures}
                  items={hoofTreatments}
                  onChange={setHoofTreatments}
                  patientPhotoUrl={
                    selectedImageForPlan
                      ? getImageUrl(selectedImageForPlan)
                      : getPatientPhotoUrl(patient)
                  }
                  initialAnnotations={hofAnnotations}
                  onSaveAnnotations={handleSaveHofAnnotations}
                  locked={activeHofPlan.approval_status === 'aprovado'}
                />
                <PaymentInfo
                  plan={hoofPaymentPlan}
                  onPlanChange={setHoofPaymentPlan}
                  total={hoofTreatments.reduce((s, t) => s + t.price, 0)}
                  formatCurrency={formatCurrency}
                  locked={activeHofPlan.approval_status === 'aprovado'}
                />
              </>
            ) : (
              <p className="text-xs text-[#6B4F42] bg-white border border-[#EDE3D8] rounded-xl p-4 text-center">
                Nenhum planejamento HOF aberto — clique em “Novo planejamento” acima ou escolha um
                da lista.
              </p>
            )}
          </TabsContent>

          <TabsContent value="odontologico" className="mt-4 space-y-6">
            <PlanListBar
              plans={plans}
              kind="odontologico"
              activePlanId={activeDentalPlan?.id}
              onOpenPlan={openPlanInEditor}
              onNewPlan={() => handleNewPlan('odontologico')}
              creating={creatingPlan === 'odontologico'}
            />
            {activeDentalPlan ? (
              <>
                {approvalBar('odontologico')}
                <OdontogramNew
                  procedures={procedures}
                  items={dentalTreatments}
                  onChange={setDentalTreatments}
                  locked={activeDentalPlan.approval_status === 'aprovado'}
                />
                <PaymentInfo
                  plan={dentalPaymentPlan}
                  onPlanChange={setDentalPaymentPlan}
                  total={dentalTreatments.reduce((s, t) => s + t.price, 0)}
                  formatCurrency={formatCurrency}
                  locked={activeDentalPlan.approval_status === 'aprovado'}
                />
              </>
            ) : (
              <p className="text-xs text-[#6B4F42] bg-white border border-[#EDE3D8] rounded-xl p-4 text-center">
                Nenhum planejamento odontológico aberto — clique em “Novo planejamento” acima ou
                escolha um da lista.
              </p>
            )}
          </TabsContent>

          <TabsContent value="documentos" className="mt-4 space-y-3">
            <DocumentTemplates patient={patient} />
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
            <FinanceiroTab
              transactions={transactions}
              messages={messages}
              patientName={patient.name}
              patientPhone={patient.phone}
              onRefresh={loadAllData}
            />
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

      <AlertDialog open={!!imageToDelete} onOpenChange={(o) => !o && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif-title text-[#2D1B14]">
              Excluir esta foto?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4F42]">
              A foto &quot;{imageToDelete?.image_type}&quot; será removida permanentemente do
              prontuário. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={confirmDeleteImage}
            >
              Sim, excluir foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSaved={loadAllData}
      />
    </div>
  )
}
