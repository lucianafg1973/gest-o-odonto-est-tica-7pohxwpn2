/**
 * Migração 0019 (v0.0.50) — expediente comercial no banco.
 * Coleção `work_schedule`: uma linha por dia da semana (dow 0=domingo … 6=sábado),
 * com horário de início e fim. Idempotente: seed só insere quando a coleção está vazia.
 */
migrate(
  (app) => {
    const collection = new Collection({
      name: 'work_schedule',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'dow', type: 'number', required: false, min: 0, max: 6, onlyInt: true },
        { name: 'start_time', type: 'text', required: true },
        { name: 'end_time', type: 'text', required: true },
      ],
    })
    app.save(collection)

    // Seed padrão 08:00–19:00 (idempotente — roda só quando não há linhas).
    const col = app.findCollectionByNameOrId('work_schedule')
    const existing = $app.findRecordsByFilter('work_schedule', 'id != ""', 'dow', 1)
    if (existing.length === 0) {
      const defaults = [
        { dow: 0, start_time: '08:00', end_time: '19:00' },
        { dow: 1, start_time: '08:00', end_time: '19:00' },
        { dow: 2, start_time: '08:00', end_time: '19:00' },
        { dow: 3, start_time: '08:00', end_time: '19:00' },
        { dow: 4, start_time: '08:00', end_time: '19:00' },
        { dow: 5, start_time: '08:00', end_time: '19:00' },
        { dow: 6, start_time: '08:00', end_time: '19:00' },
      ]
      for (const d of defaults) {
        const rec = new Record(col)
        rec.set('dow', d.dow)
        rec.set('start_time', d.start_time)
        rec.set('end_time', d.end_time)
        app.save(rec)
      }
    }
  },
  (app) => {
    // rollback aditivo
    try {
      app.delete(app.findCollectionByNameOrId('work_schedule'))
    } catch (_) {
      /* coleção já inexistente */
    }
  },
)
