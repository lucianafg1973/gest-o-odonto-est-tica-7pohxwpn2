/**
 * Formas anatômicas vetoriais dos dentes (coroa + raízes) para o odontograma
 * clínico. Cada tipo (incisivo, canino, pré-molar, molar) tem desenho próprio,
 * com variantes distintas para dentes permanentes e decíduos — coroa na parte
 * inferior e raízes para cima (orientação canônica da arcada superior; a
 * inferior é rotacionada 180° pelo componente).
 *
 * ViewBox canônico: 40 × 60.
 */

import { isDeciduous } from '@/lib/tooth-data'

export type ToothTipo = 'incisivo' | 'canino' | 'pre-molar' | 'molar'

export interface CrownBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface ToothShape {
  /** Path da coroa. */
  coroa: string
  /** Paths das raízes (esquerda, [meio], direita — o do meio só na arcada superior). */
  raizes: string[]
  /** Path da raiz central (só molares superiores). */
  raizMeio?: string
  /** Caixa delimitadora da coroa — base das regiões clicáveis (faces). */
  caixa: CrownBox
}

/* ------------------------- dentes permanentes ------------------------- */

const PERMANENTE: Record<ToothTipo, ToothShape> = {
  incisivo: {
    // Coroa trapezoidal, borda incisal larga; raiz cônica única.
    coroa: 'M 14 30 Q 20 28 26 30 L 29 46 Q 30 54 20 56 Q 10 54 11 46 Z',
    raizes: ['M 15 30 Q 15 14 18.5 4 Q 20 1 21.5 4 Q 25 14 25 30 Z'],
    caixa: { x0: 11, x1: 29, y0: 30, y1: 56 },
  },
  canino: {
    // Coroa pontiaguda (cúspide única); raiz longa, a mais extensa.
    coroa: 'M 13 30 Q 20 27 27 30 Q 29 42 23 52 Q 20 56 17 52 Q 11 42 13 30 Z',
    raizes: ['M 14 30 Q 14 12 19 2 Q 20 0 21 2 Q 26 12 26 30 Z'],
    caixa: { x0: 12, x1: 28, y0: 29, y1: 56 },
  },
  'pre-molar': {
    // Coroa com duas cúspides; uma ou duas raízes esguias.
    coroa: 'M 12 30 L 28 30 L 30 44 Q 30 48 26 49 Q 24 55 20 52 Q 16 55 14 49 Q 10 48 10 44 Z',
    raizes: [
      'M 14 30 Q 13 16 16 8 Q 18 5 19 9 L 20 30 Z',
      'M 20 30 L 21 9 Q 22 5 24 8 Q 27 16 26 30 Z',
    ],
    caixa: { x0: 10, x1: 30, y0: 30, y1: 55 },
  },
  molar: {
    // Coroa larga com 4–5 cúspides; raízes divergentes (3 na maxila, 2 na mandíbula).
    coroa:
      'M 9 30 L 31 30 L 33 44 Q 33 48 29 49 Q 27 54 23 52 Q 20 55 17 52 Q 13 54 11 49 Q 7 48 7 44 Z',
    raizes: [
      'M 12 30 Q 9 18 7 9 Q 6.5 5 10 7 Q 15 18 17 30 Z',
      'M 28 30 Q 31 18 33 9 Q 33.5 5 30 7 Q 25 18 23 30 Z',
    ],
    raizMeio: 'M 18 30 Q 18 20 20 15 Q 22 20 22 30 Z',
    caixa: { x0: 7, x1: 33, y0: 30, y1: 55 },
  },
}

/* --------------------------- dentes decíduos --------------------------- */

