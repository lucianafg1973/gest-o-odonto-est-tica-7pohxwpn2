// Migração aditiva: fluxo de aprovação e listagem de múltiplos planejamentos.
// Adiciona campos à coleção EXISTENTE virtual_plans (nunca recria a coleção;
// nenhum registro existente é tocado). Campos:
//   approval_status — 'rascunho' | 'aprovado' (default: rascunho)
//   approved_at     — data ISO da aprovação (null enquanto rascunho)
//   plan_date       — data do planejamento (default: data de criação, para a
//                     ordenação da lista do mais recente para o mais antigo)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')

    if (!col.fields.getByName('approval_status')) {
      col.fields.add(
        new SelectField({
          name: 'approval_status',
          values: ['rascunho', 'aprovado'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('approved_at')) {
      col.fields.add(new DateField({ name: 'approved_at' }))
    }
    if (!col.fields.getByName('plan_date')) {
      col.fields.add(new DateField({ name: 'plan_date' }))
    }

    // Backfill idempotente: rascunho por padrão e plan_date = created
    app
      .db()
      .newQuery(
        `UPDATE virtual_plans SET
           approval_status = COALESCE(approval_status, 'rascunho'),
           plan_date = COALESCE(plan_date, created)
         WHERE approval_status IS NULL OR approval_status = '' OR plan_date IS NULL`,
      )
      .execute()

    col.addIndex('idx_vplans_patient_date', false, 'patient', 'plan_date')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    ;['approval_status', 'approved_at', 'plan_date'].forEach((f) => {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    })
    col.removeIndex('idx_vplans_patient_date')
    app.save(col)
  },
)
