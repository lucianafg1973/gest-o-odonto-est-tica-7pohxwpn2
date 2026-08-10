migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'lucianafg@gmail.com')
    } catch (_) {
      const userRec = new Record(users)
      userRec.setEmail('lucianafg@gmail.com')
      userRec.setPassword('Skip@Pass')
      userRec.setVerified(true)
      userRec.set('name', 'Dra. Luciana F. G.')
      app.save(userRec)
    }

    const proceduresCol = app.findCollectionByNameOrId('procedures')
    let p1, p2, p3, p4
    try {
      p1 = app.findFirstRecordByData('procedures', 'name', 'Limpeza Dental e Profilaxia')
    } catch (_) {
      p1 = new Record(proceduresCol)
      p1.set('name', 'Limpeza Dental e Profilaxia')
      p1.set('category', 'dentista')
      p1.set('description', 'Remoção de tártaro, placa bacteriana e polimento coronário completo.')
      p1.set('price', 250)
      p1.set('duration_minutes', 45)
      p1.set(
        'pre_op_instructions',
        '<p>Escovar os dentes normalmente antes da consulta e trazer documento com foto.</p>',
      )
      p1.set(
        'post_op_instructions',
        '<p>Evitar alimentos muito pigmentados nas primeiras 2 horas pós-polimento.</p>',
      )
      app.save(p1)
    }

    try {
      p2 = app.findFirstRecordByData('procedures', 'name', 'Clareamento Dental a Laser')
    } catch (_) {
      p2 = new Record(proceduresCol)
      p2.set('name', 'Clareamento Dental a Laser')
      p2.set('category', 'dentista')
      p2.set(
        'description',
        'Sessão de clareamento de consultório ativado por luz de alta intensidade.',
      )
      p2.set('price', 950)
      p2.set('duration_minutes', 60)
      p2.set(
        'pre_op_instructions',
        '<p>Realizar profilaxia prévia e suspender uso de cremes para sensibilidade sem prescrição.</p>',
      )
      p2.set(
        'post_op_instructions',
        '<p>Dieta branca por 48 horas (sem café, vinho, açaí, molho vermelho). Usar dessensibilizante se indicado.</p>',
      )
      app.save(p2)
    }

    try {
      p3 = app.findFirstRecordByData('procedures', 'name', 'Aplicação de Toxina Botulínica (Botox)')
    } catch (_) {
      p3 = new Record(proceduresCol)
      p3.set('name', 'Aplicação de Toxina Botulínica (Botox)')
      p3.set('category', 'harmonizacao')
      p3.set('description', 'Suavização de linhas de expressão em terço superior da face.')
      p3.set('price', 1200)
      p3.set('duration_minutes', 40)
      p3.set(
        'pre_op_instructions',
        '<p>Sem maquiagem na região. Evitar anticoagulantes ou bebidas alcoólicas na véspera.</p>',
      )
      p3.set(
        'post_op_instructions',
        '<p>Não deitar ou massagear a face por 4 horas. Evitar atividades físicas intensas no dia.</p>',
      )
      app.save(p3)
    }

    try {
      p4 = app.findFirstRecordByData(
        'procedures',
        'name',
        'Preenchimento Labial com Ácido Hialurônico',
      )
    } catch (_) {
      p4 = new Record(proceduresCol)
      p4.set('name', 'Preenchimento Labial com Ácido Hialurônico')
      p4.set('category', 'estetica')
      p4.set(
        'description',
        'Esculpe contorno, volume e hidratação labial com aplicação de anestésico local.',
      )
      p4.set('price', 1400)
      p4.set('duration_minutes', 50)
      p4.set(
        'pre_op_instructions',
        '<p>Informar caso tenha histórico de herpes labial para prescrição profilática prévia.</p>',
      )
      p4.set(
        'post_op_instructions',
        '<p>Aplicar compressa gelada suave. Evitar beijos fortes, esforço e exposição ao sol nos primeiros 3 dias.</p>',
      )
      app.save(p4)
    }

    const patientsCol = app.findCollectionByNameOrId('patients')
    let pat1, pat2, pat3, pat4
    try {
      pat1 = app.findFirstRecordByData('patients', 'name', 'Mariana Souza Alencar')
    } catch (_) {
      pat1 = new Record(patientsCol)
      pat1.set('name', 'Mariana Souza Alencar')
      pat1.set('email', 'mariana.alencar@email.com')
      pat1.set('phone', '11988776655')
      pat1.set('cpf', '321.654.987-00')
      pat1.set('birth_date', '1992-05-14')
      pat1.set('address', 'Rua das Flores, 120 - São Paulo, SP')
      pat1.set('medical_notes', '<p>Alergia a Dipirona. Sensibilidade dentária leve.</p>')
      app.save(pat1)
    }

    try {
      pat2 = app.findFirstRecordByData('patients', 'name', 'Carlos Eduardo Pereira')
    } catch (_) {
      pat2 = new Record(patientsCol)
      pat2.set('name', 'Carlos Eduardo Pereira')
      pat2.set('email', 'carlos.pereira@email.com')
      pat2.set('phone', '11977665544')
      pat2.set('cpf', '456.789.123-11')
      pat2.set('birth_date', '1985-11-20')
      pat2.set('address', 'Av. Paulista, 1500, Apto 82 - São Paulo, SP')
      pat2.set('medical_notes', '<p>Sem alergias relatadas. Hipertensão controlada.</p>')
      app.save(pat2)
    }

    try {
      pat3 = app.findFirstRecordByData('patients', 'name', 'Ana Beatriz Lima')
    } catch (_) {
      pat3 = new Record(patientsCol)
      pat3.set('name', 'Ana Beatriz Lima')
      pat3.set('email', 'anabeatriz@email.com')
      pat3.set('phone', '11966554433')
      pat3.set('cpf', '123.456.789-22')
      pat3.set('birth_date', '1998-08-03')
      pat3.set('address', 'Rua Oscar Freire, 410 - São Paulo, SP')
      pat3.set('medical_notes', '<p>Paciente em tratamento estético facial contínuo.</p>')
      app.save(pat3)
    }

    try {
      pat4 = app.findFirstRecordByData('patients', 'name', 'Ricardo Mendes Alves')
    } catch (_) {
      pat4 = new Record(patientsCol)
      pat4.set('name', 'Ricardo Mendes Alves')
      pat4.set('email', 'ricardo.alves@email.com')
      pat4.set('phone', '11955443322')
      pat4.set('cpf', '789.123.456-33')
      pat4.set('birth_date', '1980-02-28')
      pat4.set('address', 'Alameda Santos, 900 - São Paulo, SP')
      pat4.set('medical_notes', '<p>Praticante de esportes. Bruxismo noturno moderado.</p>')
      app.save(pat4)
    }

    const appCol = app.findCollectionByNameOrId('appointments')
    const todayStr = new Date().toISOString().slice(0, 10)
    try {
      app.findFirstRecordByData('appointments', 'notes', 'Consulta inicial hoje mariana')
    } catch (_) {
      const a1 = new Record(appCol)
      a1.set('patient', pat1.id)
      a1.set('procedure', p2.id)
      a1.set('date', todayStr)
      a1.set('start_time', '09:00')
      a1.set('end_time', '10:00')
      a1.set('status', 'confirmado')
      a1.set('notes', 'Consulta inicial hoje mariana')
      app.save(a1)

      const a2 = new Record(appCol)
      a2.set('patient', pat2.id)
      a2.set('procedure', p1.id)
      a2.set('date', todayStr)
      a2.set('start_time', '10:30')
      a2.set('end_time', '11:15')
      a2.set('status', 'agendado')
      a2.set('notes', 'Profilaxia semestral')
      app.save(a2)

      const a3 = new Record(appCol)
      a3.set('patient', pat3.id)
      a3.set('procedure', p3.id)
      a3.set('date', todayStr)
      a3.set('start_time', '14:00')
      a3.set('end_time', '14:40')
      a3.set('status', 'confirmado')
      a3.set('notes', 'Retoque toxina botulínica')
      app.save(a3)
    }

    const finCol = app.findCollectionByNameOrId('financial_transactions')
    try {
      app.findFirstRecordByData(
        'financial_transactions',
        'description',
        'Clareamento Dental - Mariana',
      )
    } catch (_) {
      const f1 = new Record(finCol)
      f1.set('patient', pat1.id)
      f1.set('transaction_type', 'receita')
      f1.set('category', 'procedimento')
      f1.set('description', 'Clareamento Dental - Mariana')
      f1.set('amount', 950)
      f1.set('payment_method', 'pix')
      f1.set('status', 'pago')
      f1.set('transaction_date', todayStr)
      app.save(f1)

      const f2 = new Record(finCol)
      f2.set('patient', pat3.id)
      f2.set('transaction_type', 'receita')
      f2.set('category', 'procedimento')
      f2.set('description', 'Aplicação de Botox - Ana')
      f2.set('amount', 1200)
      f2.set('payment_method', 'cartao')
      f2.set('status', 'pago')
      f2.set('transaction_date', todayStr)
      app.save(f2)

      const f3 = new Record(finCol)
      f3.set('transaction_type', 'despesa')
      f3.set('category', 'produto')
      f3.set('description', 'Insumos Odontológicos e Estéticos do Mês')
      f3.set('amount', 450)
      f3.set('payment_method', 'pix')
      f3.set('status', 'pago')
      f3.set('transaction_date', todayStr)
      app.save(f3)
    }
  },
  (app) => {},
)
