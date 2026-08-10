migrate(
  (app) => {
    const profCol = app.findCollectionByNameOrId('professionals')
    const profs = [
      {
        name: 'Dra. Luciana F. G.',
        specialty: 'Odontologia e Estética Facial',
        commission_rate: 30,
      },
      { name: 'Dr. Rafael Mendes', specialty: 'Implantodontia', commission_rate: 25 },
      { name: 'Ana Paula Souza', specialty: 'Coordenadora de Atendimento', commission_rate: 5 },
    ]
    const profIds = {}
    profs.forEach((p) => {
      try {
        app.findFirstRecordByData('professionals', 'name', p.name)
      } catch (_) {
        const rec = new Record(profCol)
        rec.set('name', p.name)
        rec.set('specialty', p.specialty)
        rec.set('commission_rate', p.commission_rate)
        app.save(rec)
      }
      profIds[p.name] = app.findFirstRecordByData('professionals', 'name', p.name).id
    })

    const goalsCol = app.findCollectionByNameOrId('goals')
    const periodStr = new Date().toISOString().slice(0, 7)
    const goalsData = [
      {
        professional: profIds['Dra. Luciana F. G.'],
        period: periodStr,
        target_value: 50000,
        goal_type: 'faturamento',
      },
      {
        professional: profIds['Dr. Rafael Mendes'],
        period: periodStr,
        target_value: 30000,
        goal_type: 'producao',
      },
      {
        professional: profIds['Dra. Luciana F. G.'],
        period: periodStr,
        target_value: 20,
        goal_type: 'novos_pacientes',
      },
    ]
    goalsData.forEach((g) => {
      try {
        app.findFirstRecordByData('goals', 'period', g.period)
      } catch (_) {
        const rec = new Record(goalsCol)
        rec.set('professional', g.professional)
        rec.set('period', g.period)
        rec.set('target_value', g.target_value)
        rec.set('current_value', 0)
        rec.set('goal_type', g.goal_type)
        app.save(rec)
      }
    })

    const implantCol = app.findCollectionByNameOrId('implants')
    const implantData = [
      {
        marca: 'Straumann',
        modelo: 'BLT',
        tamanho: 10,
        espessura: 3.3,
        tipo: 'Cilíndrico',
        category: 'implante',
      },
      {
        marca: 'Straumann',
        modelo: 'BLT',
        tamanho: 12,
        espessura: 4.1,
        tipo: 'Cilíndrico',
        category: 'implante',
      },
      {
        marca: 'Straumann',
        modelo: 'TLX',
        tamanho: 10,
        espessura: 3.3,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Neodent',
        modelo: 'Drive',
        tamanho: 11,
        espessura: 3.5,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Neodent',
        modelo: 'Grand Morse',
        tamanho: 10,
        espessura: 3.75,
        tipo: 'Cone Morse',
        category: 'implante',
      },
      {
        marca: 'Neodent',
        modelo: 'Grand Morse',
        tamanho: 13,
        espessura: 4.0,
        tipo: 'Cone Morse',
        category: 'implante',
      },
      {
        marca: 'Nobel Biocare',
        modelo: 'Active',
        tamanho: 10,
        espessura: 3.5,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Nobel Biocare',
        modelo: 'Replace',
        tamanho: 12,
        espessura: 4.3,
        tipo: 'Cilíndrico',
        category: 'implante',
      },
      {
        marca: 'Conexão',
        modelo: 'Master',
        tamanho: 11,
        espessura: 3.75,
        tipo: 'Hexágono Externo',
        category: 'implante',
      },
      {
        marca: 'Conexão',
        modelo: 'S.I.N.',
        tamanho: 10,
        espessura: 3.5,
        tipo: 'Hexágono Interno',
        category: 'implante',
      },
      {
        marca: 'Titanium Fix',
        modelo: 'Master',
        tamanho: 11,
        espessura: 3.75,
        tipo: 'Cilíndrico',
        category: 'implante',
      },
      {
        marca: 'Titanium Fix',
        modelo: 'CM',
        tamanho: 10,
        espessura: 4.0,
        tipo: 'Cone Morse',
        category: 'implante',
      },
      {
        marca: 'S.I.N. Implant',
        modelo: 'Strong',
        tamanho: 10,
        espessura: 3.75,
        tipo: 'Hexágono Externo',
        category: 'implante',
      },
      {
        marca: 'S.I.N. Implant',
        modelo: 'Unit',
        tamanho: 13,
        espessura: 4.0,
        tipo: 'Hexágono Interno',
        category: 'implante',
      },
      {
        marca: 'Intralock',
        modelo: 'LOD',
        tamanho: 10,
        espessura: 3.5,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Intralock',
        modelo: 'Intense',
        tamanho: 12,
        espessura: 4.1,
        tipo: 'Cilíndrico',
        category: 'implante',
      },
      {
        marca: 'Bicon',
        modelo: 'HA',
        tamanho: 8,
        espessura: 4.0,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Bicon',
        modelo: 'Max',
        tamanho: 6,
        espessura: 5.0,
        tipo: 'Cônico',
        category: 'implante',
      },
      {
        marca: 'Straumann',
        modelo: 'Abutment Regular',
        tamanho: 0,
        espessura: 3.3,
        tipo: 'Componente Protético',
        category: 'componente',
      },
      {
        marca: 'Neodent',
        modelo: 'Abutment GM',
        tamanho: 0,
        espessura: 3.5,
        tipo: 'Componente Protético',
        category: 'componente',
      },
    ]
    implantData.forEach((imp) => {
      try {
        app.findFirstRecordByData('implants', 'modelo', imp.modelo)
      } catch (_) {
        const rec = new Record(implantCol)
        rec.set('marca', imp.marca)
        rec.set('modelo', imp.modelo)
        rec.set('tamanho', imp.tamanho)
        rec.set('espessura', imp.espessura)
        rec.set('tipo', imp.tipo)
        rec.set('category', imp.category)
        app.save(rec)
      }
    })

    const leadsCol = app.findCollectionByNameOrId('leads')
    const leadsData = [
      {
        name: 'Fernanda Lima',
        phone: '11912345678',
        email: 'fernanda.lima@email.com',
        source: 'instagram',
        status: 'avaliacao',
        professional: profIds['Dra. Luciana F. G.'],
        notes: 'Interessada em clareamento dental',
      },
      {
        name: 'Pedro Santos',
        phone: '11987654321',
        email: 'pedro.santos@email.com',
        source: 'whatsapp',
        status: 'lead',
        professional: profIds['Ana Paula Souza'],
        notes: 'Deseja orçamento de implante',
      },
      {
        name: 'Juliana Costa',
        phone: '11955667788',
        email: 'juliana.costa@email.com',
        source: 'anuncios',
        status: 'tratamento',
        professional: profIds['Dr. Rafael Mendes'],
        notes: 'Em tratamento de implante',
      },
      {
        name: 'Marcos Oliveira',
        phone: '11944556677',
        email: 'marcos@email.com',
        source: 'indicacoes',
        status: 'avaliacao',
        professional: profIds['Dra. Luciana F. G.'],
        notes: 'Indicação da paciente Mariana',
      },
      {
        name: 'Patrícia Alves',
        phone: '11933445566',
        email: 'patricia.alves@email.com',
        source: 'manual',
        status: 'recuperado',
        professional: profIds['Ana Paula Souza'],
        notes: 'Não respondia há 30 dias',
      },
    ]
    const leadIds = {}
    leadsData.forEach((l) => {
      try {
        app.findFirstRecordByData('leads', 'phone', l.phone)
      } catch (_) {
        const rec = new Record(leadsCol)
        rec.set('name', l.name)
        rec.set('phone', l.phone)
        rec.set('email', l.email)
        rec.set('source', l.source)
        rec.set('status', l.status)
        rec.set('professional', l.professional)
        rec.set('notes', l.notes)
        app.save(rec)
      }
      leadIds[l.name] = app.findFirstRecordByData('leads', 'phone', l.phone).id
    })

    const propCol = app.findCollectionByNameOrId('proposals')
    const todayStr = new Date().toISOString().slice(0, 10)
    const propData = [
      {
        lead: leadIds['Fernanda Lima'],
        status: 'enviada',
        value: 950,
        notes: 'Clareamento a laser',
      },
      {
        lead: leadIds['Pedro Santos'],
        status: 'pendente',
        value: 2500,
        notes: 'Implante unitário + componente',
      },
      {
        lead: leadIds['Marcos Oliveira'],
        status: 'aceita',
        value: 1200,
        notes: 'Harmonização facial',
      },
    ]
    propData.forEach((p) => {
      try {
        app.findFirstRecordByData('proposals', 'notes', p.notes)
      } catch (_) {
        const rec = new Record(propCol)
        rec.set('lead', p.lead)
        rec.set('status', p.status)
        rec.set('value', p.value)
        rec.set('sent_date', todayStr)
        rec.set('notes', p.notes)
        app.save(rec)
      }
    })
  },
  (app) => {},
)
