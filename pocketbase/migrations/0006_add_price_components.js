migrate(
  (app) => {
    const procCol = app.findCollectionByNameOrId('procedures')

    const numberFields = [
      'card_fee_percent',
      'ir_percent',
      'material_cost',
      'sales_commission_percent',
      'executor_percent',
      'rework_cost',
      'lab_price',
      'manual_price',
      'computed_price',
    ]

    numberFields.forEach((name) => {
      if (!procCol.fields.getByName(name)) {
        procCol.fields.add(new NumberField({ name }))
      }
    })

    if (!procCol.fields.getByName('use_manual_price')) {
      procCol.fields.add(new BoolField({ name: 'use_manual_price' }))
    }
    app.save(procCol)

    const chc = new Collection({
      name: 'clinical_hour_config',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'monthly_operating_cost', type: 'number', required: true },
        { name: 'available_clinical_hours', type: 'number', required: true },
        { name: 'clinical_hour_value', type: 'number', required: true },
        { name: 'period', type: 'text', required: true },
        { name: 'last_updated', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_chc_period ON clinical_hour_config (period)'],
    })
    app.save(chc)

    const chcCol = app.findCollectionByNameOrId('clinical_hour_config')
    const period = new Date().toISOString().slice(0, 7)
    try {
      app.findFirstRecordByData('clinical_hour_config', 'period', period)
    } catch (_) {
      const monthlyCost = 30000
      const clinicalHours = 160
      const rec = new Record(chcCol)
      rec.set('monthly_operating_cost', monthlyCost)
      rec.set('available_clinical_hours', clinicalHours)
      rec.set('clinical_hour_value', monthlyCost / clinicalHours)
      rec.set('period', period)
      rec.set('last_updated', new Date().toISOString().slice(0, 10))
      app.save(rec)
    }

    let hourValue = 0
    try {
      const chcRec = app.findFirstRecordByData('clinical_hour_config', 'period', period)
      hourValue = Number(chcRec.get('clinical_hour_value')) || 0
    } catch (_) {}

    const procedures = app.findRecordsByFilter('procedures', 'id != ""', 'name', 500, 0)
    procedures.forEach((proc) => {
      const duration = Number(proc.get('duration_minutes')) || 0
      const chp = hourValue * (duration / 60)
      const material = 50
      const lab = 100
      const rework = 20
      const cardFee = 4
      const ir = 15
      const commission = 10
      const executor = 30
      const base = chp + material + lab + rework
      const fees = (base * (cardFee + ir + commission + executor)) / 100
      const computed = base + fees

      proc.set('card_fee_percent', cardFee)
      proc.set('ir_percent', ir)
      proc.set('material_cost', material)
      proc.set('sales_commission_percent', commission)
      proc.set('executor_percent', executor)
      proc.set('rework_cost', rework)
      proc.set('lab_price', lab)
      proc.set('use_manual_price', false)
      proc.set('computed_price', computed)
      proc.set('price', computed)
      app.save(proc)
    })
  },
  (app) => {
    const procCol = app.findCollectionByNameOrId('procedures')
    const fieldsToRemove = [
      'card_fee_percent',
      'ir_percent',
      'material_cost',
      'sales_commission_percent',
      'executor_percent',
      'rework_cost',
      'lab_price',
      'use_manual_price',
      'manual_price',
      'computed_price',
    ]
    fieldsToRemove.forEach((name) => {
      const f = procCol.fields.getByName(name)
      if (f) procCol.fields.remove(f)
    })
    app.save(procCol)

    try {
      app.delete(app.findCollectionByNameOrId('clinical_hour_config'))
    } catch (_) {}
  },
)
