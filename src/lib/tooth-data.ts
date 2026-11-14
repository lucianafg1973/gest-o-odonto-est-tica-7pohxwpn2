/**
 * Dados anatômicos FDI do odontograma: dentes permanentes (32) e decíduos
 * (20), faces de cada dente, agrupamentos para seleção por quadrante/arcada
 * e helper de detecção de regiões edêntulas.
 */

export const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
export const PERMANENT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
export const PERMANENT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]
export const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]

export const DECIDUOUS_UPPER_RIGHT = [55, 54, 53, 52, 51]
export const DECIDUOUS_UPPER_LEFT = [61, 62, 63, 64, 65]
export const DECIDUOUS_LOWER_RIGHT = [85, 84, 83, 82, 81]
export const DECIDUOUS_LOWER_LEFT = [71, 72, 73, 74, 75]

export const ALL_PERMANENT = [
  ...PERMANENT_UPPER_RIGHT,
  ...PERMANENT_UPPER_LEFT,
  ...PERMANENT_LOWER_LEFT,
  ...PERMANENT_LOWER_RIGHT,
]

export const ALL_DECIDUOUS = [
  ...DECIDUOUS_UPPER_RIGHT,
  ...DECIDUOUS_UPPER_LEFT,
  ...DECIDUOUS_LOWER_RIGHT,
  ...DECIDUOUS_LOWER_LEFT,
]

/** Faces por tipo de dente: incisivos, caninos, pré-molares e molares. */
export const FACES_INCISIVO = ['V', 'L', 'M', 'D', 'C']
export const FACES_CANINO = ['V', 'L', 'M', 'D', 'C']
export const FACES_PRE_MOLAR = ['O', 'V', 'L', 'M', 'D', 'C']
export const FACES_MOLAR = ['O', 'V', 'L', 'M', 'D', 'C']

export const FACE_LABEL: Record<string, string> = {
  O: 'Oclusal',
  V: 'Vestibular',
  L: 'Lingual/Palatina',
  M: 'Mesial',
  D: 'Distal',
  C: 'Cervical',
}

export const FACES_TODAS = ['O', 'V', 'L', 'M', 'D', 'C']

/** Faces aplicáveis a um dente FDI (por tipo). */
export function facesDeFDI(n: number): string[] {
  const pos = n % 10 // 1=incisivo central ... 8=terceiro molar
  if (pos <= 2) return FACES_INCISIVO
  if (pos === 3) return FACES_CANINO
  if (pos <= 5) return FACES_PRE_MOLAR
  return FACES_MOLAR
}

export const isDeciduous = (n: number) =>
  (n >= 51 && n <= 55) || (n >= 61 && n <= 65) || (n >= 71 && n <= 75) || (n >= 81 && n <= 85)

/** Nome do quadrante FDI (Q1..Q4 permanentes, Q5..Q8 decíduos). */
export const quadranteDe = (n: number) => Math.floor(n / 10)

export const QUADRANTE_LABEL: Record<number, string> = {
  1: 'Superior direito',
  2: 'Superior esquerdo',
  3: 'Inferior esquerdo',
  4: 'Inferior direito',
  5: 'Decíduo superior direito',
  6: 'Decíduo superior esquerdo',
  7: 'Decíduo inferior esquerdo',
  8: 'Decíduo inferior direito',
}

/** Dentes de um quadrante FDI completo (ex.: quadrante 1 → 18..11). */
export function dentesDoQuadrante(q: number): number[] {
  switch (q) {
    case 1:
      return PERMANENT_UPPER_RIGHT
    case 2:
      return PERMANENT_UPPER_LEFT
    case 3:
      return PERMANENT_LOWER_LEFT
    case 4:
      return PERMANENT_LOWER_RIGHT
    case 5:
      return DECIDUOUS_UPPER_RIGHT
    case 6:
      return DECIDUOUS_UPPER_LEFT
    case 7:
      return DECIDUOUS_LOWER_LEFT
    case 8:
      return DECIDUOUS_LOWER_RIGHT
    default:
      return []
  }
}

/** Dentes de uma arcada inteira (superior ou inferior, permanente). */
export const ARCADA_SUPERIOR = [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT]
export const ARCADA_INFERIOR = [...PERMANENT_LOWER_LEFT, ...PERMANENT_LOWER_RIGHT]

/**
 * "Regiões edêntulas": sequências de dentes consecutivos ausentes
 * (ex.: 36,37,38 → "Região 36-38").
 */
export function regioesEdentulas(ausentes: number[]): string[] {
  const sorted = [...ausentes].sort((a, b) => a - b)
  const grupos: string[] = []
  let start: number | null = null
  let prev: number | null = null
  for (const n of sorted) {
    if (start === null) {
      start = n
      prev = n
      continue
    }
    if (prev !== null && n === prev + 1) {
      prev = n
      continue
    }
    grupos.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = n
    prev = n
  }
  if (start !== null) grupos.push(start === prev ? `${start}` : `${start}-${prev}`)
  return grupos
}
