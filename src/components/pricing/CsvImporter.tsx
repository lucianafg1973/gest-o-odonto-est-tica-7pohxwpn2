import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/price-calculation'
import { CsvRow } from '@/lib/csv-import'

/**
 * PRÉVIA DA IMPORTAÇÃO — o usuário confere as linhas antes de publicar como
 * tabela oficial. Linhas sem preço aparecem marcadas como pendentes.
 */
interface Props {
  rows: CsvRow[]
  onCancel: () => void
  onConfirm: () => void
  publicando: boolean
}

export default function CsvImporter({ rows, onCancel, onConfirm, publicando }: Props) {
  const comPreco = rows.filter((r) => r.precoPropostoBrl != null).length
  const semPreco = rows.length - comPreco
  const [pagina, setPagina] = useState(0)
  const porPagina = 15
  const visiveis = rows.slice(pagina * porPagina, (pagina + 1) * porPagina)
  const paginas = Math.max(1, Math.ceil(rows.length / porPagina))

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-[#2D1B14]">
            Prévia da importação — {rows.length} linha(s)
          </DialogTitle>
          <div className="flex gap-2 mt-1">
            <Badge className="bg-[#6B8E23] text-white">{comPreco} com preço</Badge>
            {semPreco > 0 && (
              <Badge className="bg-amber-100 text-amber-800">
                {semPreco} sem preço (pendentes)
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#6B4F42] mt-1">
            Confira antes de publicar. Reimportar o mesmo arquivo NÃO duplica: o código
            (id_importacao) é a chave de unicidade — registros existentes são atualizados.
          </p>
        </DialogHeader>

        <div className="overflow-auto flex-1 border border-[#EDE3D8] rounded-lg">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#FAF6F0]">
              <tr className="text-left text-[#6B4F42]">
                <th className="p-2">Código</th>
                <th className="p-2">Especialidade</th>
                <th className="p-2">Família</th>
                <th className="p-2">Procedimento</th>
                <th className="p-2 text-right">Preço</th>
                <th className="p-2 text-right">Min</th>
                <th className="p-2 text-right">Mat.</th>
                <th className="p-2 text-right">Lab.</th>
                <th className="p-2 text-right">Exec.</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={`${r.linha}-${r.idImportacao}`} className="border-t border-[#F5EEE6]">
                  <td className="p-2 font-mono text-[10px]">{r.idImportacao}</td>
                  <td className="p-2">{r.categoriaSugerida || '—'}</td>
                  <td className="p-2">{r.grupoBusca || '—'}</td>
                  <td className="p-2">{r.procedimentoOriginal}</td>
                  <td className="p-2 text-right">
                    {r.precoPropostoBrl != null ? (
                      formatCurrency(r.precoPropostoBrl)
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 text-[9px]">pendente</Badge>
                    )}
                  </td>
                  <td className="p-2 text-right">{r.tempoClinicoMinutos || '—'}</td>
                  <td className="p-2 text-right">
                    {r.materialBrl != null ? formatCurrency(r.materialBrl) : '—'}
                  </td>
                  <td className="p-2 text-right">
                    {r.laboratorioBrl != null ? formatCurrency(r.laboratorioBrl) : '—'}
                  </td>
                  <td className="p-2 text-right">
                    {r.remuneracaoExecutorBrl != null
                      ? formatCurrency(r.remuneracaoExecutorBrl)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={pagina === 0}
              onClick={() => setPagina(pagina - 1)}
            >
              ‹
            </Button>
            <span className="text-[11px] text-[#6B4F42]">
              Página {pagina + 1} de {paginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={pagina >= paginas - 1}
              onClick={() => setPagina(pagina + 1)}
            >
              ›
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="text-xs" onClick={onCancel} disabled={publicando}>
            Cancelar
          </Button>
          <Button className="btn-terracotta-gold text-xs" onClick={onConfirm} disabled={publicando}>
            {publicando ? 'Publicando…' : `Publicar ${rows.length} na tabela oficial`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
