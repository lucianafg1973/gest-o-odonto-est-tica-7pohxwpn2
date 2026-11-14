migrate(
  (app) => {
    // ---- 1. procedures: campos da TABELA ÚNICA (aditivos) ----
    const procCol = app.findCollectionByNameOrId('procedures')
    const addField = (col, def) => {
      if (!col.fields.getByName(def.name)) col.fields.add(def.f)
    }

    const textFields = [
      'external_code',
      'specialty',
      'family',
      'import_batch',
      'import_status',
      'observations',
      'history',
    ]
    textFields.forEach((name) => {
      if (!procCol.fields.getByName(name)) procCol.fields.add(new TextField({ name }))
    })
    const numFields = [
      'executor_cost', // R$ remuneração do executor
      'other_direct_cost', // R$ outros custos diretos
      'tax_percent', // % impostos s/ receita
      'min_margin_percent', // % margem mínima gerencial
      'target_margin_percent', // % margem desejada
      'planned_discount_percent', // % desconto planejado
      'max_discount_percent', // % desconto máximo autorizado
    ]
    numFields.forEach((name) => {
      if (!procCol.fields.getByName(name)) procCol.fields.add(new NumberField({ name }))
    })
    if (!procCol.fields.getByName('active')) procCol.fields.add(new BoolField({ name: 'active' }))
    if (!procCol.fields.getByName('history'))
      procCol.fields.add(new JSONField({ name: 'history', maxSize: 2000000 }))
    app.save(procCol)

    // ---- 2. clinical_hour_config: capacidade produtiva editável ----
    const chc = app.findCollectionByNameOrId('clinical_hour_config')
    const chcNum = [
      'rooms_count',
      'hours_per_day',
      'days_per_month',
      'idle_percent',
      'evaluation_extra_percent',
      'available_hours',
      'productive_hours',
      'hour_cost',
      'minute_cost',
    ]
    chcNum.forEach((name) => {
      if (!chc.fields.getByName(name)) chc.fields.add(new NumberField({ name }))
    })
    app.save(chc)

    // seed editável e recalculado do exemplo do usuário
    const period = new Date().toISOString().slice(0, 7)
    let rec = null
    try {
      rec = app.findFirstRecordByData('clinical_hour_config', 'period', period)
    } catch (_) {}
    if (!rec) {
      try {
        rec = app.findFirstRecordByData(
          'clinical_hour_config',
          'period',
          new Date().getFullYear() + '-01',
        )
      } catch (_) {}
    }
    if (!rec) {
      rec = new Record(app.findCollectionByNameOrId('clinical_hour_config'))
      rec.set('period', period)
      rec.set('monthly_operating_cost', 53835)
      rec.set('available_clinical_hours', 480)
      rec.set('clinical_hour_value', 53835 / 384)
      app.save(rec)
    }
    // só preenche campos novos se ainda estiverem vazios (idempotente)
    const needsSeed = !rec.get('productive_hours')
    if (needsSeed) {
      if (!rec.get('monthly_operating_cost')) rec.set('monthly_operating_cost', 53835)
      if (!rec.get('available_clinical_hours')) rec.set('available_clinical_hours', 480)
      rec.set('rooms_count', rec.get('rooms_count') || 2)
      rec.set('hours_per_day', rec.get('hours_per_day') || 8)
      rec.set('days_per_month', rec.get('days_per_month') || 30)
      rec.set('idle_percent', rec.get('idle_percent') || 20)
      rec.set('evaluation_extra_percent', rec.get('evaluation_extra_percent') || 0)
      rec.set('available_hours', rec.get('available_hours') || 480)
      const idle = Number(rec.get('idle_percent')) || 0
      const prod = (Number(rec.get('available_hours')) || 480) * (1 - idle / 100)
      rec.set('productive_hours', prod) // 384
      rec.set('hour_cost', (Number(rec.get('monthly_operating_cost')) || 0) / prod) // ≈140.20
      rec.set('minute_cost', (Number(rec.get('hour_cost')) || 0) / 60)
      rec.set('last_updated', new Date().toISOString().slice(0, 10))
      app.save(rec)
    }

    // ---- 3. clinic_cost_items: planilha editável de custos/despesas ----
    let col = null
    try {
      col = app.findCollectionByNameOrId('clinic_cost_items')
    } catch (_) {
      col = new Collection({
        name: 'clinic_cost_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'description', type: 'text', required: true },
          {
            name: 'group',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['operacional', 'pessoal', 'provisao', 'reserva'],
          },
          { name: 'category', type: 'text' },
          { name: 'amount', type: 'number', required: true },
          { name: 'period_month', type: 'text' },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_cost_items_period ON clinic_cost_items (period_month)'],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('clinic_cost_items'))
    } catch (_) {}
    const chc = app.findCollectionByNameOrId('clinical_hour_config')
    ;[
      'rooms_count',
      'hours_per_day',
      'days_per_month',
      'idle_percent',
      'evaluation_extra_percent',
      'available_hours',
      'productive_hours',
      'hour_cost',
      'minute_cost',
    ].forEach((name) => {
      const f = chc.fields.getByName(name)
      if (f) chc.fields.remove(f)
    })
    app.save(chc)
    const procCol = app.findCollectionByNameOrId('procedures')
    ;[
      'external_code',
      'specialty',
      'family',
      'import_batch',
      'import_status',
      'observations',
      'executor_cost',
      'other_direct_cost',
      'tax_percent',
      'min_margin_percent',
      'target_margin_percent',
      'planned_discount_percent',
      'max_discount_percent',
      'active',
      'history',
    ].forEach((name) => {
      const f = procCol.fields.getByName(name)
      if (f) procCol.fields.remove(f)
    })
    app.save(procCol)
  },
)
