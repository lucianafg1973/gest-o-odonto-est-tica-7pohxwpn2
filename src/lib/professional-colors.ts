/**
 * Cor PASTEL por profissional na agenda: cada profissional recebe uma cor fixa
 * da paleta (hash do id → índice), consistente entre sessões e entre as visões
 * Dia/Semana/Mês. Profissional sem cor (sem cadastro / "Sem profissional")
 * recebe um pastel neutro bege (identidade da clínica).
 */
export interface PastelColor {
  /** Cor de FUNDO do bloco (pastel suave). */
  bg: string
  /** Cor do texto sobre o fundo (tom escuro da mesma família). */
  text: string
  /** Cor da BORDA do bloco. */
  border: string
  /** Cor do ponto/legenda (versão mais saturada). */
  dot: string
}

/** Paleta pastel fixa (tons suaves, legíveis com texto escuro). */
const PALETTE: PastelColor[] = [
  { bg: '#FDE8E8', text: '#9B2C2C', border: '#F5B8B8', dot: '#E06C6C' }, // rosa
  { bg: '#E6F4EA', text: '#1E6B3C', border: '#B7E0C3', dot: '#4CAF7D' }, // verde
  { bg: '#E7F0FD', text: '#1D4F91', border: '#B9D4F5', dot: '#5B8FD9' }, // azul
  { bg: '#FFF3D6', text: '#8A6A1F', border: '#EAD393', dot: '#D4AF37' }, // dourado
  { bg: '#F3E8FD', text: '#5B2D8E', border: '#D9C2F0', dot: '#9B6BD4' }, // lilás
  { bg: '#E0F4F4', text: '#0F5E5E', border: '#AFDEDE', dot: '#3FA7A7' }, // teal
  { bg: '#FFEAD9', text: '#9A4E12', border: '#F5CCA6', dot: '#E08A4A' }, // laranja
  { bg: '#FDE2EF', text: '#96265F', border: '#F2BBD7', dot: '#D9679F' }, // magenta
  { bg: '#E8F5E9', text: '#33691E', border: '#C2DFC4', dot: '#6FA860' }, // verde-musgo
  { bg: '#EDE7F6', text: '#4527A0', border: '#C9C0E8', dot: '#7E68C9' }, // violeta
  { bg: '#E0F7FA', text: '#006064', border: '#AFDDE2', dot: '#3BA8B0' }, // ciano
  { bg: '#F1F0E4', text: '#6B6B2D', border: '#D6D4AC', dot: '#A8A55B' }, // oliva
]

/** Pastel neutro (sem profissional / id vazio). */
export const NEUTRAL_PASTEL: PastelColor = {
  bg: '#FAF6F0',
  text: '#6B4F42',
  border: '#EDE3D8',
  dot: '#C9B8A6',
}

/** Hash simples e estável (djb2) de string → inteiro não negativo. */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Cor pastel fixa do profissional. O id do registro é a chave (estável entre
 * sessões); renomear o profissional não muda a cor.
 */
export function professionalPastel(professionalId?: string): PastelColor {
  if (!professionalId) return NEUTRAL_PASTEL
  return PALETTE[hashString(professionalId) % PALETTE.length]
}

/** Mesma cor da paleta em formato inline (style) para fundos dinâmicos. */
export function professionalPastelStyle(professionalId?: string): {
  backgroundColor: string
  color: string
  borderColor: string
} {
  const c = professionalPastel(professionalId)
  return { backgroundColor: c.bg, color: c.text, borderColor: c.border }
}
