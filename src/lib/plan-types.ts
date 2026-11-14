import type { ProcedureRecord } from '@/services/procedures'

/**
 * Tipos do novo módulo de planejamento odontológico clínico.
 * Tudo o que é persistido em virtual_plans.treatments (JSON) vive aqui.
 */

/** Regiões bucais nomeadas (fora dos dentes FDI). */
export const REGIOES = [
  'Arcada superior',
  'Arcada inferior',
  'Arcadas (superior + inferior)',
  'Maxila (enxerto/seio)',
  'Mandíbula (enxerto/seio)',
  'Gengiva/periodonto',
  'Boca toda',
] as const

/** Status do ciclo de vida de um item planejado. */
export const STATUS_ITEM = ['planejado', 'aprovado', 'executado', 'cancelado'] as const
export type ItemStatus = (typeof STATUS_ITEM)[number]

export const STATUS_LABEL: Record<ItemStatus, string> = {
  planejado: 'Planejado',
  aprovado: 'Aprovado',
  executado: 'Executado',
  cancelado: 'Cancelado',
}

export const STATUS_COR: Record<ItemStatus, string> = {
  planejado: 'bg-[#FBF3DC] text-[#8B6914] border-[#D4AF37]',
  aprovado: 'bg-[#2E8B57] text-white border-[#2E8B57]',
  executado: 'bg-[#2D1B14] text-white border-[#2D1B14]',
  cancelado: 'bg-[#FBE8E4] text-[#A34A2E] border-[#C66B4D]',
}

/** Condições clínicas observadas no exame (desenho no odontograma). */
export type CondicaoClinica =
  | 'carie'
  | 'restauracao'
  | 'coroa'
  | 'protese'
  | 'implante'
  | 'canal'
  | 'ausente'
  | 'edentulo'
  | 'fratura'
  | 'raspagem'

export const CONDICOES: {
  key: CondicaoClinica
  label: string
  cor: string
  simbolo: string
  descricao: string
}[] = [
  {
    key: 'carie',
    label: 'Cárie',
    cor: '#C0392B',
    simbolo: 'O',
    descricao: 'Lesão de cárie (círculo vermelho)',
  },
  {
    key: 'restauracao',
    label: 'Restauração',
    cor: '#2E6FB7',
    simbolo: 'R',
    descricao: 'Restauração existente (azul)',
  },
  {
    key: 'coroa',
    label: 'Coroa/Prótese fixa',
    cor: '#D4AF37',
    simbolo: '◆',
    descricao: 'Coroa ou prótese fixa (dourado)',
  },
  {
    key: 'protese',
    label: 'Prótese removível/total',
    cor: '#7D5BA6',
    simbolo: 'P',
    descricao: 'Prótese removível ou total (roxo)',
  },
  {
    key: 'implante',
    label: 'Implante',
    cor: '#2E8B57',
    simbolo: ' screws ',
    descricao: 'Implante instalado (parafuso verde)',
  },
  {
    key: 'canal',
    label: 'Tratamento de canal',
    cor: '#E67E22',
    simbolo: 'T',
    descricao: 'Endodontia (laranja, raízes marcadas)',
  },
  {
    key: 'ausente',
    label: 'Dente ausente',
    cor: '#94A3B8',
    simbolo: 'X',
    descricao: 'Extraído/ausente (X cinza)',
  },
  {
    key: 'edentulo',
    label: 'Região edêntula',
    cor: '#B7A99A',
    simbolo: '~',
    descricao: 'Região edêntula (hachura bege)',
  },
  {
    key: 'fratura',
    label: 'Fratura',
    cor: '#A34A2E',
    simbolo: '/\\',
    descricao: 'Fratura/desgaste (marca terracota)',
  },
  {
    key: 'raspagem',
    label: 'Raspagem/periodonto',
    cor: '#C66B4D',
    simbolo: '•',
    descricao: 'Raspagem, pontos de sangramento (terracota)',
  },
]

export const condicaoInfo = (key: CondicaoClinica) =>
  CONDICOES.find((c) => c.key === key) || CONDICOES[0]

/**
 * Item de tratamento planejado — um registro INDEPENDENTE por procedimento ×
 * dente/região. Vários tratamentos no mesmo dente coexistem (ex.: 16 com
 * canal + pino + núcleo + coroa).
 */
