migrate(
  (app) => {
    const patients = new Collection({
      name: 'patients',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text', required: true },
        { name: 'birth_date', type: 'date' },
        { name: 'cpf', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'medical_notes', type: 'editor' },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_patients_name ON patients (name)'],
    })
    app.save(patients)

    const patientsId = app.findCollectionByNameOrId('patients').id

    const procedures = new Collection({
      name: 'procedures',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          values: ['dentista', 'estetica', 'harmonizacao'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        { name: 'price', type: 'number' },
        { name: 'duration_minutes', type: 'number' },
        { name: 'pre_op_instructions', type: 'editor' },
        { name: 'post_op_instructions', type: 'editor' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(procedures)

    const proceduresId = app.findCollectionByNameOrId('procedures').id

    const appointments = new Collection({
      name: 'appointments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        { name: 'procedure', type: 'relation', collectionId: proceduresId, maxSelect: 1 },
        { name: 'date', type: 'date', required: true },
        { name: 'start_time', type: 'text', required: true },
        { name: 'end_time', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['agendado', 'confirmado', 'concluido', 'faltou', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_appointments_patient ON appointments (patient)',
        'CREATE INDEX idx_appointments_date ON appointments (date)',
        'CREATE INDEX idx_appointments_status ON appointments (status)',
      ],
    })
    app.save(appointments)

    const medicalRecords = new Collection({
      name: 'medical_records',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        { name: 'procedure', type: 'relation', collectionId: proceduresId, maxSelect: 1 },
        { name: 'record_date', type: 'date' },
        { name: 'anamnesis', type: 'editor' },
        { name: 'diagnosis', type: 'editor' },
        { name: 'notes', type: 'editor' },
        { name: 'attachments', type: 'file', maxSelect: 5, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_medrecords_patient ON medical_records (patient)'],
    })
    app.save(medicalRecords)

    const images = new Collection({
      name: 'images',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        {
          name: 'image_type',
          type: 'select',
          values: ['facial', 'corporal', 'dental', 'radiologica'],
          maxSelect: 1,
        },
        { name: 'file', type: 'file', required: true, maxSelect: 1, maxSize: 10485760 },
        { name: 'caption', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_images_patient ON images (patient)'],
    })
    app.save(images)

    const imagesId = app.findCollectionByNameOrId('images').id

    const virtualPlans = new Collection({
      name: 'virtual_plans',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        { name: 'image', type: 'relation', collectionId: imagesId, maxSelect: 1 },
        { name: 'title', type: 'text', required: true },
        { name: 'annotations', type: 'text' },
        { name: 'plan_content', type: 'editor' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(virtualPlans)

    const documents = new Collection({
      name: 'documents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        {
          name: 'document_type',
          type: 'select',
          values: ['tcle', 'contrato', 'pos_operatorio', 'orientacoes', 'informativo'],
          maxSelect: 1,
        },
        { name: 'procedure', type: 'relation', collectionId: proceduresId, maxSelect: 1 },
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'editor' },
        { name: 'pdf_file', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_documents_patient ON documents (patient)'],
    })
    app.save(documents)

    const messages = new Collection({
      name: 'messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
        },
        {
          name: 'message_type',
          type: 'select',
          values: ['lembrete_consulta', 'antes_preparatorio', 'pos_operatorio', 'informativo'],
          maxSelect: 1,
        },
        { name: 'content', type: 'text' },
        { name: 'sent', type: 'bool' },
        { name: 'sent_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_messages_patient ON messages (patient)'],
    })
    app.save(messages)

    const financialTransactions = new Collection({
      name: 'financial_transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'patient', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        {
          name: 'transaction_type',
          type: 'select',
          values: ['receita', 'despesa'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'select',
          values: [
            'consulta',
            'procedimento',
            'produto',
            'salario',
            'aluguel',
            'despesa_operacional',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'payment_method',
          type: 'select',
          values: ['pix', 'boleto', 'cartao', 'dinheiro'],
          maxSelect: 1,
        },
        { name: 'status', type: 'select', values: ['pago', 'pendente', 'cancelado'], maxSelect: 1 },
        { name: 'transaction_date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fin_patient ON financial_transactions (patient)',
        'CREATE INDEX idx_fin_date ON financial_transactions (transaction_date)',
        'CREATE INDEX idx_fin_type ON financial_transactions (transaction_type)',
      ],
    })
    app.save(financialTransactions)
  },
  (app) => {
    const cols = [
      'financial_transactions',
      'messages',
      'documents',
      'virtual_plans',
      'images',
      'medical_records',
      'appointments',
      'procedures',
      'patients',
    ]
    cols.forEach((name) => {
      try {
        const c = app.findCollectionByNameOrId(name)
        app.delete(c)
      } catch (_) {}
    })
  },
)
