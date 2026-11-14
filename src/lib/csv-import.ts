import pb from '@/lib/pocketbase/client'
import { SPECIALTIES, normalizeSpecialty, FAMILY_SUGGESTIONS } from '@/lib/pricing-engine'
import { novoId } from '@/lib/payment-calc'
import type { ProcedureRecord } from '@/services/procedures'

/**
 * Importador genérico de CSV para a tabela única de procedimentos.
 * O usuário aciona por botão, faz o upload no navegador, confere a PRÉVIA e
 * publica. As linhas do arquivo NUNCA são embutidas no projeto: o parsing é
 * feito no cliente em runtime sobre o arquivo que o usuário enviou.
 *
 * Idempotência: `id_importacao` é a chave de unicidade (campo external_code).
 * Reimportar atualiza o registro existente em vez de duplicar.
 */

export interface CsvRow {
  linha: number
  idImportacao: string
  categoriaSugerida: string
  grupoBusca: string
  procedimentoOriginal: string
  precoOficialInicialBrl: number | null
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

const toNum = (v: string): number | null => {
  const t = (v || '').trim()
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
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

  const header = lines[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const idx = {
    id: col('id_importacao'),
    cat: col('categoria_sugerida'),
    grupo: col('grupo_busca'),
    nome: col('procedimento_original'),
    preco: col('preco_oficial_inicial_brl'),
    tempo: col('tempo_clinico_minutos'),
    material: col('material_brl'),
    lab: col('laboratorio_brl'),
    executor: col('remuneracao_executor_brl'),
    status: col('status_importacao'),
    obs: col('observacoes'),
  }
  if (idx.id < 0 || idx.nome < 0) {
    return {
      rows: [],
      erros: ['Colunas obrigatórias ausentes: id_importacao e procedimento_original.'],
    }
  }

  lines.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return
    const get = (n: number) => (n >= 0 ? (cells[n] || '').trim() : '')
    const nome = get(idx.nome)
    if (!nome) {
      erros.push(`Linha ${i + 2}: procedimento_original vazio — ignorada.`)
      return
    }
    const tempo = toNum(get(idx.tempo))
    rows.push({
      linha: i + 2,
      idImportacao: get(idx.id) || `CSV-${Date.now()}-${i}`,
      categoriaSugerida: get(idx.cat),
      grupoBusca: get(idx.grupo),
      procedimentoOriginal: nome,
      precoOficialInicialBrl: toNum(get(idx.preco)),
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

/**
 * Publica as linhas conferidas como tabela oficial.
 * - Usa SOMENTE os preços praticados originais (preco_oficial_inicial_brl);
 *   NÃO usa a coluna "Situação Desejada".
 * - Sem preço → registro fica pendente (preço 0) e sinalizado.
 * - Idempotente: reimportar o mesmo id_importacao atualiza, não duplica.
 */
export async function publicarCsv(
  rows: CsvRow[],
  existingProcedures: ProcedureRecord[],
): Promise<PublishResult> {
  const byExternal = new Map<string, ProcedureRecord>()
  existingProcedures.forEach((p) => {
    if (p.external_code) byExternal.set(p.external_code.trim(), p)
  })

  const result: PublishResult = { criados: 0, atualizados: 0, pendentes: 0, erros: [] }
  const seen = new Set<string>()

  for (const r of rows) {
    const key = r.idImportacao.trim()
    if (seen.has(key)) {
      result.erros.push(`Linha ${r.linha}: id_importacao "${key}" duplicado no arquivo — ignorada.`)
      continue
    }
    seen.add(key)

    const especialidade = normalizeSpecialty(r.categoriaSugerida)
    const familia = r.grupoBusca || FAMILY_SUGGESTIONS[especialidade]?.[0] || 'Outras'
    const pendente = r.precoOficialInicialBrl == null
    const data = {
      name: r.procedimentoOriginal,
      external_code: key,
      specialty: especialidade,
      family: familia,
      category: 'dentista' as const,
      price: r.precoOficialInicialBrl ?? 0,
      duration_minutes: r.tempoClinicoMinutos || 0,
      material_cost: r.materialBrl ?? 0,
      lab_price: r.laboratorioBrl ?? 0,
      executor_cost: r.remuneracaoExecutorBrl ?? 0,
      import_batch: new Date().toISOString().slice(0, 10),
      import_status: pendente ? 'pendente_preco' : r.statusImportacao || 'importado',
      observations: r.observacoes,
      active: !pendente,
    }

    try {
      const existing = byExternal.get(key)
      if (existing) {
        await pb.collection('procedures').update(existing.id, data)
        result.atualizados++
      } else {
        const rec = await pb.collection('procedures').create<ProcedureRecord>(data)
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
