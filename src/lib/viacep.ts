/**
 * Busca de endereço por CEP na API pública ViaCEP.
 * Falha silenciosa (retorna null) — o preenchimento manual de cidade/bairro
 * continua sempre possível se a API estiver indisponível.
 */
export interface ViaCepResult {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean | string
}

export function maskCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export async function buscarCep(cep: string): Promise<ViaCepResult | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data = (await res.json()) as ViaCepResult
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}
