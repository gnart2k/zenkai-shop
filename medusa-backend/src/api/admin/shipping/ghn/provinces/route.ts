import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { fetchGhnProvinces } from '../../../../../modules/ghn-fulfillment/master-data';

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const provinces = await fetchGhnProvinces();
  res.json({ provinces });
}
