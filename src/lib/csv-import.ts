import pb from '@/lib/pocketbase/client'
import { SPECIALTIES, normalizeSpecialty, FAMILY_SUGGESTIONS } from '@/lib/pricing-engine'
import type { ProcedureRecord } from '@/services/procedures'

/**
 * Importador genérico de CSV para a Tabela de Procedimentos e Preços.
 * O usuário aciona por botão, faz o upload no navegador, confere a PRÉVIA e
 * publica. As linhas do arquivo NUNCA são embutidas no projeto: o parsing é
 * feito no cliente em runtime sobre o arquivo que o usuário enviou.
 *
 * FONTE DE PREÇO (decisão da proprietária, 0.0.51): a tabela inicial usa a
 * coluna "Preço Proposto" (fallback "Situação Desejada"). O preço praticado
 * original (coluna de preço praticado/valor atual, quando existir) NÃO vira
 * preço oficial — vai apenas para o histórico interno (history) com a data de
 * origem, para rastreabilidade. Procedimento sem valor proposto fica com
 * import_status "pendente_preco" e SEM preço (nunca se inventa preço).
 *
 * Idempotência: `id_importacao` é a chave de unicidade (campo external_code).
 * Reimportar atualiza o registro existente em vez de duplicar — dedupe também
 * por nome normalizado quando o código não casa.
 */

export interface CsvRow {
  linha: number
  idImportacao: string
  categoriaSugerida: string
  grupoBusca: string
  procedimentoOriginal: string
  /** Preço PROPOSTO (coluna "Preço Proposto", fallback "Situação Desejada"). */
  precoPropostoBrl: number | null
  /** Preço praticado original — só histórico, nunca preço oficial. */
  precoPraticadoBrl: number | null
  tempoClinicoMinutos: number
  materialBrl: number | null
  laboratorioBrl: number | null
  remuneracaoExecutorBrl: number | null
  statusImportacao: string
  observacoes: string
}

export interface ParseResult {
  rows: CsvRow[]
  erros: string[]
}

export const toNum = (v: string): number | null => {
  const t = (v || '').trim()
  if (!t) return null
  // aceita "1.234,56", "1234.56", "R$ 90,00"
  const m = t.replace(/[^\d,.-]/g, '')
  if (!m) return null
  if (m.includes(',') && m.includes('.')) {
    return Number(m.replace(/\./g, '').replace(',', '.'))
  }
  if (m.includes(',')) return Number(m.replace(',', '.'))
  const n = Number(m)
  return isNaN(n) ? null : n
}

/** Primeira coluna cujo cabeçalho casa com um dos nomes (normalizados). */
function colIdx(header: string[], names: string[]): number {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  for (const name of names) {
    const i = header.indexOf(norm(name))
    if (i >= 0) return i
  }
  // fallback: prefixo/contém
  for (const name of names) {
    const n = norm(name)
    const i = header.findIndex((h) => h.startsWith(n) || h.includes(n))
    if (i >= 0) return i
  }
  return -1
}

/** Parser CSV com suporte a campos entre aspas e separador ; ou , */
export function parseCsv(text: string): ParseResult {
  const erros: string[] = []
  const rows: CsvRow[] = []

  // remove BOM e normaliza quebras
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  const sep = clean.split('\n')[0]?.includes(';') ? ';' : ','

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === sep) {
      cur.push(field)
      field = ''
    } else if (ch === '\n') {
      cur.push(field)
      field = ''
      lines.push(cur)
      cur = []
    } else field += ch
  }
  if (field || cur.length) {
    cur.push(field)
    lines.push(cur)
  }

  if (lines.length < 2) return { rows: [], erros: ['Arquivo vazio ou sem linhas de dados.'] }

  const header = lines[0].map((h) => h.trim())
  const idx = {
    id: colIdx(header, ['id_importacao', 'id importacao', 'id']),
    cat: colIdx(header, ['categoria_sugerida', 'categoria', 'especialidade']),
    grupo: colIdx(header, ['grupo_busca', 'grupo', 'familia', 'família']),
    nome: colIdx(header, ['procedimento_original', 'procedimento', 'nome', 'descricao']),
    // FONTE DE PREÇO OFICIAL (decisão da proprietária): proposta primeiro,
    // situação desejada como fallback.
    preco: colIdx(header, ['preco_proposto', 'preco proposto', 'valor proposto']),
    precoFallback: colIdx(header, ['situacao_desejada', 'situacao desejada', 'valor desejado']),
    // Preço praticado original: só histórico interno, nunca preço oficial.
    precoPraticado: colIdx(header, [
      'preco_praticado',
      'preco praticado',
      'valor praticado',
      'preco_atual',
      'preco atual',
      'preco_original',
      'preco oficial inicial brl',
    ]),
    tempo: colIdx(header, ['tempo_clinico_minutos', 'tempo clinico', 'tempo', 'minutos']),
    material: colIdx(header, ['material_brl', 'material', 'custo_material']),
    lab: colIdx(header, ['laboratorio_brl', 'laboratorio', 'lab_brl', 'lab']),
    executor: colIdx(header, ['remuneracao_executor_brl', 'remuneracao_executor', 'executor']),
    status: colIdx(header, ['status_importacao', 'status']),
    obs: colIdx(header, ['observacoes', 'observações', 'obs']),
  }
  if (idx.nome < 0) {
    return {
      rows: [],
      erros: ['Coluna obrigatória ausente: procedimento (procedimento_original).'],
    }
  }

  lines.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return
    const get = (n: number) => (n >= 0 ? (cells[n] || '').trim() : '')
    const nome = get(idx.nome)
    if (!nome) {
      erros.push(`Linha ${i + 2}: procedimento vazio — ignorada.`)
      return
    }
    const tempo = toNum(get(idx.tempo))
    // Fonte oficial: proposta; se a coluna não existir ou vier vazia, cai para
    // situação desejada.
    const proposto = idx.preco >= 0 ? toNum(get(idx.preco)) : null
    const desejada = idx.precoFallback >= 0 ? toNum(get(idx.precoFallback)) : null
    rows.push({
      linha: i + 2,
      idImportacao: get(idx.id) || `CSV-${Date.now()}-${i}`,
      categoriaSugerida: get(idx.cat),
      grupoBusca: get(idx.grupo),
      procedimentoOriginal: nome,
      precoPropostoBrl: proposto ?? desejada,
      precoPraticadoBrl: idx.precoPraticado >= 0 ? toNum(get(idx.precoPraticado)) : null,
      tempoClinicoMinutos: tempo ? Math.round(tempo) : 0,
      materialBrl: toNum(get(idx.material)),
      laboratorioBrl: toNum(get(idx.lab)),
      remuneracaoExecutorBrl: toNum(get(idx.executor)),
      statusImportacao: get(idx.status),
      observacoes: get(idx.obs),
    })
  })

  return { rows, erros }
}

