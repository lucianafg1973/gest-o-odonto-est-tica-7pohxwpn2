routerAdd(
  'POST',
  '/backend/v1/clinical-hour/recalculate',
  (e) => {
    try {
      const configs = $app.findRecordsByFilter('clinical_hour_config', 'id != ""', '-period', 1, 0)
      if (configs.length === 0)
        return e.badRequestError('Configuração de hora clínica não encontrada')

      const config = configs[0]
      const monthlyCost = Number(config.get('monthly_operating_cost')) || 0
      const clinicalHours = Number(config.get('available_clinical_hours')) || 1
      const hourValue = monthlyCost / clinicalHours

      config.set('clinical_hour_value', hourValue)
      config.set('last_updated', new Date().toISOString().slice(0, 10))
      $app.save(config)

      const procedures = $app.findRecordsByFilter('procedures', 'id != ""', 'name', 500, 0)
      let updated = 0
      procedures.forEach((proc) => {
        const duration = Number(proc.get('duration_minutes')) || 0
        const chp = hourValue * (duration / 60)
        const material = Number(proc.get('material_cost')) || 0
        const lab = Number(proc.get('lab_price')) || 0
        const rework = Number(proc.get('rework_cost')) || 0
        const base = chp + material + lab + rework
        const cardFee = (base * (Number(proc.get('card_fee_percent')) || 0)) / 100
        const ir = (base * (Number(proc.get('ir_percent')) || 0)) / 100
        const commission = (base * (Number(proc.get('sales_commission_percent')) || 0)) / 100
        const executor = (base * (Number(proc.get('executor_percent')) || 0)) / 100
        const computed = base + cardFee + ir + commission + executor

        proc.set('computed_price', computed)
        if (!proc.get('use_manual_price')) {
          proc.set('price', computed)
        }
        $app.saveNoValidate(proc)
        updated++
      })

      return e.json(200, {
        clinical_hour_value: hourValue,
        updated_procedures: updated,
      })
    } catch (err) {
      return e.json(500, { error: String(err && err.message ? err.message : err) })
    }
  },
  $apis.requireAuth(),
)
