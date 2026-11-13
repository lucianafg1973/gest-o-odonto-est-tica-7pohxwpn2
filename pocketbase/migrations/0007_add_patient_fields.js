migrate(
  (app) => {
    const patientsCol = app.findCollectionByNameOrId('patients')

    const textField = (name) => {
      if (!patientsCol.fields.getByName(name)) {
        patientsCol.fields.add(new TextField({ name }))
      }
    }

    textField('identity_rg')
    textField('preferred_name')
    textField('kinship')
    textField('referred_by_name')

    if (!patientsCol.fields.getByName('gender')) {
      patientsCol.fields.add(
        new SelectField({
          name: 'gender',
          values: ['feminino', 'masculino', 'outro', 'nao_informado'],
          maxSelect: 1,
        }),
      )
    }

    if (!patientsCol.fields.getByName('referral_source')) {
      patientsCol.fields.add(
        new SelectField({
          name: 'referral_source',
          values: [
            'instagram',
            'google',
            'facebook',
            'linkedin',
            'tiktok',
            'indicacao_cliente',
            'fachada',
            'outro',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!patientsCol.fields.getByName('referred_by')) {
      patientsCol.fields.add(
        new RelationField({
          name: 'referred_by',
          collectionId: app.findCollectionByNameOrId('patients').id,
          maxSelect: 1,
        }),
      )
    }

    app.save(patientsCol)
  },
  (app) => {
    const patientsCol = app.findCollectionByNameOrId('patients')
    const fieldsToRemove = [
      'identity_rg',
      'preferred_name',
      'kinship',
      'referred_by_name',
      'gender',
      'referral_source',
      'referred_by',
    ]
    fieldsToRemove.forEach((name) => {
      const f = patientsCol.fields.getByName(name)
      if (f) patientsCol.fields.remove(f)
    })
    app.save(patientsCol)
  },
)
