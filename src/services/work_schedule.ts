/**
 * Expediente comercial por dia da semana — coleção `work_schedule` (migração 0019).
 * Fallback: padrão 08:00–19:00 quando a coleção não responde (grace period).
 */
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

export interface WorkScheduleRecord {
  id: string
  dow: number // 0 = domingo … 6 = sábado
  start_time: string // "08:00"
  end_time: string // "19:00"
}

/** Padrão da grade antes do banco responder (08:00–19:00, em minutos). */
export const DEFAULT_WORK_SCHEDULE: Record<number, { start: number; end: number }> = (() => {
  const out: Record<number, { start: number; end: number }> = {}
  for (let i = 0; i < 7; i++) out[i] = { start: 8 * 60, end: 19 * 60 }
  return out
})()

export const DEFAULT_WORK = { start_time: '08:00', end_time: '19:00' }

export async function getWorkSchedule(): Promise<Record<number, { start: number; end: number }>> {
  const toMin = (t: string): number => {
    const [h, m] = (t || '08:00').split(':').map(Number)
    return (h || 8) * 60 + (m || 0)
  }
  const map: Record<number, { start: number; end: number }> = {}
  for (let i = 0; i < 7; i++) map[i] = { start: 8 * 60, end: 19 * 60 }
  try {
    const rows = (await pb.collection('work_schedule').getFullList({
      sort: 'dow',
      $autoCancel: false,
    })) as unknown as WorkScheduleRecord[]
    for (const r of rows) {
      const d = Number(r.dow)
      if (Number.isInteger(d) && d >= 0 && d <= 6) {
        map[d] = {
          start: Math.min(toMin(r.start_time), toMin(r.end_time)),
          end: Math.max(toMin(r.start_time), toMin(r.end_time)),
        }
      }
    }
    return map
  } catch {
    return map
  }
}

export async function upsertWorkSchedule(
  dow: number,
  start_time: string,
  end_time: string,
): Promise<void> {
  try {
    const existing = (await pb.collection('work_schedule').getList(1, 10, {
      filter: `dow=${dow}`,
      $autoCancel: false,
    })) as unknown as { items: WorkScheduleRecord[] }
    if (existing.items && existing.items.length > 0) {
      await pb.collection('work_schedule').update(existing.items[0].id, { start_time, end_time })
    } else {
      await pb.collection('work_schedule').create({ dow, start_time, end_time })
    }
  } catch {
    toast({ title: 'Não foi possível salvar o expediente no servidor', variant: 'destructive' })
  }
}

/**
 * Salva o expediente de um dia da semana (usado pela grade da agenda).
 * Aceita minutos e devolve o valor persistido; erro propaga para a UI decidir.
 */
export async function saveWorkSchedule(
  dow: number,
  range: { start: number; end: number },
): Promise<{ start: number; end: number }> {
  const start_time = minToTimeStr(range.start)
  const end_time = minToTimeStr(range.end)
  await upsertWorkSchedule(dow, start_time, end_time)
  return { start: range.start, end: range.end }
}

/** 540 → "09:00" (helper local para não importar da grade). */
function minToTimeStr(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
