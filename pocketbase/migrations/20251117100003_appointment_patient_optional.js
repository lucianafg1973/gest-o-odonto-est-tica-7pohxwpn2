// 20251117100003_appointment_patient_optional.js — compromissos internos não têm paciente.
// Torna a relação `patient` OPCIONAL em appointments (aditivo/não destrutivo:
// nenhuma linha é alterada; consultas continuam sempre exigindo paciente na UI).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    const patient = col.fields.getByName('patient')
    if (patient) patient.required = false
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    const patient = col.fields.getByName('patient')
    if (patient) patient.required = true
    app.save(col)
  },
)
