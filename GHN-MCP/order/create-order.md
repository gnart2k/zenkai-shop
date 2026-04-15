# GHN Create Order API

Create a new shipping order with GHN.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/create
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
  "payment_type_id": 2,
  "note": "Tintest 123",
  "required_note": "KHONGCHOXEMHANG",
  "from_name": "TinTest124",
  "from_phone": "0987654321",
  "from_address": "72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh, Vietnam",
  "from_ward_name": "Phường 14",
  "from_district_name": "Quận 10",
  "from_province_name": "HCM",
  "return_phone": "0332190444",
  "return_address": "39 NTT",
  "return_district_id": null,
  "return_ward_code": "",
  "client_order_code": "",
  "to_name": "TinTest124",
  "to_phone": "0987654321",
  "to_address": "72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh, Vietnam",
  "to_ward_code": "20308",
  "to_district_id": 1444,
  "cod_amount": 200000,
  "content": "Theo New York Times",
  "weight": 200,
  "length": 1,
  "width": 19,
  "height": 10,
  "pick_station_id": 1444,
  "deliver_station_id": null,
  "insurance_value": 10000000,
  "service_id": 0,
  "service_type_id": 2,
  "coupon": null,
  "pick_shift": [2],
  "items": [
    {
      "name": "Áo Polo",
      "code": "Polo123",
      "quantity": 1,
      "price": 200000,
      "length": 12,
      "width": 12,
      "height": 12,
      "weight": 1200,
      "category": {
        "level1": "Áo"
      }
    }
  ]
}
```

## Required Parameters

| Field | Type | Description |
|-------|------|-------------|
| `shop_id` | number | Shop ID (header) |
| `token` | string | API Token (header) |
| `to_name` | string | Receiver name (max 1024 chars) |
| `from_name` | string | Sender name (max 1024 chars) |
| `from_phone` | string | Sender phone number |
| `from_address` | string | Sender address (max 1024 chars) |
| `from_ward_name` | string | Sender ward/commune |
| `from_district_name` | string | Sender district |
| `from_province_name` | string | Sender province |
| `to_phone` | string | Receiver phone number |
| `to_address` | string | Receiver address (max 1024 chars) |
| `to_ward_code` | string | Receiver ward code |
| `to_district_id` | number | Receiver district ID |
| `weight` | number | Weight in grams (max 50,000) |
| `length` | number | Length in cm (max 200) |
| `width` | number | Width in cm (max 200) |
| `height` | number | Height in cm (max 200) |
| `service_type_id` | number | Service type (2: E-commerce, 5: Traditional) |
| `payment_type_id` | number | Payer (1: Shop, 2: Buyer) |
| `required_note` | string | Note type |

## Optional Parameters

| Field | Type | Description |
|-------|------|-------------|
| `return_phone` | string | Return phone number |
| `return_address` | string | Return address |
| `return_district_id` | number | Return district ID |
| `return_ward_code` | string | Return ward code |
| `client_order_code` | string | External order code (max 50 chars, unique) |
| `cod_amount` | number | COD amount (max 50,000,000) |
| `content` | string | Order content (max 2000 chars) |
| `note` | string | Client note (max 5000 chars) |
| `insurance_value` | number | Declared value (max 5,000,000) |
| `coupon` | string | Coupon code |
| `pick_station_id` | number | Pickup station ID |
| `deliver_station_id` | number | Delivery station ID |
| `pick_shift` | number[] | Picking shift |
| `items` | object[] | List of items |

## Required Note Values

| Value | Vietnamese | Description |
|-------|------------|-------------|
| `CHOTHUHANG` | Cho thử hàng | Buyer can see and trial goods |
| `CHOXEMHANGKHONGTHU` | Cho xem hàng không thu | Buyer can see but not trial |
| `KHONGCHOXEMHANG` | Không cho xem hàng | Buyer cannot see goods |

## Payment Type Values

| Value | Description |
|-------|-------------|
| 1 | Shop/Seller pays |
| 2 | Buyer/Consignee pays |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create' \
  --header 'Content-Type: application/json' \
  --header 'ShopId: 885' \
  --header 'Token: 285518-c4bb-11ea-be3a-f636b1deefb9' \
  --data-raw '{
    "payment_type_id": 2,
    "note": "Tintest 123",
    "required_note": "KHONGCHOXEMHANG",
    "from_name": "TinTest124",
    "from_phone": "0987654321",
    "from_address": "72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh, Vietnam",
    "from_ward_name": "Phường 14",
    "from_district_name": "Quận 10",
    "from_province_name": "HCM",
    "to_name": "TinTest124",
    "to_phone": "0987654321",
    "to_address": "72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh, Vietnam",
    "to_ward_code": "20308",
    "to_district_id": 1444,
    "cod_amount": 200000,
    "content": "Theo New York Times",
    "weight": 200,
    "length": 1,
    "width": 19,
    "height": 10,
    "insurance_value": 10000000,
    "service_type_id": 2,
    "items": [
      {
        "name": "Áo Polo",
        "code": "Polo123",
        "quantity": 1,
        "price": 200000,
        "length": 12,
        "width": 12,
        "height": 12,
        "weight": 1200,
        "category": {
          "level1": "Áo"
        }
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
    "district_encode": "",
    "expected_delivery_time": "2020-06-03T16:00:00Z",
    "fee": {
      "coupon": 0,
      "insurance": 11000,
      "main_service": 22000,
      "r2s": 0,
      "return": 0,
      "station_do": 0,
      "station_pu": 0
    },
    "order_code": "FFFNL9HH",
    "sort_code": "19-60-06",
    "total_fee": "33000",
    "trans_type": "truck",
    "ward_encode": ""
  }
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `expected_delivery_time` | Expected delivery time |
| `fee` | Fee breakdown |
| `fee.coupon` | Coupon discount |
| `fee.insurance` | Insurance fee |
| `fee.main_service` | Main service fee |
| `fee.r2s` | Redelivery fee |
| `fee.return` | Return fee |
| `fee.station_do` | Delivery station fee |
| `fee.station_pu` | Pickup station fee |
| `order_code` | GHN order code (use for tracking) |
| `sort_code` | Sort code |
| `total_fee` | Total fee |
| `trans_type` | Transportation type |

## Error Response

```json
{
  "code": 400,
  "message": "Sai thông tin Required Note",
  "data": null,
  "code_message": "USER_ERR_COMMON"
}
```

## TypeScript Interface

```typescript
interface GHNCreateOrderRequest {
  payment_type_id: 1 | 2;
  note?: string;
  required_note: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
  from_name: string;
  from_phone: string;
  from_address: string;
  from_ward_name: string;
  from_district_name: string;
  from_province_name: string;
  return_phone?: string;
  return_address?: string;
  return_district_id?: number;
  return_ward_code?: string;
  client_order_code?: string;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  cod_amount?: number;
  content?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  pick_station_id?: number;
  deliver_station_id?: number;
  insurance_value?: number;
  service_id?: number;
  service_type_id: 2 | 5;
  coupon?: string;
  pick_shift?: number[];
  items?: GHNOrderItem[];
}

interface GHNOrderItem {
  name: string;
  code?: string;
  quantity: number;
  price?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  category?: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
}

interface GHNCreateOrderFee {
  coupon: number;
  insurance: number;
  main_service: number;
  r2s: number;
  return: number;
  station_do: number;
  station_pu: number;
}

interface GHNCreateOrderData {
  district_encode: string;
  expected_delivery_time: string;
  fee: GHNCreateOrderFee;
  order_code: string;
  sort_code: string;
  total_fee: string;
  trans_type: string;
  ward_encode: string;
}

interface GHNCreateOrderResponse {
  code: number;
  message: string;
  data: GHNCreateOrderData;
}
```