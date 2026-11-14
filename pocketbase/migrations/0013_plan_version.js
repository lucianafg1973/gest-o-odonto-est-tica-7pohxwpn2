// Migração aditiva: registro de versão e responsável da aprovação do plano.
// virtual_plans — campos novos (nenhum registro existente é tocado):
//   plan_version — nº da versão do planejamento (default 1; incrementa quando
//                  o plano é regenerado após aprovação/documento assinado)
//   approved_by  — nome do usuário que aprovou (registro de auditoria)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    if (!col.fields.getByName('plan_version')) {
      col.fields.add(new NumberField({ name: 'plan_version', onlyInt: true, min: 1 }))
    }
    if (!col.fields.getByName('approved_by')) {
      col.fields.add(new TextField({ name: 'approved_by' }))
    }
    app.save(col)

    // Backfill idempotente: toda versão existente vira versão 1.
    app
      .db()
      .newQuery(
        `UPDATE virtual_plans SET plan_version = 1 WHERE plan_version IS NULL OR plan_version = 0`,
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    ;['plan_version', 'approved_by'].forEach((f) => {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    })
    app.save(col)
  },
)
