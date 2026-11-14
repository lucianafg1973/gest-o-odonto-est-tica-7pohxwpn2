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
} from '@/lib/tooth-data'
import { shapeDeFDI, faceRects, tipoDeFDI } from '@/lib/tooth-shapes'

/**
 * Odontograma anatômico interativo — cada arcada é UM único SVG responsivo
 * (width 100% + viewBox), garantindo que TODOS os dentes (32 permanentes ou
 * 20 decíduos) fiquem sempre visíveis e clicáveis, sem corte nas laterais.
 * Cada dente é desenhado vetorialmente (coroa dividida em faces clicáveis +
 * raízes anatômicas), com contorno marrom (paleta do app) e cores vivas para
 * as condições. A ordem numérica FDI segue as arcadas 18–11/21–28,
 * 48–41/31–38, 55–51/61–65 e 85–81/71–75.
 */

const W = 40
const H = 60
/** Passo horizontal por dente (dente 40 + espaçamento 4). */
const CELL = 44
/** Espaço extra entre os quadrantes direito e esquerdo. */
const QUAD_GAP = 10
/** Faixa reservada ao número FDI (abaixo da arcada superior / acima da inferior). */
const LABEL_H = 13

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

/** Conteúdo vetorial de um dente (orientação canônica: coroa embaixo, raízes em cima). */
function ToothContent({
  n,
  vis,
  isUpper,
  facesSel,
  modo,
  locked,
  onFaceClick,
}: {
  n: number
  vis: ToothVisual
  isUpper: boolean
  facesSel: string[]
  modo: ModoSelecao
  locked?: boolean
  onFaceClick: Props['onFaceClick']
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
    <>
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
    </>
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

/**
 * Uma arcada inteira em um único SVG responsivo: todos os dentes do quadrante
 * direito + esquerdo cabem sempre no viewBox, escalando com a largura do
 * container — nada fica cortado fora da área visível.
 */
function ArcadaSvg({
  quads,
  isUpper,
  visual,
  selecionados,
  facesSelecionadas,
  modo,
  locked,
  onToothClick,
  onFaceClick,
}: {
  quads: number[][]
  isUpper: boolean
  visual: Record<string, ToothVisual>
  selecionados: number[]
  facesSelecionadas: string[]
  modo: ModoSelecao
  locked?: boolean
  onToothClick: Props['onToothClick']
  onFaceClick: Props['onFaceClick']
}) {
  const { pos, width } = useMemo(() => {
    const pos: { n: number; x: number }[] = []
    let x = 0
    quads.forEach((q, qi) => {
      if (qi > 0) x += QUAD_GAP
      q.forEach((n) => {
        pos.push({ n, x })
        x += CELL
      })
    })
    // O último dente ocupa 40 (W) das 44 unidades do passo — corta o resto vazio.
    return { pos, width: x - (CELL - W) }
  }, [quads])

  const height = H + LABEL_H

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block max-w-full select-none"
      role="group"
      aria-label={isUpper ? 'Arcada superior' : 'Arcada inferior'}
    >
      {pos.map(({ n, x }) => {
        const vis = visual[String(n)] || { condicoes: [], faces: {}, lesoes: 0 }
        const sel = selecionados.includes(n)
        const facesSel = facesSelecionadas
          .filter((k) => k.startsWith(`${n}:`))
          .map((k) => k.split(':')[1])
        return (
          <g key={n}>
            <g
              role="img"
              aria-label={`Dente ${n}`}
              className={cn(
                'cursor-pointer',
                locked ? '' : 'hover:opacity-90',
                sel && 'drop-shadow-[0_0_3px_rgba(198,107,77,0.9)]',
              )}
              transform={
                isUpper ? `translate(${x} 0)` : `translate(${x} ${LABEL_H}) rotate(180 20 30)`
              }
              onClick={(e) => onToothClick(n, e.shiftKey || e.ctrlKey || e.metaKey)}
            >
              <title>{`Dente ${n}`}</title>
              <ToothContent
                n={n}
                vis={vis}
                isUpper={isUpper}
                facesSel={facesSel}
                modo={modo}
                locked={locked}
                onFaceClick={onFaceClick}
              />
            </g>
            {/* Número FDI — fora do grupo rotacionado (sempre na orientação correta) */}
            <text
              x={x + W / 2}
              y={isUpper ? height - 3 : 10}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#6B4F42"
              pointerEvents="none"
            >
              {n}
            </text>
          </g>
        )
      })}
    </svg>
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

  // Ordem FDI vista pelo profissional (paciente em frente):
  // superior: 18→11 | 21→28 · inferior: 48→41 | 31→38.
  const linhas = useMemo(() => {
    if (perm) {
      return {
        sup: [PERMANENT_UPPER_RIGHT, PERMANENT_UPPER_LEFT],
        inf: [PERMANENT_LOWER_RIGHT, PERMANENT_LOWER_LEFT],
      }
    }
    return {
      sup: [DECIDUOUS_UPPER_RIGHT, DECIDUOUS_UPPER_LEFT],
      inf: [DECIDUOUS_LOWER_RIGHT, DECIDUOUS_LOWER_LEFT],
    }
  }, [perm])

  return (
    <div className="space-y-1 min-w-0">
      {/* Arcada superior */}
      <ArcadaSvg
        quads={linhas.sup}
        isUpper
        visual={visual}
        selecionados={selecionados}
        facesSelecionadas={facesSelecionadas}
        modo={modo}
        locked={locked}
        onToothClick={onToothClick}
        onFaceClick={onFaceClick}
      />
      {/* Linha média pontilhada entre as arcadas */}
      <div className="border-t border-dashed border-[#B7A99A] my-1" />
      {/* Arcada inferior */}
      <ArcadaSvg
        quads={linhas.inf}
        isUpper={false}
        visual={visual}
        selecionados={selecionados}
        facesSelecionadas={facesSelecionadas}
        modo={modo}
        locked={locked}
        onToothClick={onToothClick}
        onFaceClick={onFaceClick}
      />
    </div>
  )
}
