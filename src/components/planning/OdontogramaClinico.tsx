import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { CondicaoClinica } from '@/lib/plan-types'
import { condicaoInfo } from '@/lib/plan-types'
import {
  PERMANENT_UPPER_RIGHT,
  PERMANENT_UPPER_LEFT,
  PERMANENT_LOWER_LEFT,
  PERMANENT_LOWER_RIGHT,
  DECIDUOUS_UPPER_RIGHT,
  DECIDUOUS_UPPER_LEFT,
  DECIDUOUS_LOWER_RIGHT,
  DECIDUOUS_LOWER_LEFT,
  FACE_LABEL,
} from '@/lib/tooth-data'

/**
 * Odontograma anatômico interativo — cada dente é um SVG vetorial desenhado
 * individualmente (coroa dividida em 5 faces clicáveis + raízes). Suporta:
 * seleção de dente único/múltiplo, seleção de face única/múltipla, seleção
 * por quadrante/arcada, marcação de condições clínicas (cores/símbolos) e
 * destaque de dentes com tratamentos planejados.
 */

const W = 34
const H = 46

export type ModoSelecao = 'dente' | 'face' | 'condicao'

export interface ToothVisual {
  /** Condições clínicas marcadas no dente inteiro. */
  condicoes: CondicaoClinica[]
  /** Condições marcadas em faces específicas: { "16": {O:'carie'} }. */
  faces: Partial<Record<string, CondicaoClinica>>
  /** Nº de tratamentos planejados para o dente. */
  tratamentos: number
  /** Implante planejado/instalado. */
  implante?: boolean
  /** Dente ausente/edêntulo. */
  ausente?: boolean
}

interface Props {
  /** Estado visual de cada dente, indexado pelo nº FDI em string. */
  visual: Record<string, ToothVisual>
  /** Dentes selecionados (nº FDI). */
  selecionados: number[]
  /** Faces selecionadas (chave `${dente}:${face}`). */
  facesSelecionadas: string[]
  modo: ModoSelecao
  condicaoAtiva?: CondicaoClinica | null
  onToothClick: (n: number, mult: boolean) => void
  onFaceClick: (dente: number, face: string, mult: boolean) => void
  denticao: 'permanente' | 'decidua'
  locked?: boolean
  /** Rótulos curtos sob os dentes (ex.: contagem de tratamentos). */
  mostrarFaces?: boolean
}

/* ---------- desenho vetorial do dente ---------- */

/** Uma face da coroa: path da região correspondente, clicável. */
function FacePath({
  dente,
  face,
  cor,
  onClick,
  locked,
}: {
  dente: number
  face: string
  cor?: string
  onClick?: () => void
  locked?: boolean
}) {
  const paths: Record<string, string> = {
    O: 'M 5 30 L 29 30 L 26 44 Q 17 41 8 44 Z',
    V: 'M 5 30 L 8 44 Q 4 42 4 36 L 4 22 Q 4 18 6 16 L 5 30 Z',
    L: 'M 29 30 L 26 44 Q 30 42 30 36 L 30 22 Q 30 18 28 16 L 29 30 Z',
    M: 'M 4 22 Q 4 18 6 16 Q 8 17 10 15 L 10 30 L 5 30 Z',
    D: 'M 30 22 Q 30 18 28 16 Q 26 17 24 15 L 24 30 L 29 30 Z',
    C: 'M 10 15 L 10 30 L 24 30 L 24 15 Z',
  }
  return (
    <path
      d={paths[face]}
      fill={cor || 'transparent'}
      stroke="none"
      className={locked ? '' : 'cursor-pointer'}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      data-tooth={dente}
      data-face={face}
    />
  )
}

function RootPath({ ausente, canal }: { ausente?: boolean; canal?: boolean }) {
  return (
    <g>
      <path
        d="M 8 15 Q 6 12 7 8 Q 8 3 11 2 Q 13 1 14 4 L 14 15 Z"
        fill={ausente ? '#EDE3D8' : '#FAF6F0'}
        stroke={canal ? '#E67E22' : '#C9B8A8'}
        strokeWidth="1"
      />
      <path
        d="M 20 15 Q 22 12 21 8 Q 20 3 17 2 Q 15 1 14 4 L 14 15 Z"
        fill={ausente ? '#EDE3D8' : '#FAF6F0'}
        stroke={canal ? '#E67E22' : '#C9B8A8'}
        strokeWidth="1"
      />
    </g>
  )
}

