/**
 * Categorização do agendamento pela categoria de tratamento (pedido da usuária):
 * cirurgias (implante, extração) → VERMELHO; raspagem/profilaxia → AZUL;
 * HOF (harmonização orofacial) → DOURADO (identidade LFG); aparelhos/ortodontia → VERDE.
 * Deriva do nome do procedimento associado (ou texto do agendamento) — sem campo novo no banco.
 */
import type { AppointmentRecord } from '@/services/appointments'

export type AppointmentCategory =
  | 'cirurgia'
  | 'profilaxia'
  | 'hof'
  | 'ortodontia'
  | 'endodontia'
  | 'dentistica'
  | 'protese'
  | 'outros'

export const CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  cirurgia: 'Cirurgia (implante, extração)',
  profilaxia: 'Raspagem / Profilaxia',
  hof: 'HOF (Harmonização Orofacial)',
  ortodontia: 'Aparelhos / Ortodontia',
  endodontia: 'Endodontia (canal)',
  dentistica: 'Dentística (restaurações)',
  protese: 'Prótese',
  outros: 'Outros',
}

/** Chip completo (fundo+texto+borda) por categoria — cores sóbrias da identidade. */
export const CATEGORY_STYLES: Record<
  AppointmentCategory,
  { chip: string; stripe: string; dot: string }
> = {
  cirurgia: {
    chip: 'bg-red-100 text-red-900 border-red-300',
    stripe: 'border-l-4 border-l-red-400',
    dot: 'bg-red-400',
  },
  profilaxia: {
    chip: 'bg-blue-100 text-blue-900 border-blue-300',
    stripe: 'border-l-4 border-l-blue-400',
    dot: 'bg-blue-400',
  },
  hof: {
    chip: 'bg-[#F3E3BC] text-[#7A5C12] border-[#D9C17C]',
    stripe: 'border-l-4 border-l-[#D4AF37]',
    dot: 'bg-[#D4AF37]',
  },
  ortodontia: {
    chip: 'bg-green-100 text-green-900 border-green-300',
    stripe: 'border-l-4 border-l-green-400',
    dot: 'bg-green-400',
  },
  endodontia: {
    chip: 'bg-violet-100 text-violet-900 border-violet-300',
    stripe: 'border-l-4 border-l-violet-400',
    dot: 'bg-violet-400',
  },
  dentistica: {
    chip: 'bg-teal-100 text-teal-900 border-teal-300',
    stripe: 'border-l-4 border-l-teal-400',
    dot: 'bg-teal-400',
  },
  protese: {
    chip: 'bg-orange-100 text-orange-900 border-orange-300',
    stripe: 'border-l-4 border-l-orange-400',
    dot: 'bg-orange-400',
  },
  outros: {
    chip: 'bg-[#FAF6F0] text-[#6B4F42] border-[#EDE3D8]',
    stripe: 'border-l-4 border-l-[#EDE3D8]',
    dot: 'bg-[#C9B8A6]',
  },
}

/** Palavras-chave por categoria (avaliadas nesta ordem; acentos ignorados). */
const KEYWORDS: { category: AppointmentCategory; terms: string[] }[] = [
  {
    category: 'cirurgia',
    terms: [
      'implante',
      'implant',
      'extracao',
      'exodontia',
      'cirurgia',
      'cirurgico',
      'cirurgica',
      'siso',
      'enxerto',
      'levantamento de seio',
      'remocao de siso',
    ],
  },
  {
    category: 'profilaxia',
    terms: ['raspagem', 'profilaxia', 'limpeza', 'prevencao', 'fluor', 'detartraje', 'selante'],
  },
  {
    category: 'hof',
    terms: [
      'harmonizacao',
      'harmoniza',
      'hof',
      'botox',
      'toxina',
      'preenchimento',
      'acido hialuronico',
      'bioestimulador',
      'lifting facial',
      'fios de pdo',
      'fios',
      'rinomodelacao',
    ],
  },
  {
    category: 'ortodontia',
    terms: [
      'aparelho',
      'ortodontia',
      'ortopedia',
      'alinhador',
      'invisalign',
      'contencao',
      'manutencao de aparelho',
      'mordida',
    ],
  },
  {
    category: 'endodontia',
    terms: ['canal', 'endodontia', 'retratamento', 'pulpotomia', 'desobstrucao'],
  },
  {
    category: 'dentistica',
    terms: [
      'restauracao',
      'resina',
      'dentistica',
      'clareamento',
      'faceta',
      'lente de contato',
      'diastema',
    ],
  },
  {
    category: 'protese',
    terms: [
      'protese',
      'coroa',
      'ponte',
      'onlay',
      'inlay',
      'nucleo',
      'poste',
      'ceramica',
      'zirconia',
      'provisorio',
    ],
  },
]

/** minúsculas + sem acentos, para casar "Extração" = "extracao". */
function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Categoria do agendamento: nome do procedimento vinculado → texto livre
 * (notas). Fallback pela categoria cadastrada do procedimento; senão "outros"
 * (cor neutra padrão).
 */
export function categorizeAppointment(app: AppointmentRecord): AppointmentCategory {
  const proc = app.expand?.procedure
  const text = normalize(
    [proc?.name, app.notes, app.expand?.procedure?.description].filter(Boolean).join(' · '),
  )
  if (text) {
    for (const group of KEYWORDS) {
      if (group.terms.some((t) => text.includes(normalize(t)))) return group.category
    }
  }
  // Fallback pela categoria cadastrada na tabela de procedimentos.
  if (proc?.category === 'harmonizacao' || proc?.category === 'estetica') return 'hof'
  if (proc?.category === 'dentista') return 'dentistica'
  return 'outros'
}
