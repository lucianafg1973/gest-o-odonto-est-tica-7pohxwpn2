/**
 * Migração aditiva — Planilha de Precificação (custos fixos + lucratividade).
 *
 * 1. Adiciona o campo `default_percent` (inadimplência %) à coleção procedures.
 * 2. Importa (upsert IDEMPOTENTE por nome) os ~106 procedimentos das planilhas
 *    "Custos e Despesas Fixas" + "Situação Atual" com preço, minutos, lab,
 *    material e despesas diretas D. Registros NOVOS recebem preço oficial com
 *    use_manual_price=true (o hook on_procedure_*_price não sobrescreve).
 *    Registros EXISTENTES: só campos vazios/zerados são preenchidos — nada é
 *    apagado nem sobrescrito.
 * 3. Semear clinic_cost_items com a planilha de Custos e Despesas Fixas
 *    (upsert por descrição; não duplica linhas existentes).
 * 4. Criar clinical_hour_config (se não houver) com horas 480, ociosidade 20%
 *    e fator de avaliação 15% — mesmos valores da planilha.
 */
migrate(
  (app) => {
    /* ---------- 1. campo default_percent em procedures ---------- */
    const procs = app.findCollectionByNameOrId('procedures')
    let temDefault = false
    try {
      temDefault = !!procs.fields.getByName('default_percent')
    } catch (_) {
      temDefault = false
    }
    if (!temDefault) {
      procs.fields.add(new NumberField({ name: 'default_percent', min: 0, max: 100 }))
      app.save(procs)
    }

    /* ---------- 2. procedimentos das planilhas ---------- */
    // [nome, categoria, preço, minutos, laboratório, material, despesas D]
    const DATA = [
      ['Implante unitário fase cirúrgica', 'dentista', 1800, 60, 180, 200, 150],
      ['Coroa sobre implante unitário', 'dentista', 5500, 150, 190, 0, 100],
      ['Prótese tipo protocolo em resina acrílica', 'dentista', 8550, 360, 855, 830, 500],
      ['Sobredentadura / Overdenture', 'dentista', 6200, 360, 620, 415, 350],
      ['Enxerto em Bloco', 'dentista', 2980, 120, 298, 460, 250],
      ['Enxerto de Osso ROG', 'dentista', 2600, 120, 260, 450, 250],
      ['Levantamento de seio Maxilar unilateral', 'dentista', 3280, 120, 328, 450, 250],
      ['Extração Dentária', 'dentista', 250, 30, 45, 0, 35],
      ['Extração à retalho', 'dentista', 450, 60, 45, 0, 80],
      ['Extração siso incluso', 'dentista', 1500, 60, 150, 0, 130],
      ['Extração siso semi-incluso', 'dentista', 800, 60, 80, 0, 100],
      ['Restauração 1, 2 ou 3 faces', 'dentista', 380, 40, 38, 0, 55],
      ['Restauração MOD', 'dentista', 450, 40, 45, 0, 55],
      ['Reconstrução em Resina Bulk Fill', 'dentista', 620, 60, 62, 0, 90],
      ['Restauração de Resina Flow', 'dentista', 350, 30, 35, 0, 50],
      ['Facetas Direta em Resina Foto', 'dentista', 990, 60, 99, 0, 100],
      ['Inlay/Onlay Direta em Resina', 'dentista', 620, 60, 62, 0, 75],
      ['Tratamento Endodôntico', 'dentista', 1380, 120, 138, 0, 380],
      ['Retratamento Endodôntico', 'dentista', 1480, 120, 148, 0, 380],
      ['Retratamento Endodôntico MOLARES', 'dentista', 1680, 120, 168, 0, 450],
      ['Pulpotomia', 'dentista', 380, 60, 38, 0, 35],
      ['Apicetomia', 'dentista', 1300, 60, 130, 0, 380],
      ['INVISALIGN Comprehensive', 'dentista', 14800, 570, 1480, 0, 200],
      ['INVISALIGN Moderate', 'dentista', 12760, 390, 1276, 0, 200],
      ['INVISALIGN First', 'dentista', 9870, 510, 987, 0, 200],
      ['Lite', 'dentista', 11700, 360, 1170, 0, 200],
      ['Contenção Vivera', 'dentista', 1780, 40, 178, 0, 50],
      ['Clear Correct Flex', 'dentista', 5680, 200, 568, 1555, 0],
      ['Clear Mini 12 + 12', 'dentista', 8850, 300, 885, 3203, 0],
      ['Clear Correct One 24 + 24', 'dentista', 9580, 360, 958, 4015, 0],
      ['Clear Correct Two 48 + 48', 'dentista', 12800, 400, 1280, 4417, 0],
      ['Clear Correct Three 72 + 72', 'dentista', 13900, 600, 1390, 4818, 0],
      ['Clear Correct Unlimited', 'dentista', 15900, 600, 1590, 5694, 0],
      ['Aparelho autoligável metálico', 'dentista', 12800, 1710, 1280, 400, 200],
      ['Aparelho convencional', 'dentista', 10800, 1710, 1080, 300, 200],
      ['Aparelho de Safira', 'dentista', 12800, 1710, 1280, 500, 200],
      ['Aparelho Autoligável Estético', 'dentista', 12800, 1710, 1280, 1500, 200],
      ['Aparelho móvel', 'dentista', 2500, 60, 250, 0, 80],
      ['Aparelho Funcional', 'dentista', 2500, 60, 250, 0, 80],
      ['Manutenção do Aparelho Móvel', 'dentista', 280, 60, 28, 0, 0],
      ['Contenção de Acetato', 'dentista', 450, 60, 45, 0, 30],
      ['Contenção lingual inferior', 'dentista', 450, 60, 45, 0, 30],
      ['Placa de Bruxismo', 'dentista', 1380, 120, 138, 0, 80],
      ['Profilaxia com aplicação de Flúor', 'dentista', 380, 30, 38, 0, 50],
      ['Aumento de coroa Clínica', 'dentista', 350, 30, 35, 0, 70],
      ['Raspagem à retalho', 'dentista', 432, 60, 43, 0, 70],
      ['Enxerto gengival Livre', 'dentista', 882, 60, 88, 0, 150],
      ['Frenectomia', 'dentista', 1200, 60, 120, 0, 100],
      ['Gengivoplastia por arcada', 'dentista', 1280, 60, 128, 0, 130],
      ['Tto. Periodontite leve', 'dentista', 900, 120, 90, 0, 18],
      ['Tto. Periodontite moderada', 'dentista', 1500, 120, 150, 0, 220],
      ['Tto. Periodontite curada', 'dentista', 2500, 120, 250, 0, 220],
      ['Raspagem com curetas', 'dentista', 342, 30, 34, 0, 60],
      ['Raspagem com Ultrassom por arcada', 'dentista', 342, 30, 34, 0, 50],
      ['Raspagem região de Furca', 'dentista', 450, 40, 45, 0, 70],
      ['Regeneração óssea Guiada', 'dentista', 2070, 60, 207, 0, 250],
      ['Ulectomia', 'dentista', 432, 40, 43, 0, 70],
      ['Radiografia Periapical Digital', 'dentista', 30, 10, 3, 0, 6.25],
      ['Radiografia Panorâmica', 'dentista', 70, 10, 7, 0, 7],
      ['Radiografia Cefalométrica e P.A.', 'dentista', 70, 15, 7, 0, 7],
      ['Radiografia de Punho e Mão', 'dentista', 100, 15, 10, 0, 7],
      ['Radiografia Periapical Completa', 'dentista', 250, 30, 25, 0, 20],
      ['Escaneamento + Fotos', 'dentista', 280, 60, 28, 0, 25],
      ['Documentação Ortodôntica (esc. + fotos)', 'dentista', 380, 40, 38, 0, 32],
      ['Laserterapia Pacote com 10 sessões', 'dentista', 1200, 150, 120, 0, 96],
      ['Laserterapia Por Sessão', 'dentista', 120, 15, 12, 0, 6.25],
      ['Toxina botulínica', 'estetica', 1580, 30, 158, 700, 0],
      ['Toxina Botulínica Bruxismo', 'estetica', 2800, 30, 280, 750, 0],
      ['Toxina Botulínica Sorriso gengival', 'estetica', 600, 15, 60, 200, 0],
      ['Ácido Hialurônico por seringa', 'estetica', 1380, 60, 138, 450, 0],
      ['Bio estimulador Diamond', 'estetica', 1580, 60, 158, 900, 0],
      ['Sculptra / Radiesse / Ellansé', 'estetica', 2800, 60, 280, 900, 0],
      ['Fios de PDO tensão facial', 'estetica', 600, 20, 60, 250, 0],
      ['Fios de PDO liso', 'estetica', 180, 15, 18, 98, 0],
      ['Fio Fill block', 'estetica', 1200, 20, 120, 600, 0],
      ['Microagulhamento com mesclas', 'estetica', 1200, 60, 120, 325, 0],
      ['Microagulhamento com NCTF', 'estetica', 1300, 60, 130, 350, 0],
      ['Intradarmoterapia', 'estetica', 1200, 60, 120, 288, 0],
      ['Peeling', 'estetica', 450, 30, 45, 90, 0],
      ['Bichectomia', 'estetica', 4000, 60, 400, 105, 0],
      ['Ácido Deoxicólico', 'estetica', 600, 30, 60, 150, 0],
      ['Skin Booster', 'estetica', 1200, 30, 120, 430, 0],
      ['Clareamento Caseiro', 'dentista', 980, 60, 98, 0, 80],
      ['Clareamento à laser consultório', 'dentista', 1380, 120, 138, 0, 200],
      ['Clareamento Combinado', 'dentista', 1500, 90, 150, 0, 180],
      ['Coroa Metal Cerâmica', 'dentista', 1680, 60, 168, 0, 200],
      ['Coroa de Emax', 'dentista', 1880, 120, 188, 0, 260],
      ['Coroa de Solidex', 'dentista', 880, 60, 88, 0, 120],
      ['Inlay / Onlay Porcelana', 'dentista', 1880, 60, 188, 0, 130],
      ['Inlay / Onlay Resina', 'dentista', 980, 60, 98, 0, 130],
      ['Pino com Núcleo em resina Foto', 'dentista', 620, 60, 62, 0, 90],
      ['Pino de Fibra de Vidro', 'dentista', 620, 60, 62, 0, 90],
      ['Pino Metálico', 'dentista', 680, 90, 68, 0, 50],
      ['Coroa provisória de Laboratório', 'dentista', 620, 60, 62, 0, 50],
      ['Coroa Provisória na Clínica', 'dentista', 280, 60, 28, 0, 50],
      ['Provisório Removível até 3 elementos', 'dentista', 800, 60, 80, 0, 40],
      ['Provisório Total Removível', 'dentista', 880, 90, 88, 0, 40],
      ['Prótese Parcial Removível Roach', 'dentista', 1980, 120, 198, 0, 200],
      ['Prótese Total Superior / inferior', 'dentista', 1980, 150, 198, 0, 200],
      ['Lentes de Contato de Porcelana', 'dentista', 2200, 60, 220, 0, 180],
      ['Facetas de Porcelana', 'dentista', 1980, 60, 198, 0, 180],
      ['Prótese Fixa metal cerâmica por elemento', 'dentista', 1880, 240, 188, 0, 200],
      ['Rinomodelação', 'estetica', 6800, 540, 680, 400, 0],
      ['Blefaroplastia', 'estetica', 4000, 180, 400, 400, 0],
      ['Liplift', 'estetica', 6800, 480, 680, 400, 0],
      ['Lipoaspiração de papada', 'estetica', 9000, 270, 900, 400, 0],
    ]

    const colProc = app.findCollectionByNameOrId('procedures')
    let criados = 0
    let atualizados = 0
    DATA.forEach(([name, category, price, minutes, lab, material, otherDirect]) => {
      let found = []
      try {
        found = app.findRecordsByFilter('procedures', `name = "${name}"`, '', 1, 0)
      } catch (_) {
        found = []
      }
      if (found.length === 0) {
        const rec = new Record(colProc)
        rec.set('name', name)
        rec.set('category', category)
        rec.set('price', price)
        rec.set('manual_price', price)
        rec.set('use_manual_price', true)
        rec.set('duration_minutes', minutes)
        // Tabela ativa na busca "Adicionar procedimento" (DenteDialog / AddProcedureFlow)
        rec.set('active', true)
        rec.set('lab_price', lab)
        rec.set('material_cost', material)
        rec.set('other_direct_cost', otherDirect)
        rec.set('card_fee_percent', 10)
        rec.set('sales_commission_percent', 3)
        rec.set('default_percent', 4)
        rec.set('tax_percent', 12)
        rec.set('min_margin_percent', 20)
        rec.set('target_margin_percent', 30)
        app.save(rec)
        criados++
      } else {
        const rec = found[0]
        let mudou = false
        const fill = (field, value) => {
          const cur = Number(rec.get(field)) || 0
          if (!cur && value) {
            rec.set(field, value)
            mudou = true
          }
        }
        fill('duration_minutes', minutes)
        fill('lab_price', lab)
        fill('material_cost', material)
        fill('other_direct_cost', otherDirect)
        fill('price', price)
        if (!rec.get('card_fee_percent')) {
          rec.set('card_fee_percent', 10)
          mudou = true
        }
        if (!rec.get('tax_percent')) {
          rec.set('tax_percent', 12)
          mudou = true
        }
        if (!rec.get('sales_commission_percent')) {
          rec.set('sales_commission_percent', 3)
          mudou = true
        }
        if (!rec.get('default_percent')) {
          rec.set('default_percent', 4)
          mudou = true
        }
        if (mudou) {
          app.save(rec)
          atualizados++
        }
      }
    })
    console.log(
      `[precificacao] procedures: ${criados} criados, ${atualizados} atualizados (de ${DATA.length})`,
    )

    /* ---------- 3. planilha de Custos e Despesas Fixas ---------- */
    // [descrição, grupo, valor]
    const CUSTOS = [
      ['Pró-labore', 'pessoal', 5000],
      ['Salários Funcionários / Condução / Alimentação / Cesta Básica', 'pessoal', 11000],
      ['Exames Admissional / demissional', 'pessoal', 25],
      ['Provisionamento férias e 13º', 'provisao', 1430],
      ['Rescisões', 'pessoal', 700],
      ['GPS', 'pessoal', 700],
      ['FGTS', 'pessoal', 700],
      ['Contabilidade', 'operacional', 600],
      ['Taxas: Licença / Lixo séptico / Publicidade', 'operacional', 100],
      ['CRO', 'operacional', 60],
      ['Unirme', 'operacional', 300],
      ['Aluguel / IPTU / Condomínio', 'operacional', 10000],
      ['Energia / Água', 'operacional', 900],
      ['Telefonia / Internet', 'operacional', 580],
      ['Encargos bancários', 'operacional', 115],
      ['Material Higiene / Limpeza', 'operacional', 200],
      ['Manutenções: computadores / Equipamentos Odontológicos / Geral', 'operacional', 200],
      ['Software', 'operacional', 300],
      ['Brindes / kit Higiene', 'operacional', 400],
      ['Café e açúcar (comes e bebes)', 'operacional', 400],
      ['Gráfica', 'operacional', 590],
      ['Site (domínio / hospedagem)', 'operacional', 65],
      ['Marketing (empresa + patrocínio)', 'operacional', 14000],
      ['Material escritório', 'operacional', 100],
      ['Correios', 'operacional', 70],
      ['Fundo de reserva', 'reserva', 1600],
      ['Fundo de melhorias', 'reserva', 700],
      ['Dental — Depreciação dos bens mat. Instr.', 'operacional', 3000],
    ]
    const colCustos = app.findCollectionByNameOrId('clinic_cost_items')
    const periodo = new Date().toISOString().slice(0, 7)
    let custosCriados = 0
    CUSTOS.forEach(([descricao, grupo, valor]) => {
      let found = []
      try {
        found = app.findRecordsByFilter(
          'clinic_cost_items',
          `description = "${descricao}"`,
          '',
          1,
          0,
        )
      } catch (_) {
        found = []
      }
      if (found.length === 0) {
        const rec = new Record(colCustos)
        rec.set('description', descricao)
        rec.set('group', grupo)
        rec.set('amount', valor)
        rec.set('active', true)
        rec.set('period_month', periodo)
        app.save(rec)
        custosCriados++
      }
    })
    console.log(`[precificacao] clinic_cost_items: ${custosCriados} criados (de ${CUSTOS.length})`)

    /* ---------- 4. clinical_hour_config (se não houver) ---------- */
    let cfgs = []
    try {
      cfgs = app.findRecordsByFilter('clinical_hour_config', 'id != ""', '-period', 1, 0)
    } catch (_) {
      cfgs = []
    }
    if (cfgs.length === 0) {
      const colCfg = app.findCollectionByNameOrId('clinical_hour_config')
      const rec = new Record(colCfg)
      rec.set('monthly_operating_cost', 53835)
      rec.set('available_hours', 480)
      rec.set('idle_percent', 20)
      rec.set('evaluation_extra_percent', 15)
      rec.set('available_clinical_hours', 480)
      rec.set('clinical_hour_value', 161.22)
      rec.set('period', periodo)
      app.save(rec)
      console.log('[precificacao] clinical_hour_config criado (480h, 20% ociosidade, fator 15%)')
    }
  },
  (app) => {
    /* down: nada destrutivo — dados importados permanecem */
  },
)
