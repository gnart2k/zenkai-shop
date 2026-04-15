# GHN Get Service API

Get available shipping services between two districts.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/available-services
```

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://online-gateway.ghn.vn` |
| Test | `https://dev-online-gateway.ghn.vn` |

## Request

**Headers:**
- `Content-Type: application/json`
- `Token: <your-ghn-token>`

**Body:**
```json
{
  "shop_id": 885,
  "from_district": 1447,
  "to_district": 1442
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shop_id` | number | Yes | Shop ID |
| `from_district` | number | Yes | Sender district ID |
| `to_district` | number | Yes | Receiver district ID |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/available-services' \
  --header 'token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "shop_id": 885,
    "from_district": 1447,
    "to_district": 1442
  }'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    { "service_id": 53319, "short_name": "Nhanh", "service_type_id": 1 },
    { "service_id": 53320, "short_name": "Chuẩn", "service_type_id": 2 },
    { "service_id": 53330, "short_name": "", "service_type_id": 0 },
    { "service_id": 53321, "short_name": "Tiết kiệm", "service_type_id": 3 }
  ]
}
```

## Service Type Values

| service_type_id | Name | Description |
|-----------------|------|-------------|
| 0 | - | Default |
| 1 | Nhanh | Fast delivery |
| 2 | Chuẩn | Standard delivery |
| 3 | Tiết kiệm | Economy delivery |

## Response Fields

| Field | Description |
|-------|-------------|
| `service_id` | Service ID |
| `short_name` | Short name |
| `service_type_id` | Service type ID |

## Error Response

```json
{
  "code": 400,
  "message": "code=400, message=Syntax error: offset=30, error=invalid character '}' after array element",
  "data": null,
  "code_message": "USER_ERR_COMMON"
}
```

## Test Credentials

- **Token:** `637170d5-942b-11ea-9821-0281a26fb5d4`
- **Shop ID:** `885`
- **From District:** `1447`
- **To District:** `1442`

## TypeScript Interface

```typescript
interface GHNService {
  service_id: number;
  short_name: string;
  service_type_id: 0 | 1 | 2 | 3;
}

interface GHNGetServiceRequest {
  shop_id: number;
  from_district: number;
  to_district: number;
}

interface GHNGetServiceResponse {
  code: number;
  message: string;
  data: GHNService[];
}
```