/** Ícone de implante (parafuso) desenhado sobre a raiz. */
function ImplantIcon() {
  return (
    <g stroke="#2E8B57" strokeWidth="1.2" fill="none">
      <line x1="17" y1="14" x2="17" y2="4" />
      <line x1="13" y1="6" x2="21" y2="6" />
      <line x1="13" y1="9" x2="21" y2="9" />
      <line x1="14" y1="12" x2="20" y2="12" />
    </g>
  )
}

function ToothSvg({
  n,
  vis,
  isUpper,
  selecionado,
  facesSel,
  modo,
  locked,
  onToothClick,
  onFaceClick,
  scale = 1,
}: {
  n: number
  vis: ToothVisual
  isUpper: boolean
  selecionado: boolean
  facesSel: string[]
  modo: ModoSelecao
  locked?: boolean
  onToothClick: Props['onToothClick']
  onFaceClick: Props['onFaceClick']
  scale?: number
}) {
  // Condição dominante para a cor da coroa (fora das faces clicáveis).
  const cond = vis.condicoes[0]
  const info = cond ? condicaoInfo(cond) : null

  const coroaFill = vis.ausente
    ? '#EDE3D8'
    : vis.implante
      ? '#DCF2E4'
      : info
        ? `${info.cor}44`
        : '#FFFFFF'
  const coroaStroke = vis.ausente ? '#B7A99A' : info ? info.cor : '#C9B8A8'

  const facesCond = vis.faces || {}

  return (
    <svg
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Dente ${n}`}
      className={cn(
        'transition-transform',
        locked ? '' : 'cursor-pointer hover:scale-110',
        selecionado && 'drop-shadow-[0_0_3px_rgba(198,107,77,0.9)]',
      )}
      onClick={(e) => onToothClick(n, e.shiftKey || e.ctrlKey || e.metaKey)}
    >
      <title>{`Dente ${n}`}</title>
      <g transform={isUpper ? undefined : 'rotate(180 17 23)'}>
        {/* Coroa (fundo) */}
        <path
          d="M 4 15 Q 4 30 8 44 Q 17 41 26 44 Q 30 30 30 15 Q 30 8 26 15 Q 24 12 24 9 Q 24 3 20 2 Q 17 1 17 4 Q 17 1 14 2 Q 10 3 10 9 Q 10 12 8 15 Q 4 8 4 15 Z"
          fill={coroaFill}
          stroke={coroaStroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Faces clicáveis sobre a coroa */}
        {modo === 'face' &&
          ['O', 'V', 'L', 'M', 'D', 'C'].map((f) => (
            <FacePath
              key={f}
              dente={n}
              face={f}
              cor={
                facesCond[f]
                  ? `${condicaoInfo(facesCond[f]).cor}88`
                  : facesSel.includes(`${n}:${f}`)
                    ? 'rgba(198,107,77,0.55)'
                    : 'transparent'
              }
              locked={locked}
              onClick={() => onFaceClick(n, f, false)}
            />
          ))}
        {/* Símbolo da condição (desenhado, não texto — acessível via title) */}
        {info && info.simbolo.trim() && info.key !== 'implante' && (
          <text
            x="17"
            y="27"
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={info.cor}
            pointerEvents="none"
          >
            {info.simbolo.trim()}
          </text>
        )}
        {vis.implante && <ImplantIcon />}
        {vis.ausente && (
          <text
            x="17"
            y="28"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#94A3B8"
            pointerEvents="none"
          >
            X
          </text>
        )}
        {/* Contador de tratamentos planejados */}
        {vis.tratamentos > 0 && (
          <>
            <circle cx="28" cy="18" r="6" fill="#C66B4D" />
            <text
              x="28"
              y="21"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="white"
              pointerEvents="none"
            >
              {vis.tratamentos}
            </text>
          </>
        )}
        {/* Raízes (abaixo da coroa quando invertido) */}
        <RootPath ausente={vis.ausente} canal={vis.condicoes.includes('canal')} />
      </g>
    </svg>
  )
}

/** Cabeçalho de arcada com os dentes do quadrante. */
function QuadrantTeeth({
  teeth,
  isUpper,
  visual,
  selecionados,
  facesSelecionadas,
  modo,
  locked,
  onToothClick,
  onFaceClick,
  scale,
  mostrarFaces,
}: {
  teeth: number[]
  isUpper: boolean
  visual: Record<string, ToothVisual>
  selecionados: number[]
  facesSelecionadas: string[]
  modo: ModoSelecao
  locked?: boolean
  onToothClick: Props['onToothClick']
  onFaceClick: Props['onFaceClick']
  scale: number
  mostrarFaces?: boolean
}) {
  return (
    <div className="flex items-end" style={{ gap: 2 }}>
      {teeth.map((n) => {
        const vis = visual[String(n)] || { condicoes: [], faces: {}, tratamentos: 0 }
        const sel = selecionados.includes(n)
        const facesSel = facesSelecionadas
          .filter((k) => k.startsWith(`${n}:`))
          .map((k) => k.split(':')[1])
        return (
          <div key={n} className="flex flex-col items-center">
            {isUpper ? (
              <>
                <ToothSvg
                  n={n}
                  vis={vis}
                  isUpper
                  selecionado={sel}
                  facesSel={facesSel}
                  modo={modo}
                  locked={locked}
                  onToothClick={onToothClick}
                  onFaceClick={onFaceClick}
                  scale={scale}
                />
                <span className="text-[9px] font-semibold text-[#6B4F42]">{n}</span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-semibold text-[#6B4F42]">{n}</span>
                <ToothSvg
                  n={n}
                  vis={vis}
                  isUpper={false}
                  selecionado={sel}
                  facesSel={facesSel}
                  modo={modo}
                  locked={locked}
                  onToothClick={onToothClick}
                  onFaceClick={onFaceClick}
                  scale={scale}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function OdontogramaClinico({
  visual,
  selecionados,
  facesSelecionadas,
  modo,
  condicaoAtiva,
  onToothClick,
  onFaceClick,
  denticao,
  locked,
  mostrarFaces,
}: Props) {
  const perm = denticao === 'permanente'
  const scale = perm ? 1 : 0.8

  const linhas = useMemo(() => {
    if (perm) {
      return {
        sup: [PERMANENT_UPPER_RIGHT, PERMANENT_UPPER_LEFT],
        inf: [PERMANENT_LOWER_LEFT, PERMANENT_LOWER_RIGHT],
      }
    }
    return {
      sup: [DECIDUOUS_UPPER_RIGHT, DECIDUOUS_UPPER_LEFT],
      inf: [DECIDUOUS_LOWER_RIGHT, DECIDUOUS_LOWER_LEFT],
    }
  }, [perm])

  return (
    <div className="space-y-1 overflow-x-auto pb-1">
      {/* Arcada superior */}
      <div className="flex justify-center items-end gap-1">
        {linhas.sup.map((q, i) => (
          <QuadrantTeeth
            key={i}
            teeth={q}
            isUpper
            visual={visual}
            selecionados={selecionados}
            facesSelecionadas={facesSelecionadas}
            modo={modo}
            locked={locked}
            onToothClick={onToothClick}
            onFaceClick={onFaceClick}
            scale={scale}
            mostrarFaces={mostrarFaces}
          />
        ))}
      </div>
      {/* Linha média */}
      <div className="border-t border-dashed border-[#EDE3D8] my-1" />
      {/* Arcada inferior */}
      <div className="flex justify-center items-start gap-1">
        {linhas.inf.map((q, i) => (
          <QuadrantTeeth
            key={i}
            teeth={q}
            isUpper={false}
            visual={visual}
            selecionados={selecionados}
            facesSelecionadas={facesSelecionadas}
            modo={modo}
            locked={locked}
            onToothClick={onToothClick}
            onFaceClick={onFaceClick}
            scale={scale}
            mostrarFaces={mostrarFaces}
          />
        ))}
      </div>
      {/* Legenda */}
      <Legenda />
    </div>
  )
}

function Legenda() {
  return (
    <div className="pt-2 space-y-1">
      <p className="text-[10px] font-bold uppercase text-[#6B4F42]">Legenda</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {[
          { cor: '#C0392B', label: 'Cárie' },
          { cor: '#2E6FB7', label: 'Restauração' },
          { cor: '#D4AF37', label: 'Coroa/prótese fixa' },
          { cor: '#7D5BA6', label: 'Prótese removível' },
          { cor: '#2E8B57', label: 'Implante' },
          { cor: '#E67E22', label: 'Canal' },
          { cor: '#94A3B8', label: 'Ausente' },
          { cor: '#C66B4D', label: 'Tratamento planejado (contador)' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1 text-[10px] text-[#2D1B14]">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border"
              style={{ background: `${l.cor}55`, borderColor: l.cor }}
            />
            {l.label}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-[#6B4F42]">
        {Object.entries(FACE_LABEL)
          .map(([k, v]) => `${k} = ${v}`)
          .join(' · ')}
      </p>
    </div>
  )
}
