// Hook: geração de criativo de campanha via agente nativo Skip Cloud.
// A IA produz apenas TEXTO (proposta editável) — nunca publica nada.
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

      const result = $ai.agent('criativo-campanhas').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: briefing,
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
