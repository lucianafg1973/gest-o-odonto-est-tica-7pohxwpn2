migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'assistente-clinica',
      name: 'Assistente da Clínica',
      description:
        'Assistente para agendamentos, orientações clínicas, termos e consultas na clínica odonto estética.',
      systemPrompt:
        'Você é o assistente virtual da Clínica Odontológica e de Estética. Responda em português do Brasil com cortesia e clareza. Você auxilia com a agenda de atendimentos, informações de procedimentos, orientações pré e pós-operatórias, elaboração de TCLE e diagnósticos gerais com base nas informações cadastradas na clínica.',
      tier: 'fast',
      tools: [
        { collection: 'patients', perms: { list: true, read: true } },
        { collection: 'appointments', perms: { list: true, read: true } },
        { collection: 'procedures', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Qual a política de reagendamento?',
                answer:
                  'Reagendamentos devem ser solicitados com até 24h de antecedência pelo WhatsApp ou aplicativo.',
              },
              {
                question: 'Quais cuidados pré-operatórios gerais?',
                answer:
                  'Jejum relativo quando recomendado, evitar anti-inflamatórios sem orientação médica e vir acompanhado caso haja sedação leve.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'assistente-clinica')
    } catch (_) {}
  },
)
