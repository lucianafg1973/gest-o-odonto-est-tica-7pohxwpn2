routerAdd(
  'POST',
  '/backend/v1/ai/report',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const summary = body.summary || {}

      const prompt = `Analise os dados da clínica abaixo e redija um relatório gerencial em português do Brasil com: 1. Resumo executivo; 2. Destaques de faturamento e agendamentos; 3. Oportunidades em procedimentos estéticos/dentários; 4. Recomendações para redução de absenteísmo:\n\n${JSON.stringify(summary)}`

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content: 'Você é um consultor sênior em gestão de clínicas odonto-estéticas.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const reportText = reply.choices[0]?.message?.content || ''
      return e.json(200, { report: reportText })
    } catch (err) {
      return e.json(500, { error: String(err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
