// Hook: geração de criativos de campanha via agente nativo Skip Cloud
// ('criativo-campanhas'). A IA produz apenas TEXTO (proposta editável) —
// nunca publica nem envia nada. Devolve MÚLTIPLAS opções (textos de WhatsApp,
// criativos de imagem e posts de redes sociais) em JSON.
routerAdd(
  'POST',
  '/backend/v1/ai/campaign/creative',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      const body = e.requestInfo().body || {}
      const briefing = String(body.briefing || '').slice(0, 4000)
      if (!briefing) return e.badRequestError('Briefing é obrigatório')

      const instrucao = [
        briefing,
        '',
        'Responda SOMENTE com um JSON válido (sem texto antes ou depois), neste formato:',
        '{',
        '  "textos_whatsapp": [{"titulo": "...", "texto": "..."}],',
        '  "criativos": [{"titulo": "...", "descricao": "conceito visual: imagem, paleta, estilo, chamada na arte"}],',
        '  "posts": [{"titulo": "...", "conceito": "...", "legenda": "...", "hashtags": "#... #..."}]',
        '}',
        '',
        'Regras:',
        '- 3 opções em textos_whatsapp (tons diferentes: direto, consultivo, urgência) — cada texto pronto para enviar, com saudação e chamada para ação.',
        '- 2 opções em criativos (conceito visual para o designer).',
        '- 3 opções em posts (legenda completa para Instagram/Facebook, com emojis e hashtags em "hashtags").',
        '- Português do Brasil, tom acolhedor de clínica odonto/estética, sem promessas clínicas exageradas.',
        '- Use os preços e o desconto do briefing quando existirem.',
      ].join('\n')

      const result = $ai.agent('criativo-campanhas').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: instrucao,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        return e.json(err.status || 400, { error: err.message })
      }
      return e.json(500, { error: String(err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
