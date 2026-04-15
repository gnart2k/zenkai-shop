# GHN Fee of Order Info API

Get detailed fee breakdown of an existing order.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/soc
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
  "order_code": "5ENLKKHD"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_code` | string | Yes | GHN order code |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/soc' \
  --header 'Content-Type: application/json' \
  --header 'ShopID: 885' \
  --header 'Token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --data-raw '{"order_code": "5ENLKKHD"}'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "_id": "5ed121cb1eb594a402473301",
    "order_code": "S5ENLKKHD",
    "detail": {
      "main_service": 29700,
      "insurance": 11000,
      "station_do": 0,
      "station_pu": 0,
      "return": 22000,
      "r2s": 0,
      "coupon": 0
    },
    "payment": [
      {
        "value": 40700,
        "payment_type": 2,
        "paid_date": "0001-01-01T00:00:00Z",
        "created_date": "2020-05-29T14:33:51.082Z"
      },
      {
        "value": 22000,
        "payment_type": 2,
        "paid_date": "0001-01-01T00:00:00Z",
        "created_date": "2020-05-29T14:52:59.484Z"
      }
    ],
    "cod_collect_date": "0001-01-01T00:00:00Z",
    "transaction_id": "54ca80f5-5154-4486-9fc6-8cc218086de8",
    "created_ip": "",
    "created_date": "2020-05-29T14:52:59.484Z",
    "updated_ip": "",
    "updated_client": 0,
    "updated_employee": 0,
    "updated_source": "",
    "updated_date": "0001-01-01T00:00:00Z"
  }
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `order_code` | Order code |
| `detail` | Fee details |
| `detail.main_service` | Main service fee |
| `detail.insurance` | Insurance fee |
| `detail.station_do` | Delivery station fee |
| `detail.station_pu` | Pickup station fee |
| `detail.return` | Return fee |
| `detail.r2s` | Redelivery fee |
| `detail.coupon` | Coupon discount |
| `payment` | Payment history |
| `payment[].value` | Payment amount |
| `payment[].payment_type` | Payment type |
| `payment[].paid_date` | Paid date |
| `payment[].created_date` | Created date |
| `cod_collect_date` | COD collection date |
| `transaction_id` | Transaction ID |
| `created_ip` | Created IP |
| `created_date` | Created date |
| `updated_ip` | Updated IP |
| `updated_client` | Updated client |
| `updated_employee` | Updated employee |
| `updated_source` | Updated source |
| `updated_date` | Updated date |

## Error Response

```json
{
  "code": 404,
  "message": "Không tìm thấy thông tin đơn hàng",
  "data": null
}
```

## Test Credentials

- **Token:** `637170d5-942b-11ea-9821-0281a26fb5d4`
- **Shop ID:** `885`
- **Order Code:** `5ENLKKHD`

## TypeScript Interface

```typescript
interface GHNFeeOfOrderInfoRequest {
  order_code: string;
}

interface GHNOrderFeeDetail {
  main_service: number;
  insurance: number;
  station_do: number;
  station_pu: number;
  return: number;
  r2s: number;
  coupon: number;
}

interface GHNPayment {
  value: number;
  payment_type: number;
  paid_date: string;
  created_date: string;
}

interface GHNFeeOfOrderInfoData {
  _id: string;
  order_code: string;
  detail: GHNOrderFeeDetail;
  payment: GHNPayment[];
  cod_collect_date: string;
  transaction_id: string;
  created_ip: string;
  created_date: string;
  updated_ip: string;
  updated_client: number;
  updated_employee: number;
  updated_source: string;
  updated_date: string;
}

interface GHNFeeOfOrderInfoResponse {
  code: number;
  message: string;
  data: GHNFeeOfOrderInfoData;
}
```