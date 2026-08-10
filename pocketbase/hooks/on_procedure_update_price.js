onRecordUpdate((e) => {
  const record = e.record

  let hourValue = 0
  try {
    const configs = $app.findRecordsByFilter('clinical_hour_config', 'id != ""', '-period', 1, 0)
    if (configs.length > 0) {
      hourValue = Number(configs[0].get('clinical_hour_value')) || 0
    }
  } catch (_) {}

  const duration = Number(record.get('duration_minutes')) || 0
  const chp = hourValue * (duration / 60)
  const material = Number(record.get('material_cost')) || 0
  const lab = Number(record.get('lab_price')) || 0
  const rework = Number(record.get('rework_cost')) || 0
  const base = chp + material + lab + rework
  const cardFee = (base * (Number(record.get('card_fee_percent')) || 0)) / 100
  const ir = (base * (Number(record.get('ir_percent')) || 0)) / 100
  const commission = (base * (Number(record.get('sales_commission_percent')) || 0)) / 100
  const executor = (base * (Number(record.get('executor_percent')) || 0)) / 100
  const computed = base + cardFee + ir + commission + executor

  record.set('computed_price', computed)
  if (!record.get('use_manual_price')) {
    record.set('price', computed)
  }

  e.next()
}, 'procedures')
