import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { fetchGhnDistricts } from '../../../../../modules/ghn-fulfillment/master-data';

function parseProvinceId(query: MedusaRequest['query']): number | null {
  const raw = query?.province_id;
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (str === undefined || str === '') {
    return null;
  }
  const n = Number(str);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const provinceId = parseProvinceId(req.query);
  if (provinceId === null) {
    res.status(400).json({
      message: 'Invalid query. Expected province_id as a positive integer.',
    });
    return;
  }

  const districts = await fetchGhnDistricts(provinceId);
  res.json({ districts });
}
