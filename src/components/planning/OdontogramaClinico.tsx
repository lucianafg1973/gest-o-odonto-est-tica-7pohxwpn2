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
import { shapeDeFDI, faceRects, tipoDeFDI } from '@/lib/tooth-shapes'

/**
 * Odontograma anatômico interativo — cada dente é um SVG vetorial desenhado
 * individualmente (coroa dividida em 5 faces clicáveis + raízes anatômicas),
 * com contorno marrom (paleta do app) e cores vivas para as condições.
 * Dentes permanentes e decíduos têm formas distintas; a ordem numérica FDI
 * segue as arcadas 18–11/21–28, 48–41/31–38, 55–51/61–65 e 85–81/71–75.
 */

const W = 40
const H = 60

/** Contorno padrão (marrom da paleta) e preenchimento do esmalte. */
const STROKE_MARROM = '#6B4F42'
const FILL_DENTE = '#FAF6F0'
const FILL_AUSENTE = '#EDE3D8'

export type ModoSelecao = 'dente' | 'face' | 'condicao'

export interface ToothVisual {
  /** Condições clínicas marcadas no dente inteiro. */
  condicoes: CondicaoClinica[]
  /** Condições marcadas em faces específicas: { "16": {O:'carie'} }. */
  faces: Partial<Record<string, CondicaoClinica>>
  /** Condição de LESÃO marcada no dente (contador substitui o antigo "tratamento planejado"). */
  lesoes: number
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
}

/* ------------------------ desenho vetorial do dente ------------------------ */

/** Uma face da coroa: retângulo da região correspondente, clicável. */
function FaceRect({
  dente,
  face,
  rect,
  cor,
  onClick,
  locked,
}: {
  dente: number
  face: string
  rect: { x: number; y: number; w: number; h: number }
  cor?: string
  onClick?: () => void
  locked?: boolean
}) {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={Math.max(0, rect.w)}
      height={Math.max(0, rect.h)}
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
  const shape = useMemo(() => shapeDeFDI(n, isUpper), [n, isUpper])
  const rects = useMemo(() => faceRects(shape.caixa), [shape])

  const coroaFill = vis.ausente
    ? FILL_AUSENTE
    : vis.implante
      ? '#DCF2E4'
      : info
        ? `${info.cor}44`
        : FILL_DENTE
  const coroaStroke = vis.ausente ? '#B7A99A' : info ? info.cor : STROKE_MARROM

  const facesCond = vis.faces || {}
  const tipo = tipoDeFDI(n)

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
      <g transform={isUpper ? undefined : 'rotate(180 20 30)'}>
        {/* Raízes (atrás da coroa) */}
        {shape.raizes.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={vis.ausente ? FILL_AUSENTE : FILL_DENTE}
            stroke={vis.condicoes.includes('canal') ? '#E67E22' : STROKE_MARROM}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        ))}
        {/* Coroa */}
        <path
          d={shape.coroa}
          fill={coroaFill}
          stroke={coroaStroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Faces clicáveis sobre a coroa */}
        {modo === 'face' &&
          (tipo === 'incisivo' || tipo === 'canino'
            ? ['V', 'L', 'M', 'D', 'C']
            : ['O', 'V', 'L', 'M', 'D', 'C']
          ).map((f) => (
            <FaceRect
              key={f}
              dente={n}
              face={f}
              rect={rects[f]}
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
            x="20"
            y="47"
            textAnchor="middle"
            fontSize="13"
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
            x="20"
            y="48"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#94A3B8"
            pointerEvents="none"
          >
            X
          </text>
        )}
        {/* Contador de LESÕES (substitui o antigo "tratamento planejado") */}
        {vis.lesoes > 0 && (
          <>
            <circle cx="34" cy="10" r="6" fill="#C0392B" />
            <text
              x="34"
              y="13"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="white"
              pointerEvents="none"
            >
              {vis.lesoes}
            </text>
          </>
        )}
      </g>
    </svg>
  )
}

/** Ícone de implante (parafuso) desenhado sobre a raiz. */
function ImplantIcon() {
  return (
    <g stroke="#2E8B57" strokeWidth="1.4" fill="none">
      <line x1="20" y1="24" x2="20" y2="8" />
      <line x1="15" y1="12" x2="25" y2="12" />
      <line x1="15" y1="16" x2="25" y2="16" />
      <line x1="16" y1="20" x2="24" y2="20" />
    </g>
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
}) {
  return (
    <div className="flex items-end" style={{ gap: 2 }}>
      {teeth.map((n) => {
        const vis = visual[String(n)] || { condicoes: [], faces: {}, lesoes: 0 }
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
}: Props) {
  const perm = denticao === 'permanente'
  const scale = perm ? 1 : 0.9

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
          />
        ))}
      </div>
      {/* Linha média pontilhada entre as arcadas */}
      <div className="border-t border-dashed border-[#B7A99A] my-1" />
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
          { cor: '#C0392B', label: 'Lesão (contador)' },
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
