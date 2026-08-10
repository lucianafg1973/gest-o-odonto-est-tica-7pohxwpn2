routerAdd(
  'POST',
  '/backend/v1/ai/assistant/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')
      if (!body.message) return e.badRequestError('Mensagem é obrigatória')

      const result = $ai.agent('assistente-clinica').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: body.message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
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
