migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const patientsId = app.findCollectionByNameOrId('patients').id
    const proceduresId = app.findCollectionByNameOrId('procedures').id

    const professionals = new Collection({
      name: 'professionals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'specialty', type: 'text' },
        { name: 'commission_rate', type: 'number' },
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_professionals_name ON professionals (name)'],
    })
    app.save(professionals)
    const professionalsId = app.findCollectionByNameOrId('professionals').id

    const appCol = app.findCollectionByNameOrId('appointments')
    if (!appCol.fields.getByName('professional')) {
      appCol.fields.add(
        new RelationField({ name: 'professional', collectionId: professionalsId, maxSelect: 1 }),
      )
    }
    app.save(appCol)

    const finCol = app.findCollectionByNameOrId('financial_transactions')
    if (!finCol.fields.getByName('professional')) {
      finCol.fields.add(
        new RelationField({ name: 'professional', collectionId: professionalsId, maxSelect: 1 }),
      )
    }
    app.save(finCol)

    const leads = new Collection({
      name: 'leads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        {
          name: 'source',
          type: 'select',
          values: ['instagram', 'whatsapp', 'anuncios', 'indicacoes', 'manual'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['lead', 'avaliacao', 'tratamento', 'recuperado', 'reativado'],
          maxSelect: 1,
        },
        { name: 'professional', type: 'relation', collectionId: professionalsId, maxSelect: 1 },
        { name: 'converted_patient', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        { name: 'notes', type: 'text' },
        { name: 'follow_up_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_status ON leads (status)',
        'CREATE INDEX idx_leads_source ON leads (source)',
        'CREATE INDEX idx_leads_professional ON leads (professional)',
      ],
    })
    app.save(leads)

    const proposals = new Collection({
      name: 'proposals',
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
        { name: 'patient', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        { name: 'procedure', type: 'relation', collectionId: proceduresId, maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['enviada', 'pendente', 'aceita', 'recusada'],
          maxSelect: 1,
        },
        { name: 'value', type: 'number' },
        { name: 'sent_date', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_proposals_status ON proposals (status)'],
    })
    app.save(proposals)

    const conversations = new Collection({
      name: 'conversations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'patient', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        {
          name: 'lead',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('leads').id,
          maxSelect: 1,
        },
        {
          name: 'channel',
          type: 'select',
          values: ['whatsapp', 'instagram', 'telefone', 'presencial'],
          maxSelect: 1,
        },
        { name: 'message_text', type: 'text', required: true },
        { name: 'direction', type: 'select', values: ['entrada', 'saida'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_conversations_patient ON conversations (patient)'],
    })
    app.save(conversations)

    const goals = new Collection({
      name: 'goals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'professional', type: 'relation', collectionId: professionalsId, maxSelect: 1 },
        { name: 'period', type: 'text', required: true },
        { name: 'target_value', type: 'number', required: true },
        { name: 'current_value', type: 'number' },
        {
          name: 'goal_type',
          type: 'select',
          values: ['faturamento', 'producao', 'conversao', 'novos_pacientes'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_goals_period ON goals (period)'],
    })
    app.save(goals)

    const implants = new Collection({
      name: 'implants',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'marca', type: 'text', required: true },
        { name: 'modelo', type: 'text', required: true },
        { name: 'tamanho', type: 'number' },
        { name: 'espessura', type: 'number' },
        { name: 'tipo', type: 'text' },
        { name: 'category', type: 'select', values: ['implante', 'componente'], maxSelect: 1 },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_implants_marca ON implants (marca)',
        'CREATE INDEX idx_implants_tipo ON implants (tipo)',
      ],
    })
    app.save(implants)
  },
  (app) => {
    const cols = ['implants', 'goals', 'conversations', 'proposals', 'leads', 'professionals']
    cols.forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    })
  },
)
