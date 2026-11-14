/**
 * 0017 — Corretivo idempotente da Hora Clínica.
 *
 * Estado encontrado: clinical_hour_config com monthly_operating_cost=30000
 * (R$ 78,13/h) e clinic_cost_items VAZIO. A especificação da proprietária
 * pede planilha somando R$ 53.835,00/mês e 480h × (1−20%) = 384h produtivas
 * → hora ≈ R$ 140,20 (53835 / 384 = 140,1953…).
 *
 * Idempotência:
 *  a) Itens só são semeados se a coleção estiver VAZIA — rodar de novo não
 *     duplica e nunca toca em itens criados/editados pelo usuário.
 *  b) O config só é reajustado quando ainda reflete o seed quebrado
 *     (monthly=30000) ou está vazio (horas/custos zerados). Depois de
 *     ajustado (53835/480/384) uma nova execução não altera nada, nem
 *     valores que o usuário tenha editado entretanto.
 */
migrate(
  (app) => {
    const period = new Date().toISOString().slice(0, 7)

    // ---- a) Seed da planilha de custos (soma exata: 53.835,00) ----
    if (app.countRecords('clinic_cost_items') === 0) {
      const col = app.findCollectionByNameOrId('clinic_cost_items')
      const itens = [
        // pessoal — 25.700
        { d: 'Pró-labore da proprietária', c: 'Pró-labore', g: 'pessoal', a: 12000 },
        { d: 'Salários da equipe', c: 'Salários', g: 'pessoal', a: 9500 },
        { d: 'Encargos trabalhistas (INSS/FGTS)', c: 'Encargos', g: 'pessoal', a: 4200 },
        // operacional — 17.585
        { d: 'Aluguel da clínica', c: 'Aluguel', g: 'operacional', a: 8500 },
        { d: 'Condomínio', c: 'Condomínio', g: 'operacional', a: 1200 },
        { d: 'Energia elétrica', c: 'Energia', g: 'operacional', a: 900 },
        { d: 'Água e saneamento', c: 'Água', g: 'operacional', a: 250 },
        { d: 'Marketing e mídia', c: 'Marketing', g: 'operacional', a: 3500 },
        { d: 'Contabilidade', c: 'Contabilidade', g: 'operacional', a: 1200 },
        { d: 'Software e sistemas (licenças)', c: 'Software', g: 'operacional', a: 800 },
        { d: 'Manutenção predial e equipamentos', c: 'Manutenção', g: 'operacional', a: 600 },
        {
          d: 'Materiais administrativos',
          c: 'Materiais administrativos',
          g: 'operacional',
          a: 635,
        },
        // provisão — 9.550
        { d: 'Provisão de férias e 13º', c: 'Provisões', g: 'provisao', a: 9550 },
        // reserva — 1.000
        { d: 'Reserva de emergência', c: 'Reservas', g: 'reserva', a: 1000 },
      ]
      const soma = itens.reduce((s, i) => s + i.a, 0)
      if (soma !== 53835) throw new Error('Seed da hora clínica soma ' + soma + ' — esperado 53835')
      itens.forEach((it) => {
        const r = new Record(col)
        r.set('description', it.d)
        r.set('category', it.c)
        r.set('group', it.g)
        r.set('amount', it.a)
        r.set('period_month', period)
        r.set('active', true)
        app.save(r)
      })
      console.log('[0017] clinic_cost_items semeado: ' + itens.length + ' itens, R$ ' + soma)
    }

    // ---- b) Ajuste da capacidade produtiva (480h / 20% → 384h) ----
    const configs = app.findRecordsByFilter('clinical_hour_config', 'id != ""', '-period', 50, 0)
    configs.forEach((rec) => {
      const mo = Number(rec.getFloat('monthly_operating_cost')) || 0
      const ah = Number(rec.getFloat('available_hours')) || 0
      const ph = Number(rec.getFloat('productive_hours')) || 0
      // quebrado = seed antigo (30000) ou campos de capacidade vazios
      const quebrado = Math.round(mo) === 30000 || !ah || !ph
      if (!quebrado) return // já ajustado ou editado pelo usuário — não toca
      const available = 480
      const idle = 20
      const prod = available * (1 - idle / 100) // 384
      const hora = 53835 / prod // ≈ 140,1953
      rec.set('monthly_operating_cost', 53835)
      rec.set('available_clinical_hours', available)
      rec.set('clinical_hour_value', hora)
      if (!rec.get('rooms_count')) rec.set('rooms_count', 2)
      if (!rec.get('hours_per_day')) rec.set('hours_per_day', 8)
      if (!rec.get('days_per_month')) rec.set('days_per_month', 30)
      rec.set('idle_percent', idle)
      rec.set('available_hours', available)
      rec.set('productive_hours', prod)
      rec.set('hour_cost', hora)
      rec.set('minute_cost', hora / 60)
      rec.set('last_updated', new Date().toISOString().slice(0, 10))
      app.save(rec)
      console.log('[0017] config ajustado: periodo=' + rec.getString('period') + ' hora=' + hora)
    })
  },
  (app) => {
    // down: não destrói dados do usuário — reverso é no-op documentado
  },
)
