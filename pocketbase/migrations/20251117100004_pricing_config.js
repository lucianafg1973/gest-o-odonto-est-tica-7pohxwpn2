/**
 * Migração aditiva — configuração GLOBAL de percentuais da precificação.
 *
 * A planilha "Situação Atual" (LucratividadeSheet) passa a calcular cartão,
 * comissão, inadimplência e imposto a partir de percentuais ÚNICOS por coluna
 * (editáveis no cabeçalho), em vez dos campos por linha de procedures.
 * Cria a coleção pricing_config (singleton 1 linha) com os mesmos valores que
 * o seed de procedimentos usava (cartão 10, comissão 3, inadimplência 4,
 * imposto 12) — idempotente.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('pricing_config')
    } catch (_) {
      col = new Collection({
        name: 'pricing_config',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          { name: 'card_fee_percent', type: 'number', min: 0, max: 100 },
          { name: 'sales_commission_percent', type: 'number', min: 0, max: 100 },
          { name: 'default_percent', type: 'number', min: 0, max: 100 },
          { name: 'tax_percent', type: 'number', min: 0, max: 100 },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
      })
      app.save(col)
    }

    /* seed idempotente: só cria a linha única se ela ainda não existir */
    let existentes = []
    try {
      existentes = app.findRecordsByFilter('pricing_config', 'id != ""', '', 1, 0)
    } catch (_) {
      existentes = []
    }
    if (existentes.length === 0) {
      const rec = new Record(col)
      rec.set('card_fee_percent', 10)
      rec.set('sales_commission_percent', 3)
      rec.set('default_percent', 4)
      rec.set('tax_percent', 12)
      app.save(rec)
      console.log(
        '[pricing_config] linha única criada (cartão 10, comissão 3, inad. 4, imposto 12)',
      )
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pricing_config')
      app.delete(col)
    } catch (_) {
      /* nada a reverter */
    }
  },
)
