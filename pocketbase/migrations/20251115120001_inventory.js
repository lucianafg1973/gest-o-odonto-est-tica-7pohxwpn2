// Estoque de material (Fase 3): itens de inventário e movimentos auditáveis.
// Aditiva — não altera coleções existentes. Seed vazio: a usuária cadastra
// os materiais dela (nenhum material inventado aqui).
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    const items = new Collection({
      name: 'inventory_items',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, min: 2, max: 200 },
        { name: 'manufacturer', type: 'text', max: 200 },
        { name: 'type', type: 'text', max: 120 },
        { name: 'presentation', type: 'text', max: 120 },
        { name: 'control_unit', type: 'text', max: 40 },
        { name: 'quantity', type: 'number', onlyInt: false },
        { name: 'batch', type: 'text', max: 120 },
        { name: 'expiry_date', type: 'date' },
        { name: 'supplier', type: 'text', max: 200 },
        { name: 'unit_cost', type: 'number', onlyInt: false },
        { name: 'min_stock', type: 'number', onlyInt: false },
        { name: 'storage_location', type: 'text', max: 200 },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inventory_items_name ON inventory_items (name)',
        'CREATE INDEX idx_inventory_items_expiry ON inventory_items (expiry_date)',
      ],
    })
    app.save(items)

    // Movimentos: 1º save sem o campo 'reverses' (auto-relação), depois o campo
    // é adicionado com o collectionId resolvido da própria coleção.
    const movements = new Collection({
      name: 'inventory_movements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'item',
          type: 'relation',
          required: true,
          collectionId: items.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['entrada', 'saida', 'ajuste', 'estorno'],
          maxSelect: 1,
        },
        { name: 'quantity', type: 'number', required: true, onlyInt: false },
        { name: 'batch', type: 'text', max: 120 },
        { name: 'responsible', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'responsible_name', type: 'text', max: 200 },
        { name: 'note', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inv_mov_item_created ON inventory_movements (item, created DESC)',
        'CREATE INDEX idx_inv_mov_type ON inventory_movements (type)',
      ],
    })
    app.save(movements)

    movements.fields.add(
      new RelationField({
        name: 'reverses',
        collectionId: movements.id,
        maxSelect: 1,
        minSelect: 0,
        required: false,
      }),
    )
    app.save(movements)
  },
  (app) => {
    try {
      const movements = app.findCollectionByNameOrId('inventory_movements')
      app.delete(movements)
    } catch (_) {}
    try {
      const items = app.findCollectionByNameOrId('inventory_items')
      app.delete(items)
    } catch (_) {}
  },
)
