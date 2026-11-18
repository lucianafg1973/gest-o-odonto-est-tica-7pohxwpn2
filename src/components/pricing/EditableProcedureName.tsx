import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ProcedureRecord } from '@/services/procedures'

interface Props {
  procedure: ProcedureRecord
  busy: boolean
  onSave: (patch: Partial<ProcedureRecord>) => void
}

/**
 * Nome do procedimento editável inline na planilha "Situação Atual":
 * clicar no nome vira um input; Enter ou blur salva no MESMO registro da
 * coleção procedures (sem duplicar — o novo nome aparece também no
 * planejamento, que lê a mesma coleção). Esc cancela.
 */
export function EditableProcedureName({ procedure, busy, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState(procedure.name ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setValor(procedure.name ?? '')
  }, [procedure.name, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const novo = valor.trim()
    setEditing(false)
    if (!novo || novo === procedure.name) return
    onSave({ name: novo })
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="group flex items-center gap-1.5 py-0.5 font-medium text-[#2D1B14] text-left max-w-[240px]"
        title="Clique para editar o nome"
        onClick={() => setEditing(true)}
        disabled={busy}
      >
        <span className="truncate group-hover:underline underline-offset-2">{procedure.name}</span>
        <Pencil className="w-3 h-3 shrink-0 text-[#C66B4D] opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    )
  }

  return (
    <Input
      ref={inputRef}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setValor(procedure.name ?? '')
          setEditing(false)
        }
      }}
      className="h-7 text-[11px] max-w-[240px]"
      disabled={busy}
    />
  )
}
