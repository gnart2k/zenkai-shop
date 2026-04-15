# GHN Calculate Fee API

Calculate shipping fee before creating an order.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/fee
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
- `ShopId: <shop-id>`

**Body:**
```json
{
  "from_district_id": 1454,
  "from_ward_code": "21211",
  "service_id": 53320,
  "to_district_id": 1452,
  "to_ward_code": "21012",
  "height": 50,
  "length": 20,
  "weight": 200,
  "width": 20,
  "insurance_value": 10000,
  "items": [
    {
      "name": "TEST1",
      "quantity": 1,
      "height": 200,
      "weight": 1000,
      "length": 200,
      "width": 200
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shop_id` | number | Yes | Shop ID (header) |
| `from_district_id` | number | No | Sender district ID (defaults to shop info) |
| `from_ward_code` | number | No | Sender ward code (defaults to shop info) |
| `to_district_id` | number | Yes | Receiver district ID |
| `to_ward_code` | number | Yes | Receiver ward code |
| `service_id` | number | No | Service ID (from Get Service API) |
| `service_type_id` | number | No | Service type (default: 2 = E-Commerce) |
| `weight` | number | Yes | Weight (gram) |
| `length` | number | Yes | Length (cm) |
| `width` | number | Yes | Width (cm) |
| `height` | number | Yes | Height (cm) |
| `insurance_value` | number | No | Declared value (max 5,000,000) |
| `cod_value` | number | No | COD amount (max 5,000,000) |
| `coupon` | string | No | Coupon code |
| `cod_failed_amount` | number | No | Amount to collect on failed delivery |
| `items` | object[] | No | List of items |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee' \
  --header 'Content-Type: application/json' \
  --header 'Token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --header 'ShopId: 885' \
  --data-raw '{
    "from_district_id": 1454,
    "from_ward_code": "21211",
    "service_id": 53320,
    "to_district_id": 1452,
    "to_ward_code": "21012",
    "height": 50,
    "length": 20,
    "weight": 200,
    "width": 20,
    "insurance_value": 10000,
    "items": [
      {
        "name": "TEST1",
        "quantity": 1,
        "height": 200,
        "weight": 1000,
        "length": 200,
        "width": 200
      }
    ]
  }'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "total": 36300,
    "service_fee": 36300,
    "insurance_fee": 0,
    "pick_station_fee": 0,
    "coupon_value": 0,
    "r2s_fee": 0,
    "document_return": 0,
    "double_check": 0,
    "cod_fee": 0,
    "pick_remote_areas_fee": 0,
    "deliver_remote_areas_fee": 0,
    "cod_failed_fee": 0
  }
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `total` | Total fee |
| `service_fee` | Main service fee |
| `insurance_fee` | Insurance fee |
| `pick_station_fee` | Pickup at station fee |
| `coupon_value` | Discount from coupon |
| `r2s_fee` | Redelivery fee |
| `document_return` | Document return fee |
| `double_check` | Double check fee |
| `cod_fee` | COD fee |
| `pick_remote_areas_fee` | Remote pickup fee |
| `deliver_remote_areas_fee` | Remote delivery fee |
| `cod_failed_fee` | COD failed fee |

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

## TypeScript Interface

```typescript
interface GHNCalculateFeeRequest {
  from_district_id?: number;
  from_ward_code?: string;
  service_id?: number;
  service_type_id?: number;
  to_district_id: number;
  to_ward_code: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  insurance_value?: number;
  cod_value?: number;
  coupon?: string;
  cod_failed_amount?: number;
  items?: GHNItem[];
}

interface GHNItem {
  name: string;
  quantity: number;
  height: number;
  weight: number;
  length: number;
  width: number;
}

interface GHNFeeResponse {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
  coupon_value: number;
  r2s_fee: number;
  document_return: number;
  double_check: number;
  cod_fee: number;
  pick_remote_areas_fee: number;
  deliver_remote_areas_fee: number;
  cod_failed_fee: number;
}

interface GHNCalculateFeeResponse {
  code: number;
  message: string;
  data: GHNFeeResponse;
}
```