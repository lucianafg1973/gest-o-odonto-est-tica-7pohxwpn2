// 20251117100002_appointment_compromissos.js — compromissos internos na agenda
// Campos ADITIVOS na coleção appointments (nunca destrutivos):
// - entry_kind: 'consulta' (padrão, tudo que já existe) | 'compromisso'
// - entry_title: o "qual" do compromisso (reunião, administrativo, pausa, curso…)
// - is_all_day: compromisso de dia inteiro (bloqueia a coluna do dia na grade)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    if (!col.fields.getByName('entry_kind')) {
      col.fields.add(
        new SelectField({
          name: 'entry_kind',
          values: ['consulta', 'compromisso'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('entry_title')) {
      col.fields.add(new TextField({ name: 'entry_title', max: 120 }))
    }
    if (!col.fields.getByName('is_all_day')) {
      col.fields.add(new BoolField({ name: 'is_all_day' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    for (const f of ['entry_kind', 'entry_title', 'is_all_day']) {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    }
    app.save(col)
  },
)
