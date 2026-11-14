import {
  PlanDocSnapshot,
  DocOptions,
  buildPlanDocLines,
  tituloDoc,
  numeroPlanejamento,
} from '@/lib/plan-doc'
import { DocumentRecord } from '@/services/documents'

/**
 * Arquivamento do documento do planejamento na coleção documents.
 * REGRA DE SNAPSHOT: o conteúdo arquivado é gerado a partir dos dados SALVOS
 * do planejamento (virtual_plans.treatments/payment_plan) — nunca da tabela de
 * preços atual — e não é mais alterado depois: mudanças posteriores no
 * planejamento geram NOVA versão, sem modificar documentos já assinados.
 */

/** Metadados de auditoria gravados no texto do documento arquivado. */
export interface DocArchiveMeta {
  /** Data/hora ISO da geração do arquivo. */
  geradoEm: string
  /** Nome do usuário responsável pela geração. */
  geradoPor?: string
  /** Versão do planejamento (campos 0013). */
  versao?: number
  /** Status da assinatura do paciente (separado da aprovação). */
  assinaturaStatus?: 'aguardando_assinatura' | 'assinado'
  /** Data (ISO) em que o paciente assinou, quando informada. */
  assinadoEm?: string | null
  /** Nome de quem registrou a assinatura. */
  assinadoRegistradoPor?: string | null
  /** Id do planejamento de origem (virtual_plans.id). */
  planId: string
  /** Título do planejamento. */
  planTitle?: string
}

/**
 * Tipo do documento arquivado: aceite quando é o documento de assinatura;
 * planejamento aprovado quando o snapshot já está aprovado; orçamento
 * (proposta) quando não. O tipo "assinado" é gravado apenas pelo fluxo de
 * anexação do PDF digitalizado (nunca pelo clique de aprovar).
 */
const docKind = (s: PlanDocSnapshot, o: DocOptions): DocumentRecord['document_type'] => {
  if (o.signature) return 'aceite'
  return s.approvalStatus === 'aprovado' ? 'aprovado' : 'orcamento'
}

/**
 * Constrói o registro (não-criado) do documento arquivado: conteúdo em texto
 * plano completo (linhas do motor A4) + cabeçalho de auditoria.
 */
export function buildArchiveDocument(
  s: PlanDocSnapshot,
  o: DocOptions,
  meta: DocArchiveMeta,
): Partial<DocumentRecord> {
  const linhas = buildPlanDocLines(s, o)
  const assinado = meta.assinaturaStatus === 'assinado'
  const header = [
    `# Planejamento: ${meta.planTitle || numeroPlanejamento(meta.planId)}`,
    `# Plano Id: ${meta.planId}`,
    `# Plano Nº: ${numeroPlanejamento(meta.planId)} | Versão: ${meta.versao || 1}`,
    `# Gerado em: ${new Date(meta.geradoEm).toLocaleString('pt-BR')}${meta.geradoPor ? ` por ${meta.geradoPor}` : ''}`,
    `# Assinatura: ${
      assinado
        ? `ASSINADO em ${meta.assinadoEm ? new Date(meta.assinadoEm).toLocaleDateString('pt-BR') : '—'}`
        : 'aguardando assinatura do paciente'
    }${assinado && meta.assinadoRegistradoPor ? ` | registrado por ${meta.assinadoRegistradoPor}` : ''}`,
    '',
  ].join('\n')
  return {
    patient: s.pacienteId || '',
    document_type: docKind(s, o),
    title: `${tituloDoc(s, o.signature)} — v${meta.versao || 1}`,
    content: `${header}${linhas.join('\n')}\n`,
  }
}

/** Extrai os metadados de auditoria de um documento arquivado. */
export function parseArchiveMeta(doc: DocumentRecord | null | undefined): {
  versao: number
  geradoEm: string | null
  geradoPor: string | null
  assinaturaStatus: 'aguardando_assinatura' | 'assinado'
  assinadoEm: string | null
  assinadoRegistradoPor: string | null
  planId: string | null
} {
  const content = doc?.content || ''
  const get = (prefix: string) => {
    const line = content.split('\n').find((l) => l.startsWith(prefix))
    return line ? line.slice(prefix.length).trim() : null
  }
  const planoLine = get('# Plano Nº: ') || ''
  const planoIdLine = get('# Plano Id: ')
  const geradoLine = get('# Gerado em: ')
  const assinLine = get('# Assinatura: ') || ''
  // "# Gerado em: dd/mm/aaaa hh:mm por Nome" → separa data e responsável
  const mGer = geradoLine?.match(/^([\d/:\s]+?)(?:\s+por\s+(.+))?$/)
  const mAssin = assinLine.match(/^ASSINADO em ([^|]+?)(?:\s*\|\s*registrado por (.+))?$/)
  return {
    versao: Number(planoLine.match(/Versão:\s*(\d+)/)?.[1]) || 1,
    geradoEm: mGer ? mGer[1].trim() : null,
    geradoPor: mGer?.[2]?.trim() || null,
    assinaturaStatus: assinLine.startsWith('ASSINADO') ? 'assinado' : 'aguardando_assinatura',
    assinadoEm: mAssin?.[1]?.trim() || null,
    assinadoRegistradoPor: mAssin?.[2]?.trim() || null,
    planId: planoIdLine || null,
  }
}

/** Atualiza o cabeçalho de auditoria do conteúdo com a assinatura registrada. */
export function contentComAssinatura(
  content: string,
  assinadoEm: string,
  registradoPor: string,
): string {
  const linhas = content.split('\n')
  const i = linhas.findIndex((l) => l.startsWith('# Assinatura: '))
  if (i >= 0) {
    linhas[i] =
      `# Assinatura: ASSINADO em ${new Date(assinadoEm).toLocaleDateString('pt-BR')} | registrado por ${registradoPor}`
  }
  return linhas.join('\n')
}
