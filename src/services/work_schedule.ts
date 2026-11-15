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

export const DEFAULT_WORK = { start_time: '08:00', end_time: '19:00' }

function fallbackSchedule(): Record<number, { start_time: string; end_time: string }> {
  const out: Record<number, { start_time: string; end_time: string }> = {}
  for (let i = 0; i < 7; i++) out[i] = { ...DEFAULT_WORK }
  return out
}

export async function getWorkSchedule(): Promise<
  Record<number, { start_time: string; end_time: string }>
> {
  try {
    const rows = (await pb.collection('work_schedule').getFullList({
      sort: 'dow',
      $autoCancel: false,
    })) as unknown as WorkScheduleRecord[]
    const map = fallbackSchedule()
    for (const r of rows) {
      const d = Number(r.dow)
      if (Number.isInteger(d) && d >= 0 && d <= 6) {
        map[d] = {
          start_time: r.start_time || DEFAULT_WORK.start_time,
          end_time: r.end_time || DEFAULT_WORK.end_time,
        }
      }
    }
    return map
  } catch {
    return fallbackSchedule()
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
