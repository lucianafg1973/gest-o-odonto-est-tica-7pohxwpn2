import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Largura mínima em caracteres (ch). */
  minCh?: number
  /** Largura máxima em caracteres (ch) — acima disso o texto rola dentro do campo. */
  maxCh?: number
}

/**
 * Input numérico que cresce conforme a quantidade de dígitos digitados
 * (largura em `ch`, entre minCh e maxCh). Os spinners nativos são ocultados
 * para não roubar espaço do número. Usado nas planilhas da aba Precificação.
 */
export const AutoWidthNumberInput = forwardRef<HTMLInputElement, Props>(
  ({ minCh = 5, maxCh = 16, className, value, placeholder, style, ...props }, ref) => {
    const texto = String(value ?? '')
    const tamanho = Math.max(texto.length, String(placeholder ?? '').length)
    // +1 ch de folga para o cursor; o padding horizontal (px-3 x2) fica em rem
    const chars = Math.min(maxCh, Math.max(minCh, tamanho + 1))
    return (
      <Input
        ref={ref}
        type="number"
        value={value}
        placeholder={placeholder}
        className={cn(
          'w-auto [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className,
        )}
        style={{ width: `calc(${chars}ch + 1.75rem)`, ...style }}
        {...props}
      />
    )
  },
)
AutoWidthNumberInput.displayName = 'AutoWidthNumberInput'
