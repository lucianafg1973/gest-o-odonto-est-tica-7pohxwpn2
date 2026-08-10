routerAdd(
  'POST',
  '/backend/v1/ai/lfg-intelligence',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      let leads = [],
        proposals = [],
        appointments = [],
        finTrans = [],
        goals = []
      try {
        leads = $app.findRecordsByFilter('leads', 'id != ""', '-created', 500, 0)
      } catch (_) {}
      try {
        proposals = $app.findRecordsByFilter('proposals', 'id != ""', '-created', 500, 0)
      } catch (_) {}
      try {
        appointments = $app.findRecordsByFilter('appointments', 'id != ""', '-created', 500, 0)
      } catch (_) {}
      try {
        finTrans = $app.findRecordsByFilter(
          'financial_transactions',
          'id != ""',
          '-created',
          500,
          0,
        )
      } catch (_) {}
      try {
        goals = $app.findRecordsByFilter('goals', 'id != ""', '-created', 100, 0)
      } catch (_) {}

      var totalRevenue = 0,
        totalExpenses = 0
      finTrans.forEach(function (t) {
        if (t.getString('status') === 'pago') {
          var amt = Number(t.get('amount')) || 0
          if (t.getString('transaction_type') === 'receita') totalRevenue += amt
          if (t.getString('transaction_type') === 'despesa') totalExpenses += amt
        }
      })
      var profit = totalRevenue - totalExpenses
      var completedAppts = appointments.filter(function (a) {
        return a.getString('status') === 'concluido'
      }).length
      var totalAppts = appointments.length
      var conversionRate = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0

      var leadsByStatus = {}
      leads.forEach(function (l) {
        var s = l.getString('status') || 'lead'
        leadsByStatus[s] = (leadsByStatus[s] || 0) + 1
      })

      var pendingProposals = proposals.filter(function (p) {
        var s = p.getString('status')
        return s === 'pendente' || s === 'enviada'
      }).length
      var acceptedProposals = proposals.filter(function (p) {
        return p.getString('status') === 'aceita'
      }).length
      var rejectedProposals = proposals.filter(function (p) {
        return p.getString('status') === 'recusada'
      }).length

      var goalTarget = 0
      goals.forEach(function (g) {
        goalTarget += Number(g.get('target_value')) || 0
      })

      var summary = JSON.stringify({
        faturamento_total: totalRevenue,
        despesas_totais: totalExpenses,
        lucratividade: profit,
        taxa_conversao: conversionRate + '%',
        total_agendamentos: totalAppts,
        agendamentos_concluidos: completedAppts,
        leads_por_status: leadsByStatus,
        total_leads: leads.length,
        propostas_pendentes: pendingProposals,
        propostas_aceitas: acceptedProposals,
        propostas_recusadas: rejectedProposals,
        meta_faturamento: goalTarget,
        distancia_meta:
          goalTarget > 0
            ? Math.round(((goalTarget - totalRevenue) / goalTarget) * 100) + '%'
            : 'N/A',
      })

      var prompt =
        "Analise os dados da clínica odonto-estética abaixo e gere recomendações práticas em português do Brasil. Identifique: gargalos, queda de conversão, oportunidades de vendas, leads sem follow-up, pacientes com proposta não fechada, desempenho da equipe, distância entre meta e resultado, e tendências. Use linguagem direta e acionável, como: 'Você está X% abaixo da meta. Existem Y pacientes com proposta pendente. Recomendamos...'\n\nDados:\n" +
        summary

      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um consultor sênior em gestão de clínicas odonto-estéticas usando a metodologia LFG (Lucratividade + Foco + Gestão).',
          },
          { role: 'user', content: prompt },
        ],
      })

      return e.json(200, { report: reply.choices[0].message.content })
    } catch (err) {
      return e.json(500, { error: String(err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
