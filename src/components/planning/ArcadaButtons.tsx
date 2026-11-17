import type { EscopoArcada } from '@/lib/plan-types'

/**
 * Barra dos 3 botões de arcada/hemiarcada (usada ACIMA e ABAIXO do odontograma
 * clínico). ORIENTAÇÃO ANATÔMICA: no odontograma FDI o quadrante DIREITO do
 * paciente aparece à ESQUERDA da tela (dentes 18–14 / 48–44) e o quadrante
 * ESQUERDO do paciente à DIREITA da tela (28–24 / 38–34) — os botões seguem o
 * lado do PACIENTE, como a clínica fala:
 *
 *   esquerda da tela                centro                 direita da tela
 *   Hemiarcada X direita   |   Arcada X completa   |   Hemiarcada X esquerda
 *
 * (X = superior na barra de cima, inferior na barra de baixo.) O clique abre o
 * MESMO diálogo do dente (DenteDialog) em modo escopo — o procedimento sai
 * vinculado à arcada/hemiarcada, sem dente único.
 */

interface Props {
  /** Qual arcada esta barra representa (superior = barra acima do odontograma). */
  posicao: 'superior' | 'inferior'
  disabled?: boolean
  /** Escolha de um dos 3 escopos — abre o diálogo de seleção de procedimentos. */
  onEscolher: (escopo: EscopoArcada) => void
}

export function ArcadaButtons({ posicao, disabled = false, onEscolher }: Props) {
  const hemiDireita: EscopoArcada =
    posicao === 'superior' ? 'hemiarcada-superior-direita' : 'hemiarcada-inferior-direita'
  const hemiEsquerda: EscopoArcada =
    posicao === 'superior' ? 'hemiarcada-superior-esquerda' : 'hemiarcada-inferior-esquerda'

  const celulas: { escopo: EscopoArcada; rotulo: string; hint: string }[] = [
    {
      escopo: hemiDireita,
      rotulo: `Hemiarcada ${posicao} direita`,
      hint: 'Quadrante direito do PACIENTE (FDI 1 ou 4) — aparece à esquerda da tela',
    },
    {
      escopo: posicao === 'superior' ? 'arcada-superior' : 'arcada-inferior',
      rotulo: `Arcada ${posicao} completa`,
      hint: `Toda a arcada ${posicao} (quadrantes FDI 1+2 ou 4+3)`,
    },
    {
      escopo: hemiEsquerda,
      rotulo: `Hemiarcada ${posicao} esquerda`,
      hint: 'Quadrante esquerdo do PACIENTE (FDI 2 ou 3) — aparece à direita da tela',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-1.5" role="group">
      {celulas.map((c) => (
        <button
          key={c.escopo}
          type="button"
          disabled={disabled}
          title={c.hint}
          className="px-1.5 py-1.5 rounded-xl border border-[#EDE3D8] bg-white text-[#6B4F42] text-[10px] sm:text-[11px] font-semibold leading-tight text-center hover:bg-[#FAF6F0] hover:border-[#C66B4D] hover:text-[#C66B4D] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          onClick={() => onEscolher(c.escopo)}
        >
          {c.rotulo}
        </button>
      ))}
    </div>
  )
}
