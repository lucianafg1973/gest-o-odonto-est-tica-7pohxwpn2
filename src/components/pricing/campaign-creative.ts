import pb from '@/lib/pocketbase/client'

/**
 * Criativos de campanha via agente nativo Skip Cloud ('criativo-campanhas').
 * A IA só PRODÚZ TEXTO (proposta editável) — nunca publica nem envia nada.
 *
 * A IA devolve JSON com MÚLTIPLAS opções (textos de WhatsApp, criativos de
 * imagem, posts de redes sociais). O parse é tolerante: se a IA responder
 * fora do formato, o texto bruto vira uma única opção editável.
 */

export interface CriativoTexto {
  id: string
  titulo: string
  texto: string
  tipo: 'whatsapp' | 'post'
}

export interface CriativoPost {
  id: string
  titulo: string
  conceito: string
  legenda: string
  hashtags: string
}

export interface SugestoesIA {
  textos: CriativoTexto[]
  criativos: { id: string; titulo: string; descricao: string }[]
  posts: CriativoPost[]
}

export const SUGESTOES_VAZIAS: SugestoesIA = { textos: [], criativos: [], posts: [] }

const idAleatorio = () => Math.random().toString(36).slice(2, 9)

/** Extrai o primeiro objeto JSON embutido na resposta da IA. */
function extrairJSON(txt: string): any | null {
  if (!txt) return null
  const comFence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const bruto = (comFence ? comFence[1] : txt).trim()
  const ini = bruto.indexOf('{')
  const fim = bruto.lastIndexOf('}')
  if (ini === -1 || fim <= ini) return null
  try {
    return JSON.parse(bruto.slice(ini, fim + 1))
  } catch {
    return null
  }
}

const str = (v: any): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))

function parseSugestoes(txt: string): SugestoesIA {
  const dados = extrairJSON(txt)
  const textos: CriativoTexto[] = []
  const criativos: SugestoesIA['criativos'] = []
  const posts: CriativoPost[] = []

  if (dados && typeof dados === 'object') {
    const arrTextos = Array.isArray(dados.textos_whatsapp)
      ? dados.textos_whatsapp
      : Array.isArray(dados.textos)
        ? dados.textos
        : []
    arrTextos.forEach((t: any) => {
      const texto = str(typeof t === 'string' ? t : t?.texto)
      if (texto)
        textos.push({
          id: idAleatorio(),
          titulo: str(typeof t === 'object' ? t?.titulo : '') || `Texto ${textos.length + 1}`,
          texto,
          tipo: 'whatsapp',
        })
    })
    ;(Array.isArray(dados.criativos) ? dados.criativos : []).forEach((c: any) => {
      const descricao = str(typeof c === 'string' ? c : c?.descricao)
      if (descricao)
        criativos.push({
          id: idAleatorio(),
          titulo: str(typeof c === 'object' ? c?.titulo : '') || `Criativo ${criativos.length + 1}`,
          descricao,
        })
    })
    ;(Array.isArray(dados.posts) ? dados.posts : []).forEach((p: any) => {
      const legenda = str(typeof p === 'string' ? p : p?.legenda)
      if (legenda)
        posts.push({
          id: idAleatorio(),
          titulo: str(typeof p === 'object' ? p?.titulo : '') || `Post ${posts.length + 1}`,
          conceito: str(typeof p === 'object' ? p?.conceito : ''),
          legenda,
          hashtags: str(typeof p === 'object' ? p?.hashtags : ''),
        })
    })
  }

  if (textos.length === 0 && criativos.length === 0 && posts.length === 0) {
    const bruto = (txt || '').trim()
    if (bruto) {
      // Fallback: resposta fora do formato — vira uma única opção editável.
      textos.push({ id: idAleatorio(), titulo: 'Sugestão da IA', texto: bruto, tipo: 'whatsapp' })
    }
  }

  return { textos, criativos, posts }
}

/** Copia o texto para a área de transferência (fallback para navegadores antigos). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/** Pede ao agente nativo várias opções de texto, criativo e post (JSON). */
export async function gerarSugestoes(
  briefing: string,
  conversationId?: string | null,
): Promise<{
  sugestoes: SugestoesIA
  conversation_id: string | null
}> {
  const body = await pb.send<{ content: string; conversation_id?: string }>(
    '/backend/v1/ai/campaign/creative',
    {
      method: 'POST',
      body: JSON.stringify({
        briefing,
        conversation_id: conversationId ?? null,
        formato: 'json',
      }),
    },
  )
  return {
    sugestoes: parseSugestoes(body.content || ''),
    conversation_id: body.conversation_id ?? conversationId ?? null,
  }
}
