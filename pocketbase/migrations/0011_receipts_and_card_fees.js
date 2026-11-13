migrate(
  (app) => {
    // 1) Nova coleção payment_receipts (aditiva — não toca coleções existentes)
    if (!app.hasTable('payment_receipts')) {
      const patientsId = app.findCollectionByNameOrId('patients').id
      const financialId = app.findCollectionByNameOrId('financial_transactions').id
      const collection = new Collection({
        name: 'payment_receipts',
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
            required: true,
            collectionId: patientsId,
            maxSelect: 1,
          },
          {
            name: 'receipt_type',
            type: 'select',
            required: true,
            values: ['individual', 'consolidado'],
            maxSelect: 1,
          },
          {
            name: 'transaction',
            type: 'relation',
            required: false,
            collectionId: financialId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'amount', type: 'number', required: true, onlyInt: false },
          { name: 'title', type: 'text', required: true },
          { name: 'notes', type: 'text', required: false },
          { name: 'receipt_date', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      collection.addIndex('idx_receipts_patient', false, 'patient', '')
      collection.addIndex('idx_receipts_transaction', false, 'transaction', '')
      app.save(collection)
    }

    // 2) Campo card_fee_percent em financial_transactions (percentual de taxa de cartão)
    const fin = app.findCollectionByNameOrId('financial_transactions')
    if (!fin.fields.getByName('card_fee_percent')) {
      fin.fields.add(new NumberField({ name: 'card_fee_percent', onlyInt: false }))
      app.save(fin)
    }

    // 3) payment_method: adicionar cartao_credito / cartao_debito (select existente)
    const fin2 = app.findCollectionByNameOrId('financial_transactions')
    const pm = fin2.fields.getByName('payment_method')
    if (pm) {
      const values = pm.values || []
      const next = values.slice()
      if (!next.includes('cartao_credito')) next.push('cartao_credito')
      if (!next.includes('cartao_debito')) next.push('cartao_debito')
      if (next.length !== values.length) {
        pm.values = next
        app.save(fin2)
      }
    }
  },
  (app) => {
    // Down: revert only the additive pieces created here
    try {
      const col = app.findCollectionByNameOrId('payment_receipts')
      app.delete(col)
    } catch (_) {}
    try {
      const fin = app.findCollectionByNameOrId('financial_transactions')
      const pm = fin.fields.getByName('payment_method')
      if (pm && Array.isArray(pm.values)) {
        pm.values = pm.values.filter((v) => v !== 'cartao_credito' && v !== 'cartao_debito')
        app.save(fin)
      }
      const f = fin.fields.getByName('card_fee_percent')
      if (f) {
        fin.fields.removeByName('card_fee_percent')
        app.save(fin)
      }
    } catch (_) {}
  },
)