export interface Tratamento {
  id: string
  procedureId: string
  /** Nome do procedimento (copiado para histórico — sem join ao abrir). */
  procedureName: string
  /** Código do procedimento na tabela (quando existir). */
  procedureCode?: string
  /** Dente FDI quando aplicável ('16'), senão vazio. */
  tooth: string
  /** Região nomeada quando não é um dente específico. */
  region: string
  /** Faces dentárias (M, D, O, V, L, C — mesial, distal, oclusal, vestibular, lingual, cervical). */
  faces: string[]
  /** Preço unitário em reais (persistido; internamente os totais usam centavos). */
  price: number
  quantity: number
  /** Categoria do item: tratamento comum, implante ou protocolo sobre implantes. */
  categoria: 'tratamento' | 'implante' | 'protocolo'
  /** Dentista/profissional executor (id de professionals). */
  professionalId: string
  /** Nome do profissional (histórico, sem join). */
  professionalName: string
  /** Status de execução. */
  status: ItemStatus
  /** Data do planejamento (yyyy-mm-dd). */
  dataPlanejamento: string
  /** Data de conclusão quando executado. */
  dataExecucao?: string | null
  /** Evolução/nota clínica quando executado. */
  evolucao?: string
  /** Materiais usados na execução. */
  materiais?: string
  /** Observações clínicas. */
  observacoes: string
  // ---- campos específicos de implantes ----
  /** Componentes do implante (marcador, pilar, prótese). */
  componentes?: string
  /** Exodontias associadas ao implante (dentes). */
  exodontias?: string
  /** Enxerto/levantamento de seio. */
  enxerto?: string
  /** Nº de implantes da região (protocolo). */
  implantesCount?: number
  /** Tipo de prótese do protocolo. */
  tipoProtese?: string
  /** Material da prótese do protocolo. */
  materialProtese?: string
  /** Laboratório do protocolo. */
  laboratorio?: string
  /**
   * Modalidade de preço do protocolo: 'global' (preço já inclui os itens
   * listados — não somar de novo) ou 'individual' (soma dos itens).
   */
  modalidadePreco?: 'global' | 'individual'
  /**
   * Quando 'global', o valor do protocolo já cobre os itens com
   * incluidoNoGlobal=true; estes NÃO entram no orçamento.
   */
  incluidoNoGlobal?: boolean
  /** Arcada do protocolo: superior, inferior ou ambas. */
  arcada?: 'superior' | 'inferior' | 'ambas'
  /** Prótese provisória incluída? */
  proteseProvisoria?: boolean
  /** Prótese definitiva incluída? */
  proteseDefinitiva?: boolean
}

/** Item simples de lançamento financeiro previsto (fase de planejamento). */
export const REGIOES_LABEL = REGIOES

/** Total em reais de um item (preço × quantidade), seguro para undefined. */
export const itemSubtotal = (t: Tratamento) => (t.price || 0) * (t.quantity || 1)

/** Itens válidos para orçamento (não cancelados; globais excluem os incluídos). */
export const itemOrcamentavel = (t: Tratamento) =>
  t.status !== 'cancelado' &&
  !(t.incluidoNoGlobal === true && t.categoria === 'protocolo' && t.modalidadePreco === 'global')

export const facesLabel = (faces: string[]) => (faces.length ? faces.join(', ') : '')

/** Cria um Tratamento a partir de um procedimento da tabela. */
export function tratamentoFromProcedure(
  p: ProcedureRecord,
  opts: Partial<Tratamento> = {},
): Tratamento {
  const base: Tratamento = {
    id: `tt${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    procedureId: p.id,
    procedureName: p.name,
    procedureCode: (p as unknown as { code?: string }).code || '',
    tooth: '',
    region: '',
    faces: [],
    price:
      p.use_manual_price && p.manual_price != null
        ? p.manual_price
        : (p.price ?? p.computed_price ?? p.manual_price ?? 0),
    quantity: 1,
    categoria: 'tratamento',
    professionalId: '',
    professionalName: '',
    status: 'planejado',
    dataPlanejamento: new Date().toISOString().slice(0, 10),
    dataExecucao: null,
    observacoes: '',
    ...opts,
  }
  return base
}

/**
 * Orçamento do planejamento — todos os cálculos em centavos inteiros.
 * Regra dos protocolos globais: itens marcados incluidoNoGlobal=true NÃO
 * entram na soma (o preço global já os cobre).
 */
export function orcamento(tratamentos: Tratamento[]) {
  const ativos = tratamentos.filter((t) => t.status !== 'cancelado')
  const orçamentáveis = ativos.filter((t) => !t.incluidoNoGlobal)
  const subtotalCents = orçamentáveis.reduce((s, t) => s + Math.round(itemSubtotal(t) * 100), 0)

  // Subtotais por arcada para protocolos
  const porArcada = { superior: 0, inferior: 0, ambas: 0 } as Record<string, number>
  ativos
    .filter((t) => t.categoria === 'protocolo')
    .forEach((t) => {
      const key = t.arcada || 'ambas'
      porArcada[key] = (porArcada[key] || 0) + Math.round(itemSubtotal(t) * 100)
    })

  // Contagem de implantes planejados
  const implantesCount = ativos
    .filter((t) => t.categoria === 'implante')
    .reduce((s, t) => s + (t.quantity || 1), 0)

  return {
    ativos,
    orçamentáveis,
    subtotalCents,
    subtotal: Math.round(subtotalCents) / 100,
    porArcada,
    implantesCount,
    /** true quando nenhum item válido tem preço positivo */
    vazio: orçamentáveis.length === 0,
    /** true quando existem itens mas todos com preço 0 → mensagem explicativa */
    semPrecos: orçamentáveis.length > 0 && subtotalCents === 0,
  }
}
