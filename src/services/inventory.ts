import pb from '@/lib/pocketbase/client'

export interface InventoryItemRecord {
  id: string
  name: string
  manufacturer?: string
  type?: string
  presentation?: string
  control_unit?: string
  quantity?: number
  batch?: string
  expiry_date?: string
  supplier?: string
  unit_cost?: number
  min_stock?: number
  storage_location?: string
  active?: boolean
  created: string
  updated: string
  expand?: { responsible?: { name: string } }
}

export interface InventoryMovementRecord {
  id: string
  item: string
  type: 'entrada' | 'saida' | 'ajuste' | 'estorno'
  quantity: number
  batch?: string
  responsible?: string
  responsible_name?: string
  reverses?: string
  note?: string
  created: string
  updated: string
  expand?: { item?: InventoryItemRecord; responsible?: { name: string } }
}

export const getInventoryItems = () =>
  pb.collection('inventory_items').getFullList<InventoryItemRecord>({ sort: 'name' })

export const getInventoryItem = (id: string) =>
  pb.collection('inventory_items').getOne<InventoryItemRecord>(id)

export const createInventoryItem = (data: Partial<InventoryItemRecord>) =>
  pb.collection('inventory_items').create<InventoryItemRecord>(data)

export const updateInventoryItem = (id: string, data: Partial<InventoryItemRecord>) =>
  pb.collection('inventory_items').update<InventoryItemRecord>(id, data)

/**
 * Registra um movimento (entrada/saida/ajuste) e aplica o efeito na
 * quantidade em estoque do item. `delta` é o acréscimo líquido:
 * entrada → +qtd, saida → -qtd, ajuste → (novoTotal - atual).
 */
export async function registerMovement(
  itemId: string,
  data: {
    type: InventoryMovementRecord['type']
    quantity: number
    batch?: string
    responsible?: string
    responsible_name?: string
    note?: string
    reverses?: string
  },
  delta: number,
  currentQuantity: number,
): Promise<void> {
  await pb.collection('inventory_movements').create({
    item: itemId,
    type: data.type,
    quantity: data.quantity,
    batch: data.batch || '',
    responsible: data.responsible || '',
    responsible_name: data.responsible_name || '',
    note: data.note || '',
    ...(data.reverses ? { reverses: data.reverses } : {}),
  })
  await pb.collection('inventory_items').update(itemId, {
    quantity: Math.max(0, currentQuantity + delta),
  })
}

export const getMovementsByItem = (itemId: string) =>
  pb.collection('inventory_movements').getFullList<InventoryMovementRecord>({
    filter: `item="${itemId}"`,
    sort: '-created',
  })
