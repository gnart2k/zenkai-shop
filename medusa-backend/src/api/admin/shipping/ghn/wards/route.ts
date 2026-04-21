import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { fetchGhnWards } from '../../../../../modules/ghn-fulfillment/master-data';

function parseDistrictId(body: unknown): number | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const raw = (body as Record<string, unknown>).district_id;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const districtId = parseDistrictId(req.body);
  if (districtId === null) {
    res.status(400).json({
      message: 'Invalid body. Expected { district_id: number }.',
    });
    return;
  }

  const wards = await fetchGhnWards(districtId);
  res.json({ wards });
}
