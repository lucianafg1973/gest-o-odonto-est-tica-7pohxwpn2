migrate(
  (app) => {
    // Aditivo: meio 'cartao_taxa' no select payment_method de financial_transactions
    // (usado pelas despesas internas de taxa de cartão — nunca visível no recibo).
    const fin = app.findCollectionByNameOrId('financial_transactions')
    const pm = fin.fields.getByName('payment_method')
    if (pm) {
      const values = (pm.values || []).slice()
      if (!values.includes('cartao_taxa')) {
        values.push('cartao_taxa')
        pm.values = values
        app.save(fin)
      }
    }
  },
  (app) => {
    try {
      const fin = app.findCollectionByNameOrId('financial_transactions')
      const pm = fin.fields.getByName('payment_method')
      if (pm && Array.isArray(pm.values)) {
        pm.values = pm.values.filter((v) => v !== 'cartao_taxa')
        app.save(fin)
      }
    } catch (_) {}
  },
)
