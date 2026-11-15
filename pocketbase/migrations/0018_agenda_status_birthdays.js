// 0018 — Status de pacientes na agenda, cancelamentos/remarcações e aniversariantes.
// Aditivo: novos campos em appointments e patients + nova coleção appointment_status_events.
migrate(
  (app) => {
    // ---------- appointments ----------
    const appts = app.findCollectionByNameOrId('appointments')

    if (!appts.fields.getByName('status')) {
      // status select já existe na 0001 — nada a fazer aqui
    }

    // Novos valores de status (9 opções). Atualiza o select existente.
    const statusField = appts.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'agendado',
        'confirmado',
        'chegou',
        'em_atendimento',
        'concluido',
        'faltou',
        'desmarcado_clinica',
        'desmarcado_paciente',
        'remarcou',
      ]
      statusField.maxSelect = 1
    }

    // Quem alterou o status por último
    if (!appts.fields.getByName('status_changed_by')) {
      appts.fields.add(new TextField({ name: 'status_changed_by', max: 200 }))
    }

    // Quando o status foi alterado por último
    if (!appts.fields.getByName('status_changed_at')) {
      appts.fields.add(new DateField({ name: 'status_changed_at' }))
    }

    // Desmarcar: quem desmarcou (texto livre p/ flexibilidade, ex. "Recepção — Ana")
    if (!appts.fields.getByName('canceled_by')) {
      appts.fields.add(new TextField({ name: 'canceled_by', max: 200 }))
    }

    // Desmarcar: motivo
    if (!appts.fields.getByName('canceled_reason')) {
      appts.fields.add(new TextField({ name: 'canceled_reason', max: 500 }))
    }

    // Remarcação: vínculo com o agendamento original (nunca excluir)
    if (!appts.fields.getByName('rescheduled_from')) {
      appts.fields.add(
        new RelationField({
          name: 'rescheduled_from',
          collectionId: appts.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    // Histórico de remarcações — guarda datas/hora/horário anteriores em JSON
    if (!appts.fields.getByName('reschedule_history')) {
      appts.fields.add(new JSONField({ name: 'reschedule_history', maxSize: 200000 }))
    }

    app.save(appts)

    // ---------- patients ----------
    const patients = app.findCollectionByNameOrId('patients')

    // Preferência de comunicação (LGPD)
    if (!patients.fields.getByName('comm_pref')) {
      patients.fields.add(
        new SelectField({
          name: 'comm_pref',
          values: ['liberado', 'bloqueado'],
          maxSelect: 1,
        }),
      )
    }

    // Autorização explícita de mensagens comemorativas (LGPD)
    if (!patients.fields.getByName('comm_consent_at')) {
      patients.fields.add(new DateField({ name: 'comm_consent_at' }))
    }

    app.save(patients)

    // ---------- appointment_status_events ----------
    if (!app.hasTable('appointment_status_events')) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const events = new Collection({
        name: 'appointment_status_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          {
            name: 'appointment',
            type: 'relation',
            collectionId: appts.id,
            maxSelect: 1,
            required: true,
            cascadeDelete: false,
          },
          { name: 'from_status', type: 'text', max: 100 },
          { name: 'to_status', type: 'text', max: 100, required: true },
          { name: 'changed_by', type: 'text', max: 200 },
          {
            name: 'changed_by_user',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'reason', type: 'text', max: 500 },
          {
            name: 'actor_kind',
            type: 'select',
            values: ['clinica', 'paciente', 'sistema'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      events.indexes = [
        'CREATE INDEX idx_ase_appointment ON appointment_status_events (appointment)',
        'CREATE INDEX idx_ase_created ON appointment_status_events (created)',
      ]
      app.save(events)
    }
  },
  (app) => {
    // down — remove o que a up adicionou
    try {
      const appts = app.findCollectionByNameOrId('appointments')
      for (const name of [
        'status_changed_by',
        'status_changed_at',
        'canceled_by',
        'canceled_reason',
        'rescheduled_from',
        'reschedule_history',
      ]) {
        const f = appts.fields.getByName(name)
        if (f) appts.fields.removeByName(name)
      }
      // restaura valores antigos do status
      const statusField = appts.fields.getByName('status')
      if (statusField) {
        statusField.values = ['agendado', 'confirmado', 'concluido', 'faltou', 'cancelado']
      }
      app.save(appts)
    } catch (_) {}

    try {
      const patients = app.findCollectionByNameOrId('patients')
      for (const name of ['comm_pref', 'comm_consent_at']) {
        const f = patients.fields.getByName(name)
        if (f) patients.fields.removeByName(name)
      }
      app.save(patients)
    } catch (_) {}

    try {
      const events = app.findCollectionByNameOrId('appointment_status_events')
      app.delete(events)
    } catch (_) {}
  },
)
