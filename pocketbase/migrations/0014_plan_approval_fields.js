// Migração aditiva 0014: aprovação do planejamento e assinatura separada.
// virtual_plans — campos novos (nenhum registro existente é alterado):
//   approved_at    — data/hora ISO da aprovação (auditoria)
//   signature_status — status da assinatura do PACIENTE, independente da
//                      aprovação feita pelo profissional:
//                      'nao_assinado' | 'assinado'
//   signed_at      — data em que o paciente assinou o documento impresso
//   signed_by      — usuário que registrou a assinatura
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    if (!col.fields.getByName('approved_at')) {
      col.fields.add(new TextField({ name: 'approved_at' }))
    }
    if (!col.fields.getByName('signature_status')) {
      col.fields.add(
        new SelectField({
          name: 'signature_status',
          maxSelect: 1,
          values: ['nao_assinado', 'assinado'],
        }),
      )
    }
    if (!col.fields.getByName('signed_at')) {
      col.fields.add(new TextField({ name: 'signed_at' }))
    }
    if (!col.fields.getByName('signed_by')) {
      col.fields.add(new TextField({ name: 'signed_by' }))
    }
    app.save(col)

    // Backfill idempotente: registros existentes ficam sem assinatura registrada.
    app
      .db()
      .newQuery(
        `UPDATE virtual_plans SET signature_status = 'nao_assinado' WHERE signature_status IS NULL OR signature_status = ''`,
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('virtual_plans')
    ;['approved_at', 'signature_status', 'signed_at', 'signed_by'].forEach((f) => {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    })
    app.save(col)
  },
)
