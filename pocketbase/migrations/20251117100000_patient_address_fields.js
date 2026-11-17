// 20251117100000_patient_address_fields.js — campos CEP, Cidade e Bairro em patients
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    if (!col.fields.getByName('cep')) {
      col.fields.add(new TextField({ name: 'cep', max: 9 }))
    }
    if (!col.fields.getByName('cidade')) {
      col.fields.add(new TextField({ name: 'cidade', max: 120 }))
    }
    if (!col.fields.getByName('bairro')) {
      col.fields.add(new TextField({ name: 'bairro', max: 120 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    for (const f of ['cep', 'cidade', 'bairro']) {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    }
    app.save(col)
  },
)
