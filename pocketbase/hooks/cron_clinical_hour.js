cronAdd('monthly_clinical_hour_update', '0 0 1 * *', () => {
  try {
    const configs = $app.findRecordsByFilter('clinical_hour_config', 'id != ""', '-period', 1, 0)
    if (configs.length === 0) return

    const latest = configs[0]
    const monthlyCost = Number(latest.get('monthly_operating_cost')) || 0
    const clinicalHours = Number(latest.get('available_clinical_hours')) || 1
    const hourValue = monthlyCost / clinicalHours

    const currentPeriod = new Date().toISOString().slice(0, 7)

    try {
      $app.findFirstRecordByData('clinical_hour_config', 'period', currentPeriod)
    } catch (_) {
      const col = $app.findCollectionByNameOrId('clinical_hour_config')
      const rec = new Record(col)
      rec.set('monthly_operating_cost', monthlyCost)
      rec.set('available_clinical_hours', clinicalHours)
      rec.set('clinical_hour_value', hourValue)
      rec.set('period', currentPeriod)
      rec.set('last_updated', new Date().toISOString().slice(0, 10))
      $app.save(rec)
    }

    const procedures = $app.findRecordsByFilter('procedures', 'id != ""', 'name', 500, 0)
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
    })

    $app
      .logger()
      .info(
        'clinical hour monthly update completed',
        'period',
        currentPeriod,
        'hour_value',
        hourValue,
      )
  } catch (err) {
    $app.logger().error('clinical hour cron failed', 'error', String(err))
  }
})
