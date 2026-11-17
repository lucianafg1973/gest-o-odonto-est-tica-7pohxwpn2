// 20251117100001_patient_address_extra_fields.js — campos Estado, Número e Complemento em patients
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    if (!col.fields.getByName('estado')) {
      col.fields.add(new TextField({ name: 'estado', max: 2 }))
    }
    if (!col.fields.getByName('numero')) {
      col.fields.add(new TextField({ name: 'numero', max: 20 }))
    }
    if (!col.fields.getByName('complemento')) {
      col.fields.add(new TextField({ name: 'complemento', max: 120 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    for (const f of ['estado', 'numero', 'complemento']) {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    }
    app.save(col)
  },
)
