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
import {
  getDocuments,
  createDocument,
  attachSignedPdf,
  updateDocument,
  DocumentRecord,
} from '@/services/documents'
import {
  getFinancialTransactions,
  createTransaction,
  FinancialTransactionRecord,
} from '@/services/financial'
import { getMessagesByPatient, MessageRecord } from '@/services/messages'
import { getProcedures } from '@/services/procedures'
import { ProcedureRecord } from '@/services/procedures'
import { formatCurrency } from '@/lib/price-calculation'

import { OdontologicoTab, type Marcas } from '@/components/planning/OdontologicoTab'
import type { Tratamento } from '@/lib/plan-types'
import { orcamentoCents } from '@/lib/orcamento'
import { getProfessionals } from '@/services/professionals'
import { FacialPlanning } from '@/components/planning/FacialPlanning'
import { PaymentInfo, PaymentPlan, normalizePlan } from '@/components/planning/PaymentInfo'
import { PlanListBar } from '@/components/planning/PlanListBar'
import { PdfPreviewModal } from '@/components/documents/PdfPreviewModal'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import CadastroTab from '@/components/patients/CadastroTab'
import { FinanceiroTab } from '@/components/patients/FinanceiroTab'
import { DocumentTemplates } from '@/components/documents/DocumentTemplates'
import { PlanPrintModal } from '@/components/documents/PlanPrintModal'
import { ApprovePlanDialog } from '@/components/documents/ApprovePlanDialog'
import { AttachSignedDialog } from '@/components/documents/AttachSignedDialog'
import { PlanDocsSection } from '@/components/documents/PlanDocsSection'
import { PlanDocSnapshot, DocOptions } from '@/lib/plan-doc'
import { buildArchiveDocument, parseArchiveMeta, contentComAssinatura } from '@/lib/plan-archive'
import { useAuth } from '@/hooks/use-auth'
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
  Eye,
  Save,
  FileDown,
  MessageCircle,
  FileSignature,
  Paperclip,
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

/**
 * Converte os registros persistidos do planejamento odontológico (JSON em
 * virtual_plans.treatments) em Tratamento completo — planos antigos (sem os
 * campos novos) recebem defaults, preservando dentes/procedimentos/valores.
 */
const mapDentalTratamentos = (recs: TreatmentItemRecord[] | null): Tratamento[] =>
  (recs || []).map((r) => {
    const t = (r || {}) as Partial<Tratamento>
    return {
      id: r.id,
      procedureId: r.procedureId,
      procedureName: r.procedureName,
      procedureCode: t.procedureCode,
      tooth: r.tooth || '',
      region: r.region || '',
      faces: r.faces || [],
      price: r.price || 0,
      quantity: t.quantity || 1,
      categoria: t.categoria || 'tratamento',
      professionalId: t.professionalId || '',
      professionalName: t.professionalName || '',
      status: t.status || 'planejado',
      dataPlanejamento: t.dataPlanejamento || new Date().toISOString().slice(0, 10),
      dataExecucao: t.dataExecucao ?? null,
      evolucao: t.evolucao,
      materiais: t.materiais,
      observacoes: t.observacoes || '',
      componentes: t.componentes,
      exodontias: t.exodontias,
      enxerto: t.enxerto,
      implantesCount: t.implantesCount,
      tipoProtese: t.tipoProtese,
      materialProtese: t.materialProtese,
      laboratorio: t.laboratorio,
      modalidadePreco: t.modalidadePreco,
      incluidoNoGlobal: t.incluidoNoGlobal,
      arcada: t.arcada,
      proteseProvisoria: t.proteseProvisoria,
      proteseDefinitiva: t.proteseDefinitiva,
    }
  })