const DECIDUO: Record<ToothTipo, ToothShape> = {
  incisivo: {
    // Coroa pequena e arredondada; raiz fina e longa.
    coroa: 'M 15 34 Q 20 32 25 34 L 28 47 Q 28 53 20 54 Q 12 53 12 47 Z',
    raizes: ['M 16 34 Q 16 20 19 10 Q 20 7 21 10 Q 24 20 24 34 Z'],
    caixa: { x0: 12, x1: 28, y0: 33, y1: 54 },
  },
  canino: {
    // Coroa cônica arredondada; raiz longa e fina.
    coroa: 'M 14 34 Q 20 31 26 34 Q 28 44 23 51 Q 20 54 17 51 Q 12 44 14 34 Z',
    raizes: ['M 15 34 Q 15 18 19 8 Q 20 5 21 8 Q 25 18 25 34 Z'],
    caixa: { x0: 13, x1: 27, y0: 32, y1: 54 },
  },
  // Pré-molares não existem na dentição decídua — reuso do desenho molar.
  'pre-molar': {
    coroa:
      'M 10 34 L 30 34 L 32 46 Q 32 50 28 51 Q 26 54 23 52 Q 20 54 17 52 Q 14 54 12 51 Q 8 50 8 46 Z',
    raizes: [
      'M 13 34 Q 10 24 7 13 Q 6.5 9 10 11 Q 14 21 17 34 Z',
      'M 27 34 Q 30 24 33 13 Q 33.5 9 30 11 Q 26 21 23 34 Z',
    ],
    caixa: { x0: 8, x1: 32, y0: 33, y1: 54 },
  },
  molar: {
    // Coroa quadrada e bulbosa; raízes finas muito divergentes (marca da dentição decídua).
    coroa:
      'M 10 34 L 30 34 L 32 46 Q 32 50 28 51 Q 26 54 23 52 Q 20 54 17 52 Q 14 54 12 51 Q 8 50 8 46 Z',
    raizes: [
      'M 13 34 Q 8 24 5 12 Q 4.5 8 8 10 Q 13 20 16 34 Z',
      'M 27 34 Q 32 24 35 12 Q 35.5 8 32 10 Q 27 20 24 34 Z',
    ],
    raizMeio: 'M 18 34 Q 18 26 20 22 Q 22 26 22 34 Z',
    caixa: { x0: 8, x1: 32, y0: 33, y1: 54 },
  },
}

/** Tipo anatômico de um dente FDI (pré-molar só existe na dentição permanente). */
export function tipoDeFDI(n: number): ToothTipo {
  const pos = n % 10
  if (pos <= 2) return 'incisivo'
  if (pos === 3) return 'canino'
  if (!isDeciduous(n) && pos <= 5) return 'pre-molar'
  return 'molar'
}

/** Forma vetorial do dente FDI. `isUpper` define molares com 3 raízes (maxila). */
export function shapeDeFDI(n: number, isUpper: boolean): ToothShape {
  const tipo = tipoDeFDI(n)
  const base = (isDeciduous(n) ? DECIDUO : PERMANENTE)[tipo]
  if (base.raizMeio && isUpper) {
    return { ...base, raizes: [base.raizes[0], base.raizMeio, base.raizes[1]] }
  }
  return base
}

/**
 * Retângulos das faces clicáveis da coroa (O, V, L, M, D, C), derivados da
 * caixa da coroa: C = faixa cervical no topo; M/D = blocos à esquerda/direita
 * acima do meio; V/L = blocos à esquerda/direita abaixo; O = coluna central
 * inferior (oclusal/incisal).
 */
export function faceRects(
  box: CrownBox,
): Record<string, { x: number; y: number; w: number; h: number }> {
  const { x0, x1, y0, y1 } = box
  const xm = (x0 + x1) / 2
  const ym = (y0 + y1) / 2
  const hC = (y1 - y0) * 0.25
  const pad = 3
  return {
    C: { x: x0, y: y0, w: x1 - x0, h: hC },
    M: { x: x0, y: y0 + hC, w: xm - pad - x0, h: ym - y0 - hC },
    D: { x: xm + pad, y: y0 + hC, w: x1 - xm - pad, h: ym - y0 - hC },
    V: { x: x0, y: ym, w: xm - pad - x0, h: y1 - ym },
    L: { x: xm + pad, y: ym, w: x1 - xm - pad, h: y1 - ym },
    O: { x: xm - pad, y: ym, w: pad * 2, h: y1 - ym },
  }
}
