// 20251116130000 — Coleção campaign_messages (registro manual "mensagem enviada").
// Aditiva: cada registro guarda o texto enviado, o paciente, a data/hora e o
// usuário — criada sob demanda quando a usuária confirma "mensagem enviada"
// no Simulador de Campanhas.
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const col = new Collection({
      name: 'campaign_messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'campaign', type: 'text', max: 200 },
        {
          name: 'patient',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('patients').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'message', type: 'text', max: 4000 },
        { name: 'sent_at', type: 'date' },
        { name: 'sent_by', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'sent_by_name', type: 'text', max: 200 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_camp_msg_patient ON campaign_messages (patient, sent_at DESC)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('campaign_messages'))
    } catch (_) {}
  },
)
