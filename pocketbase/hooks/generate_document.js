routerAdd(
  'POST',
  '/backend/v1/ai/documents/generate',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const patientName = body.patientName || 'Paciente'
      const documentType = body.documentType || 'tcle'
      const procedureName = body.procedureName || 'Procedimento Clínico'

      const prompt = `Gere o texto completo em português para um documento do tipo "${documentType}" direcionado ao paciente "${patientName}" referente ao procedimento "${procedureName}". Inclua fundamentação formal em clínica odonto-estética, termos de responsabilidade, cuidados e campo final para assinatura das partes.`

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em normas de saúde e redação jurídica para clínicas odontológicas e estéticas no Brasil.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const text = reply.choices[0]?.message?.content || ''
      return e.json(200, { content: text })
    } catch (err) {
      return e.json(500, { error: String(err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
