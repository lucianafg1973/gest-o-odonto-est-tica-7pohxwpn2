/**
 * 20251116140000 — Acompanhamento de avaliações/fechamentos (aba Leads).
 *
 * Plano de pagamento (valor fechado pelo cliente) já persiste em
 * virtual_plans.payment_plan (JSON, migração 0008) — não duplicamos valor
 * aqui. Esta migração é ADITIVA:
 *
 * 1. leads ganha:
 *    - plan_value        → "Valor do tratamento" (orçamento proposto)
 *    - closed_value      → "Valor que o cliente fechou"
 *    - feedback          → anotação livre do que o cliente falou
 *    (a "data para nova contatção" já existe: leads.follow_up_date)
 *
 * 2. Nova coleção lead_evaluations — uma linha por avaliação realizada:
 *    date, professional (relation), plan_value, closed_value, feedback,
 *    next_contact_date, lead (relation), patient (relation).
 *    "Valor não realizado" é DERIVADO na UI: max(0, plan_value − closed_value)
 *    — nunca armazenado, para não divergir dos outros dois.
 */
migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')

    if (!leads.fields.getByName('plan_value')) {
      leads.fields.add(new NumberField({ name: 'plan_value', onlyInt: false }))
    }
    if (!leads.fields.getByName('closed_value')) {
      leads.fields.add(new NumberField({ name: 'closed_value', onlyInt: false }))
    }
    if (!leads.fields.getByName('feedback')) {
      leads.fields.add(new TextField({ name: 'feedback', max: 2000 }))
    }
    app.save(leads)

    const patients = app.findCollectionByNameOrId('patients').id
    const professionals = app.findCollectionByNameOrId('professionals').id

    const evalCol = new Collection({
      name: 'lead_evaluations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'lead',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('leads').id,
          maxSelect: 1,
        },
        { name: 'patient', type: 'relation', collectionId: patients, maxSelect: 1 },
        { name: 'professional', type: 'relation', collectionId: professionals, maxSelect: 1 },
        { name: 'evaluation_date', type: 'date' },
        { name: 'plan_value', type: 'number', onlyInt: false },
        { name: 'closed_value', type: 'number', onlyInt: false },
        { name: 'feedback', type: 'text', max: 2000 },
        { name: 'next_contact_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lead_eval_lead ON lead_evaluations (lead)',
        'CREATE INDEX idx_lead_eval_patient ON lead_evaluations (patient)',
        'CREATE INDEX idx_lead_eval_date ON lead_evaluations (evaluation_date)',
      ],
    })
    app.save(evalCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('lead_evaluations')
      app.delete(col)
    } catch (_) {}
    const leads = app.findCollectionByNameOrId('leads')
    for (const f of ['plan_value', 'closed_value', 'feedback']) {
      const field = leads.fields.getByName(f)
      if (field) leads.fields.removeByName(f)
    }
    app.save(leads)
  },
)
