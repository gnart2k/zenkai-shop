import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve('query');

  const variantId = req.query.variant_id as string;

  if (!variantId) {
    res.status(400).json({ error: 'variant_id is required' });
    return;
  }

  const { data: variants } = await query.graph({
    entity: 'product_variant',
    filters: { id: variantId },
    fields: ['id', 'inventory_items.inventory_item_id', 'product.metadata'],
  });

  const productMetadata = variants?.[0]?.product?.metadata as Record<string, unknown> | undefined;
  const isPhysical = productMetadata?.is_physical;

  if (isPhysical === false || isPhysical === 'false') {
    res.json({
      inventory_quantity: Number.MAX_SAFE_INTEGER,
      is_digital: true,
    });
    return;
  }

  if (!variants?.[0]?.inventory_items?.[0]?.inventory_item_id) {
    res.json({ inventory_quantity: 0, is_digital: false });
    return;
  }

  const inventoryItemId = variants[0].inventory_items[0].inventory_item_id;

  // Use query.graph to get inventory levels (correct field names)
  const { data: levels } = await query.graph({
    entity: 'inventory_level',
    filters: { inventory_item_id: inventoryItemId },
    fields: ['stocked_quantity', 'reserved_quantity', 'location_id'],
  });

  let totalStocked = 0;
  let totalReserved = 0;

  for (const level of levels || []) {
    totalStocked += Number(level.stocked_quantity || 0);
    totalReserved += Number(level.reserved_quantity || 0);
  }

  const available = totalStocked - totalReserved;

  res.json({
    inventory_item_id: inventoryItemId,
    stocked_quantity: totalStocked,
    reserved_quantity: totalReserved,
    inventory_quantity: Math.max(0, available),
    is_digital: false,
  });
}
