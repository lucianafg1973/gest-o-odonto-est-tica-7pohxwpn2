// Migração aditiva 0015: tipos de documento do fluxo do planejamento.
// documents.document_type (select) recebe valores novos — os existentes
// (tcle, contrato, pos_operatorio, orientacoes, informativo) são preservados.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('document_type')
    if (field && field.type === 'select') {
      const values = field.values || []
      const novos = ['orcamento', 'aprovado', 'aceite', 'assinado'].filter(
        (v) => !values.includes(v),
      )
      if (novos.length > 0) {
        field.values = [...values, ...novos]
        app.save(col)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('document_type')
    if (field && field.type === 'select') {
      field.values = (field.values || []).filter(
        (v) => !['orcamento', 'aprovado', 'aceite', 'assinado'].includes(v),
      )
      app.save(col)
    }
  },
)
