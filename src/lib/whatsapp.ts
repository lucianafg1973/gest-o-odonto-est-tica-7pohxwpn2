import { PlanDocSnapshot, DocOptions, buildPlanDocLines } from '@/lib/plan-doc'

/**
 * Compartilhamento do documento do planejamento pelo WhatsApp.
 * REGRA DO PRODUTO: o sistema NUNCA afirma que o documento foi enviado —
 * ele apenas PREPARA o arquivo (download/Web Share) e abre o WhatsApp com a
 * mensagem. Sem links públicos permanentes.
 */

/** Abre o WhatsApp (wa.me) com a mensagem pronta para o número informado. */
export function openWhatsApp(phone: string, message: string) {
  const digits = (phone || '').replace(/\D/g, '')
  const intl = digits.startsWith('55') ? digits : `55${digits}`
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener')
}

/** Mensagem padrão que acompanha o arquivo (deixa claro que foi PREPARADO). */
export function whatsappMessage(s: PlanDocSnapshot, o: DocOptions, clinicName: string) {
  const titulo = o.signature ? 'documento para assinatura' : 'proposta de tratamento'
  return [
    `Olá, ${s.pacienteNome?.split(' ')[0] || ''}! Segue em anexo o ${titulo} do seu planejamento.`,
    '',
    `Nº ${s.planId.slice(-6).toUpperCase()} — ${clinicName}`,
    'O arquivo está pronto e foi preparado para você receber por aqui.',
  ].join('\n')
}

/**
 * Gera o arquivo do documento e o compartilha:
 * 1) Web Share API com o arquivo quando o navegador suporta (celular);
 * 2) senão: baixa o arquivo + abre o wa.me com a mensagem.
 * Em nenhum caso o sistema registra "enviado" — apenas que o arquivo foi preparado.
 */
export async function sharePlanDocWhatsApp(s: PlanDocSnapshot, o: DocOptions) {
  const { getClinicConfig } = await import('@/lib/plan-doc')
  const clinic = getClinicConfig()
  const msg = whatsappMessage(s, o, clinic.name)

  const blob = new Blob([`${buildPlanDocLines(s, o).join('\n')}\n`], {
    type: 'text/plain;charset=utf-8',
  })
  const file = new File([blob], `planejamento_${s.planId.slice(-6).toUpperCase()}.txt`, {
    type: 'text/plain',
  })

  const navAny = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>
  }

  if (navAny.canShare?.({ files: [file] }) && navAny.share) {
    try {
      await navAny.share({ files: [file], text: msg, title: 'Planejamento de tratamento' })
      return 'compartilhado'
    } catch {
      /* usuário cancelou — segue para o fallback */
    }
  }

  // Fallback: baixa o arquivo e abre o WhatsApp com a mensagem (arquivo PREPARADO).
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  openWhatsApp('', msg)
  return 'preparado'
}