/** Marcas clínicas + desconto da aba odontológica — persistidos em annotations. */
interface DentalNotas {
  marcas: Marcas
  desconto: number
}
const parseDentalNotas = (raw: string | null | undefined): DentalNotas => {
  try {
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return { marcas: p.marcas || {}, desconto: Number(p.desconto) || 0 }
      }
    }
  } catch {
    /* conteúdo legado (não-JSON) — ignora */
  }
  return { marcas: {}, desconto: 0 }
}

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
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([])

  /** Planejamento ativo de cada aba (o que está aberto no editor). */
  const [activeHofPlan, setActiveHofPlan] = useState<VirtualPlanRecord | null>(null)
  const [activeDentalPlan, setActiveDentalPlan] = useState<VirtualPlanRecord | null>(null)
  const [creatingPlan, setCreatingPlan] = useState<PlanKind | null>(null)
  const [approvingPlan, setApprovingPlan] = useState(false)
  const { user } = useAuth()
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printKind, setPrintKind] = useState<PlanKind>('odontologico')
  const [printSignature, setPrintSignature] = useState(false)
  const [approveKind, setApproveKind] = useState<PlanKind | null>(null)
  const [attachKind, setAttachKind] = useState<PlanKind | null>(null)

  const [anamnesis, setAnamnesis] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedImageForPlan, setSelectedImageForPlan] = useState<ImageRecord | null>(null)

  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ImageRecord | null>(null)
  const [hoofTreatments, setHoofTreatments] = useState<PlannedTreatment[]>([])
  const [dentalTreatments, setDentalTreatments] = useState<Tratamento[]>([])
  const [dentalMarcas, setDentalMarcas] = useState<Marcas>({})
  const [dentalDesconto, setDentalDesconto] = useState(0)
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

  /**
   * Snapshot do documento a partir dos dados SALVOS no planejamento — nunca da
   * tabela de preços atual (T9/T12): documentos antigos não mudam.
   */
  const snapshotDoPlano = (plan: VirtualPlanRecord | null): PlanDocSnapshot | null => {
    if (!plan) return null
    const isHof = (plan.kind || 'hof') === 'hof'
    const state = loadPlanningState(plan)
    const payment = normalizePlan({ installments: state.paymentPlan.map(mapPaymentRecord) })
    const notas = isHof ? { desconto: 0 } : parseDentalNotas(state.annotations)
    return {
      planId: plan.id,
      pacienteId: patient?.id,
      kind: isHof ? 'hof' : 'odontologico',
      title: plan.title,
      pacienteNome: patient?.name,
      pacienteCpf: patient?.cpf,
      approvalStatus: plan.approval_status || 'rascunho',
      approvedAt: plan.approved_at,
      approvedBy: plan.approved_by,
      versao: plan.plan_version || 1,
      treatments: isHof
        ? mapTreatmentRecords(state.treatments)
        : mapDentalTratamentos(state.treatments),
      paymentPlan: payment.installments,
      desconto: notas.desconto,
    }
  }

  /** Carrega um registro de planejamento no editor da aba correspondente. */
  const openPlanInEditor = (plan: VirtualPlanRecord) => {
    const state = loadPlanningState(plan)
    // normalizePlan converte planos antigos (linha única com N parcelas) em
    // parcelas individuais em centavos — a lista reaberta segue correta.
    const payment = normalizePlan({ installments: state.paymentPlan.map(mapPaymentRecord) })
    if ((plan.kind || 'hof') === 'hof') {
      setActiveHofPlan(plan)
      setHoofTreatments(mapTreatmentRecords(state.treatments))
      setHoofPaymentPlan(payment)
      setHofAnnotations(state.annotations ?? null)
    } else {
      setActiveDentalPlan(plan)
      setDentalTreatments(mapDentalTratamentos(state.treatments))
      setDentalPaymentPlan(payment)
      // Condições clínicas marcadas no odontograma + desconto são persistidos
      // junto do plano (campo annotations) e reaparecem ao reabrir.
      const notas = parseDentalNotas(state.annotations)
      setDentalMarcas(notas.marcas)
      setDentalDesconto(notas.desconto)
    }
  }

  // Persistência (debounce simples) dos planejamentos HOF e Odontológico
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const persistPlanning = (
    key: string,
    record: VirtualPlanRecord | null,
    treatments: TreatmentItemRecord[],
    paymentPlan: PaymentPlan,
    annotations?: string | null,
  ) => {
    if (!record || record.approval_status === 'aprovado') return
    if (saveTimer.current[key]) clearTimeout(saveTimer.current[key])
    saveTimer.current[key] = setTimeout(() => {
      savePlanningState(record, {
        // O spread preserva os campos extras do Tratamento (status, execução,
        // protocolos/implantes, condições de pagamento…) no JSON do plano.
        treatments: treatments.map((t) => ({
          ...t,
          id: t.id,
          procedureId: t.procedureId,
          procedureName: t.procedureName,
          tooth: t.tooth,
          region: t.region,
          faces: t.faces,
          price: t.price,
        })),
        ...(annotations !== undefined ? { annotations } : {}),
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
    persistPlanning(
      'odontologico',
      activeDentalPlan,
      dentalTreatments as unknown as TreatmentItemRecord[],
      dentalPaymentPlan,
      JSON.stringify({ marcas: dentalMarcas, desconto: dentalDesconto }),
    )
  }, [dentalTreatments, dentalPaymentPlan, activeDentalPlan, dentalMarcas, dentalDesconto])

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
  /**
   * Lança o plano de pagamento do planejamento como transações (receitas/parcelas)
   * na aba Financeiro — apenas uma vez por planejamento (chave = virtual_plans.id).
   */
  const syncPlanToFinancial = async (
    plan: VirtualPlanRecord,
    paymentPlan: PaymentPlan,
    tipoLabel: string,
  ) => {
    const trans = await getFinancialTransactions(`patient="${plan.patient}"`)
    const prefix = `Plan ${plan.id} · Parcela`
    const jaTem = trans.some((t) => t.description?.startsWith(prefix))
    if (jaTem) return
    const parcelas = paymentPlan.installments
    if (parcelas.length === 0) return
    await Promise.all(
      parcelas.map((p, i) =>
        createTransaction({
          patient: plan.patient,
          description: `${prefix} ${i + 1}/${parcelas.length} — ${tipoLabel}`,
          amount: p.amount,
          transaction_date: p.due_date || new Date().toISOString().slice(0, 10),
          transaction_type: 'receita',
          status: 'pendente',
          payment_method: (p.method as FinancialTransactionRecord['payment_method']) || 'pix',
        }),
      ),
    )
  }

  const handleApprovePlan = async (kind: PlanKind) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    if (!plan || plan.approval_status === 'aprovado') return
    setApprovingPlan(true)
    try {
      const aprovado = await updateVirtualPlan(plan.id, {
        approval_status: 'aprovado',
        approved_at: new Date().toISOString(),
        approved_by: user?.name || '—',
      })
      setPlans((prev) => prev.map((p) => (p.id === aprovado.id ? aprovado : p)))
      if (kind === 'hof') setActiveHofPlan(aprovado)
      else setActiveDentalPlan(aprovado)
      // Lança as parcelas na aba Financeiro (uma vez por planejamento, idempotente).
      try {
        const paymentPlan = kind === 'hof' ? hoofPaymentPlan : dentalPaymentPlan
        await syncPlanToFinancial(aprovado, paymentPlan, kind === 'hof' ? 'HOF' : 'Odontológico')
        // Recarrega os dados para que as parcelas apareçam IMEDIATAMENTE na aba
        // Financeiro (sem depender de recarregar a página).
        await loadAllData()
        toast({
          title:
            'Planejamento aprovado! Parcelas lançadas no Financeiro — as edições ficam bloqueadas.',
          description:
            'Vá à aba "Financeiro" para acompanhar as parcelas, marcar como pagas e emitir recibos.',
        })
      } catch {
        toast({
          title: 'Planejamento aprovado — mas houve erro ao lançar as parcelas no Financeiro.',
          variant: 'destructive',
        })
      }
    } catch (_) {
      toast({ title: 'Erro ao aprovar o planejamento', variant: 'destructive' })
    } finally {
      setApprovingPlan(false)
    }
  }

  /** Salva imediatamente o planejamento ativo (botão "Salvar planejamento"). */
  const salvarAgora = async (kind: PlanKind) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    if (!plan) return
    if (plan.approval_status === 'aprovado') {
      toast({ title: 'Planejamento aprovado — já está salvo e bloqueado para edição.' })
      return
    }
    try {
      if (kind === 'hof') {
        await savePlanningState(plan, {
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
        })
      } else {
        await savePlanningState(plan, {
          treatments: dentalTreatments.map((t) => ({
            ...t,
            id: t.id,
            procedureId: t.procedureId,
            procedureName: t.procedureName,
            tooth: t.tooth,
            region: t.region,
            faces: t.faces,
            price: t.price,
          })),
          paymentPlan: dentalPaymentPlan.installments.map((i) => ({
            id: i.id,
            kind: i.kind,
            method: i.method,
            amount: i.amount,
            due_date: i.due_date,
            installments_count: i.installments_count ?? 1,
          })),
          annotations: JSON.stringify({ marcas: dentalMarcas, desconto: dentalDesconto }),
        })
      }
      toast({ title: 'Planejamento salvo!' })
    } catch (_) {
      toast({ title: 'Erro ao salvar o planejamento', variant: 'destructive' })
    }
  }

  /**
   * Arquiva o documento gerado na área Documentos do Planejamento (snapshot
   * dos dados salvos + auditoria). Idempotente por dia/tipo — reabrir a prévia
   * no mesmo dia não duplica o registro.
   */
  const arquivarDoc = async (kind: PlanKind, signature: boolean) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    const s = snapshotDoPlano(plan)
    if (!plan || !s) return
    const tipo = signature ? 'aceite' : s.approvalStatus === 'aprovado' ? 'aprovado' : 'orcamento'
    const hoje = new Date().toISOString().slice(0, 10)
    const jaExiste = documents.some((d) => {
      const m = parseArchiveMeta(d)
      return m.planId === plan.id && d.document_type === tipo && d.created.slice(0, 10) === hoje
    })
    if (jaExiste) return
    const o: DocOptions = {
      modo: 'detalhado',
      hideValues: false,
      signature,
      emitidoPor: user?.name || '—',
      emitidoEm: new Date().toISOString(),
    }
    try {
      const rec = await createDocument(
        buildArchiveDocument(s, o, {
          geradoEm: new Date().toISOString(),
          geradoPor: user?.name || '—',
          versao: plan.plan_version || 1,
          assinaturaStatus:
            plan.signature_status === 'assinado' ? 'assinado' : 'aguardando_assinatura',
          assinadoEm: plan.signed_at,
          assinadoRegistradoPor: plan.signed_by,
          planId: plan.id,
          planTitle: plan.title,
        }),
      )
      setDocuments((prev) => [rec, ...prev])
    } catch (_) {
      /* arquivamento silencioso — a prévia/impressão continua funcionando */
    }
  }

  /** Abre a prévia (Visualizar impressão / Imprimir / PDF / WhatsApp / assinatura). */
  const abrirPrintModal = (kind: PlanKind, signature = false) => {
    setPrintKind(kind)
    setPrintSignature(signature)
    setPrintModalOpen(true)
    arquivarDoc(kind, signature)
  }

  /** Marca o planejamento como assinado pelo paciente (data + usuário). */
  const marcarAssinado = async (planId: string, signedDate: string, por: string) => {
    const upd = await updateVirtualPlan(planId, {
      signature_status: 'assinado',
      signed_at: new Date(`${signedDate}T12:00:00`).toISOString(),
      signed_by: por,
    })
    setPlans((prev) => prev.map((p) => (p.id === upd.id ? upd : p)))
    setActiveHofPlan((p) => (p && p.id === upd.id ? upd : p))
    setActiveDentalPlan((p) => (p && p.id === upd.id ? upd : p))
    if (id) setDocuments(await getDocuments(id))
  }

  /** Anexa o PDF digitalizado assinado (botão "Anexar documento assinado"). */
  const handleAttachSigned = async (
    kind: PlanKind,
    file: File,
    signedDate: string,
    por: string,
  ) => {
    const plan = kind === 'hof' ? activeHofPlan : activeDentalPlan
    const s = snapshotDoPlano(plan)
    if (!plan || !s) throw new Error('Nenhum planejamento ativo')
    const o: DocOptions = {
      modo: 'detalhado',
      hideValues: false,
      signature: true,
      emitidoPor: por,
      emitidoEm: new Date().toISOString(),
    }
    const rec = await createDocument({
      ...buildArchiveDocument(s, o, {
        geradoEm: new Date().toISOString(),
        geradoPor: por,
        versao: plan.plan_version || 1,
        assinaturaStatus: 'assinado',
        assinadoEm: signedDate,
        assinadoRegistradoPor: por,
        planId: plan.id,
        planTitle: plan.title,
      }),
      document_type: 'assinado',
    })
    await attachSignedPdf(rec.id, file)
    await marcarAssinado(plan.id, signedDate, por)
  }

  /** Registra a assinatura num documento arquivado (área Documentos). */
  const handleRegisterSignature = async (docId: string, signedDate: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) throw new Error('Documento não encontrado')
    const por = user?.name || '—'
    await updateDocument(docId, {
      content: contentComAssinatura(doc.content || '', signedDate, por),
    })
    const meta = parseArchiveMeta(doc)
    if (meta.planId) await marcarAssinado(meta.planId, signedDate, por)
    else if (id) setDocuments(await getDocuments(id))
  }

  /** Anexa o PDF digitalizado num documento já arquivado (área Documentos). */
  const handleAttachPdfToDoc = async (docId: string, file: File) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) throw new Error('Documento não encontrado')
    await attachSignedPdf(docId, file)
    const meta = parseArchiveMeta(doc)
    const por = user?.name || '—'
    if (meta.planId) await marcarAssinado(meta.planId, new Date().toISOString().slice(0, 10), por)
    else if (id) setDocuments(await getDocuments(id))
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
      const pros = await getProfessionals()
      setProfessionals(pros.map((p) => ({ id: p.id, name: p.name })))
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

  // Total do planejamento odontológico em centavos (orçamento − desconto) —
  // alimenta as condições de pagamento; protocolos globais não somam duas vezes.
  const dentalOrcCents = orcamentoCents(dentalTreatments)
  const dentalDescontoC = Math.min(
    dentalOrcCents,
    Math.max(0, Math.round((dentalDesconto || 0) * 100)),
  )
  const dentalTotal = (dentalOrcCents - dentalDescontoC) / 100

  // Total contratado = soma dos procedimentos dos planejamentos aprovados
  // (ou, na falta deles, dos rascunhos abertos) — base do saldo e das recibos.
  const totalContratado =
    plans
      .filter((p) => p.approval_status === 'aprovado')
      .reduce(
        (s, p) =>
          s + (loadPlanningState(p).treatments || []).reduce((x, t) => x + (t.price || 0), 0),
        0,
      ) ||
    Math.max(
      hoofTreatments.reduce((s, t) => s + (t.price || 0), 0),
      dentalTreatments.reduce((s, t) => s + (t.price || 0), 0),
    )

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
                  planId={activeHofPlan.id}
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
                <OdontologicoTab
                  procedures={procedures}
                  professionals={professionals}
                  tratamentos={dentalTreatments}
                  onChange={setDentalTreatments}
                  locked={activeDentalPlan.approval_status === 'aprovado'}
                  desconto={dentalDesconto}
                  onDescontoChange={setDentalDesconto}
                  marcas={dentalMarcas}
                  onMarcasChange={(m) =>
                    setDentalMarcas(
                      typeof m === 'function' ? (m as (p: Marcas) => Marcas)(dentalMarcas) : m,
                    )
                  }
                  patientId={id || ''}
                />
                <PaymentInfo
                  plan={dentalPaymentPlan}
                  onPlanChange={setDentalPaymentPlan}
                  planId={activeDentalPlan.id}
                  total={dentalTotal}
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
              patient={patient}
              patientName={patient.name}
              patientPhone={patient.phone}
              totalContratado={totalContratado}
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