export interface PublishResult {
  criados: number
  atualizados: number
  pendentes: number
  erros: string[]
}

/** Entrada de histórico — espelha ProcedureRecord['history']. */
type HistoryEntry = { at: string; by: string; field: string; from: unknown; to: unknown }

/**
 * Publica as linhas conferidas como Tabela de Procedimentos e Preços.
 * - Preço oficial INICIAL = coluna "Preço Proposto" (fallback "Situação
 *   Desejada"). O preço praticado original NÃO vira preço oficial — vai para
 *   o histórico interno (history) com data de origem.
 * - Sem valor proposto → import_status "pendente_preco" e SEM preço (0).
 * - Idempotente: reimportar o mesmo id_importacao atualiza, não duplica.
 *   Quando o código não existe mas o NOME casa com um registro importado,
 *   atualiza esse registro (dedupe por nome normalizado).
 */
export async function publicarCsv(
  rows: CsvRow[],
  existingProcedures: ProcedureRecord[],
): Promise<PublishResult> {
  const byExternal = new Map<string, ProcedureRecord>()
  const nomeNorm = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  const byName = new Map<string, ProcedureRecord>()
  existingProcedures.forEach((p) => {
    if (p.external_code) byExternal.set(p.external_code.trim(), p)
    const n = nomeNorm(p.name)
    if (n && !byName.has(n)) byName.set(n, p)
  })

  const result: PublishResult = { criados: 0, atualizados: 0, pendentes: 0, erros: [] }
  const seen = new Set<string>()
  const dataOrigem = new Date().toISOString().slice(0, 10)

  for (const r of rows) {
    const key = r.idImportacao.trim()
    if (seen.has(key)) {
      result.erros.push(`Linha ${r.linha}: id_importacao "${key}" duplicado no arquivo — ignorada.`)
      continue
    }
    seen.add(key)

    const especialidade = normalizeSpecialty(r.categoriaSugerida)
    const familia = r.grupoBusca || FAMILY_SUGGESTIONS[especialidade]?.[0] || 'Outras'
    const pendente = r.precoPropostoBrl == null
    const precoNovo = r.precoPropostoBrl ?? 0

    // Histórico: preço praticado original de onde vieram os dados + mudança
    // de preço oficial quando o registro já tinha outro valor.
    const history: HistoryEntry[] = []
    if (r.precoPraticadoBrl != null) {
      history.push({
        at: new Date().toISOString(),
        by: 'importação CSV',
        field: 'preco_praticado (fonte original dos dados)',
        from: null,
        to: r.precoPraticadoBrl,
      })
    }

    const data: Record<string, unknown> = {
      name: r.procedimentoOriginal,
      external_code: key,
      specialty: especialidade,
      family: familia,
      category: 'dentista' as const,
      price: precoNovo,
      duration_minutes: r.tempoClinicoMinutos || 0,
      material_cost: r.materialBrl ?? 0,
      lab_price: r.laboratorioBrl ?? 0,
      executor_cost: r.remuneracaoExecutorBrl ?? 0,
      import_batch: dataOrigem,
      import_status: pendente ? 'pendente_preco' : r.statusImportacao || 'importado',
      observations: r.observacoes,
      active: !pendente,
    }

    try {
      const existing = byExternal.get(key) || byName.get(nomeNorm(r.procedimentoOriginal))
      if (existing) {
        if (!pendente && Number(existing.price ?? 0) > 0 && Number(existing.price) !== precoNovo) {
          history.push({
            at: new Date().toISOString(),
            by: 'importação CSV',
            field: 'price',
            from: Number(existing.price),
            to: precoNovo,
          })
        }
        // Nunca sobrescrever history existente (é texto JSON); preservar e somar.
        const oldHistory = ProcedureHistory.parse(existing.history)
        await pb.collection('procedures').update(existing.id, {
          ...data,
          history: JSON.stringify([...oldHistory, ...history]),
        })
        result.atualizados++
      } else {
        const rec = await pb.collection('procedures').create<ProcedureRecord>({
          ...data,
          history: history.length ? JSON.stringify(history) : '',
        })
        byExternal.set(key, rec)
        result.criados++
      }
      if (pendente) result.pendentes++
    } catch (err: unknown) {
      result.erros.push(
        `Linha ${r.linha} (${key}): ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
  return result
}

/** Helper local para ler o history (armazenado como texto JSON no banco). */
const ProcedureHistory = {
  parse(raw: unknown): HistoryEntry[] {
    if (Array.isArray(raw)) return raw as HistoryEntry[]
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
      } catch {
        return []
      }
    }
    return []
  },
}
