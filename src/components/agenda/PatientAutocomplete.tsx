/**
 * Autocomplete de paciente por primeiras letras do nome (cmdk + Popover) —
 * usado no agendamento da agenda: mostra os clientes cadastrados que batem
 * com o que foi digitado; se nenhum bater, oferece "Cadastrar novo cliente".
 */
import { useMemo, useState } from 'react'
import { UserPlus, UserRound } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { maskPhone } from '@/components/patients/PatientFormDialog'
import type { PatientRecord } from '@/services/patients'
import { cn } from '@/lib/utils'

export default function PatientAutocomplete({
  patients,
  value,
  onSelect,
  onCreateNew,
  placeholder = 'Digite as primeiras letras do nome...',
}: {
  patients: PatientRecord[]
  value: PatientRecord | null
  onSelect: (p: PatientRecord) => void
  /** Chamado com o texto digitado quando não há nenhum match. */
  onCreateNew: (name: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  /** Filtra por primeiras letras: cada palavra digitada tem que bater com o início de uma palavra do nome. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    const terms = q.split(/\s+/)
    return patients.filter((p) => {
      const name = (p.name || '').toLowerCase()
      return terms.every((t) => name.split(/\s+/).some((w) => w.startsWith(t)))
    })
  }, [patients, query])

  const queryTrim = query.trim()
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal bg-[#FFFDF9] border-[#EDE3D8]',
            !value && 'text-muted-foreground',
          )}
        >
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <UserRound className="w-4 h-4 text-[#C66B4D] shrink-0" />
              <span className="truncate">{value.name}</span>
              {value.phone && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {maskPhone(value.phone)}
                </Badge>
              )}
            </span>
          ) : (
            <span>Selecione o paciente</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            <CommandGroup heading="Clientes">
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onSelect(p)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  {p.phone && (
                    <span className="ml-auto text-[10px] text-[#6B4F42]">{maskPhone(p.phone)}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {queryTrim !== '' && (
              <CommandGroup heading="Novo cadastro">
                <CommandItem
                  value="__create_new__"
                  onSelect={() => {
                    onCreateNew(queryTrim)
                    setOpen(false)
                  }}
                  className="text-[#C66B4D] aria-selected:bg-[#FFF3D6]"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Cadastrar novo cliente com o nome "
                  {queryTrim}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
