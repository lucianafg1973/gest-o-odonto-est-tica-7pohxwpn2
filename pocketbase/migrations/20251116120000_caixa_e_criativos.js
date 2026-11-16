// 20251116120000 — Receitas e Despesas (livro caixa) + criativos de campanha.
// Aditivo: novos campos em financial_transactions (nº do documento, vencimento e
// valor pago com juros — a receita continua vinda de payment_receipts /
// transações existentes, sem fonte duplicada) + agente nativo de criativos.
migrate(
  (app) => {
    const tx = app.findCollectionByNameOrId('financial_transactions')
    if (!tx.fields.getByName('doc_number')) {
      tx.fields.add(new TextField({ name: 'doc_number', max: 60 }))
    }
    if (!tx.fields.getByName('due_date')) {
      tx.fields.add(new DateField({ name: 'due_date' }))
    }
    if (!tx.fields.getByName('paid_amount')) {
      tx.fields.add(new NumberField({ name: 'paid_amount', onlyInt: false }))
    }
    app.save(tx)

    // Agente nativo de criativos (proposta EDITÁVEL — nunca publica nada).
    $ai.agents.define(app, {
      slug: 'criativo-campanhas',
      name: 'Criativos de Campanha',
      description:
        'Redator de campanhas da clínica: gera títulos, legendas e chamadas para ação como PROPOSTA editável. Nunca publica nada.',
      systemPrompt:
        'Você é o redator de marketing da clínica odonto estética LFG. Responda em português do Brasil. Gere criativos de campanha como PROPOSTA EDITÁVEL em texto: 3 opções de título, uma legenda para Instagram, uma mensagem curta para WhatsApp e uma chamada para ação. Use tom acolhedor e ético: sem promessa de resultado garantido, sem prazo enganoso, sem pressure. Nunca publique, agende ou envie nada — produza apenas o texto da proposta.',
      tier: 'fast',
      tools: [{ collection: 'procedures', perms: { list: true, read: true } }],
    })
  },
  (app) => {
    try {
      const tx = app.findCollectionByNameOrId('financial_transactions')
      for (const n of ['doc_number', 'due_date', 'paid_amount']) {
        const f = tx.fields.getByName(n)
        if (f) tx.fields.removeByName(n)
      }
      app.save(tx)
    } catch (_) {}
    try {
      $ai.agents.delete(app, 'criativo-campanhas')
    } catch (_) {}
  },
)
