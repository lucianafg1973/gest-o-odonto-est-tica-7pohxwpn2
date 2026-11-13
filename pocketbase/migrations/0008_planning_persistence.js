// Migração aditiva: persistência dos planejamentos na ficha do paciente.
// Adiciona campos JSON à coleção EXISTENTE virtual_plans (nunca recria a
// coleção; nenhum registro existente é tocado). Campos:
//   kind        — tipo do plano: 'hof' | 'odontologico' (1 por paciente/tipo)
//   treatments  — JSON: array de itens de tratamento (TreatmentItem)
//   payment_plan — JSON: array de parcelas do plano de pagamento (PaymentInstallment)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')

    if (!col.fields.getByName('kind')) {
      col.fields.add(
        new SelectField({ name: 'kind', values: ['hof', 'odontologico'], maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('treatments')) {
      col.fields.add(new JSONField({ name: 'treatments', maxSize: 2000000 }))
    }
    if (!col.fields.getByName('payment_plan')) {
      col.fields.add(new JSONField({ name: 'payment_plan', maxSize: 2000000 }))
    }
    if (!col.fields.getByName('annotations')) {
      col.fields.add(new JSONField({ name: 'annotations', maxSize: 2000000 }))
    }

    col.addIndex('idx_vplans_patient_kind', false, 'patient', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    ;['kind', 'treatments', 'payment_plan', 'annotations'].forEach((f) => {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    })
    col.removeIndex('idx_vplans_patient_kind')
    app.save(col)
  },
)
