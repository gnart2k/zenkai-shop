---
name: ghn-integration
description: Integration patterns for GHN (Giao Hàng Nhanh) Vietnamese shipping API. Contains all shipping endpoints, request/response structures, TypeScript interfaces, and integration patterns. Use when working with GHN shipping, logistics, or Vietnamese delivery services.
user-invocable: false
---

# GHN (Giao Hàng Nhanh) Integration

Vietnamese shipping provider API integration guide. Covers order management, shipping, tracking, address lookup, and fee calculation.

## When to Apply

**Load this skill when:**
- Integrating GHN shipping API
- Building Vietnamese logistics features
- Creating shipping orders with GHN
- Calculating shipping fees
- Looking up provinces/districts/wards
- Tracking order status

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://online-gateway.ghn.vn` |
| Test | `https://dev-online-gateway.ghn.vn` |

**All APIs require `Token` header for authentication. Some APIs also require `ShopId` header.**

---

# API: Create Order

Create a new shipping order with GHN.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/create
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`
- `ShopId: <shop-id>`

## Request Body

```typescript
interface CreateOrderRequest {
  // Required
  payment_type_id: 1 | 2;  // 1: Shop pays, 2: Buyer pays
  required_note: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
  from_name: string;
  from_phone: string;
  from_address: string;
  from_ward_name: string;
  from_district_name: string;
  from_province_name: string;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  weight: number;  // grams, max 50,000
  length: number;  // cm, max 200
  width: number;   // cm, max 200
  height: number;  // cm, max 200
  service_type_id: 2 | 5;  // 2: E-commerce, 5: Traditional

  // Optional
  return_phone?: string;
  return_address?: string;
  return_district_id?: number;
  return_ward_code?: string;
  client_order_code?: string;  // Your internal order ID
  cod_amount?: number;  // COD amount, max 50,000,000
  content?: string;
  note?: string;
  insurance_value?: number;  // max 5,000,000
  coupon?: string;
  pick_station_id?: number;
  deliver_station_id?: number;
  pick_shift?: number[];
  items?: OrderItem[];
}

interface OrderItem {
  name: string;
  code?: string;
  quantity: number;
  price?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  category?: { level1?: string; level2?: string; level3?: string; };
}
```

## Required Note Values

| Value | Vietnamese | Description |
|-------|------------|-------------|
| `CHOTHUHANG` | Cho thử hàng | Buyer can see and trial goods |
| `CHOXEMHANGKHONGTHU` | Cho xem hàng không thu | Buyer can see but not trial |
| `KHONGCHOXEMHANG` | Không cho xem hàng | Buyer cannot see goods |

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "FFFNL9HH",
    "sort_code": "19-60-06",
    "total_fee": "33000",
    "expected_delivery_time": "2020-06-03T16:00:00Z",
    "fee": {
      "main_service": 22000,
      "insurance": 11000,
      "station_do": 0,
      "station_pu": 0,
      "return": 0,
      "r2s": 0,
      "coupon": 0
    }
  }
}
```

## Error Response

```json
{
  "code": 400,
  "message": "Sai thông tin Required Note",
  "data": null,
  "code_message": "USER_ERR_COMMON"
}
```

---

# API: Get Order Detail

Retrieve detailed information about a GHN shipment.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/detail
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`

## Request Body

```typescript
interface OrderDetailRequest {
  order_code: string;  // GHN order code from create response
}
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "shop_id": 855,
    "order_code": "Z82T1",
    "status": "return",
    "to_name": "Tindeptrai",
    "to_phone": "0987654321",
    "to_address": "48 Bùi Thị Xuân",
    "to_ward_code": "21302",
    "to_district_id": 1461,
    "from_name": "Nguyen",
    "from_phone": "0332190458",
    "from_address": "310 Quan Nhân",
    "weight": 2,
    "length": 10,
    "width": 10,
    "height": 10,
    "converted_weight": 200,
    "cod_amount": 0,
    "insurance_value": 0,
    "service_type_id": 2,
    "service_id": 53321,
    "payment_type_id": 2,
    "required_note": "KHONGCHOXEMHANG",
    "leadtime": "2021-11-13T23:59:59Z",
    "order_date": "2021-11-11T03:04:23.928Z",
    "finish_date": null,
    "items": [{ "name": "test", "quantity": 1, "weight": 2 }],
    "log": [
      { "status": "picking", "updated_date": "2021-11-11T03:04:48.053Z" },
      { "status": "picked", "updated_date": "2021-11-11T03:04:48.053Z" },
      { "status": "delivering", "updated_date": "2021-11-11T03:07:47.245Z" },
      { "status": "delivery_fail", "updated_date": "2021-11-11T03:07:53.554Z" },
      { "status": "waiting_to_return", "updated_date": "2021-11-11T03:07:53.64Z" },
      { "status": "return", "updated_date": "2021-11-11T03:07:56.882Z" }
    ]
  }
}
```

## Order Status Values

| Status | Vietnamese | Description |
|--------|------------|-------------|
| `picking` | Đang lấy hàng | Picking up from sender |
| `picked` | Đã lấy hàng | Picked up, in transit |
| `delivering` | Đang giao hàng | Out for delivery |
| `delivery_fail` | Giao thất bại | Delivery failed |
| `waiting_to_return` | Chờ hoàn hàng | Awaiting return to sender |
| `return` | Đang hoàn hàng | Returning to sender |
| `delivered` | Đã giao hàng | Successfully delivered |

## Error Response

```json
{
  "code": 400,
  "message": "code=401, message=Token is not valid!",
  "data": null
}
```

---

# API: Get Province

Get list of all provinces supported by GHN.

## Endpoint

```
GET /shiip/public-api/master-data/province
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`

## Request Body

None required.

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    { "ProvinceID": 201, "ProvinceName": "Hà Nội", "Code": "4" },
    { "ProvinceID": 202, "ProvinceName": "Hồ Chí Minh", "Code": "8" },
    { "ProvinceID": 203, "ProvinceName": "Đà Nẵng", "Code": "511" }
  ]
}
```

## TypeScript

```typescript
interface Province {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
  NameExtension?: string[];
  CanUpdateCOD?: boolean;
  Status?: 1 | 2;
}
```

---

# API: Get District

Get list of districts within a province.

## Endpoint

```
GET /shiip/public-api/master-data/district
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`

## Request Body

```typescript
interface GetDistrictRequest {
  province_id: number;  // From Get Province API
}
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "DistrictID": 1442,
      "ProvinceID": 202,
      "DistrictName": "Quận 1",
      "Code": "0201",
      "Type": 1,
      "SupportType": 0
    }
  ]
}
```

## SupportType Values

| Value | Description |
|-------|-------------|
| 0 | Lock |
| 1 | Take/Pay |
| 2 | Deliver |
| 3 | Take/Deliver/Pay |

---

# API: Get Ward

Get list of wards within a district.

## Endpoint

```
POST /shiip/public-api/master-data/ward
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`

## Request Body

```typescript
interface GetWardRequest {
  district_id: number;  // From Get District API
}
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    { "WardCode": 510101, "DistrictID": 1566, "WardName": "Phường Mỹ Bình" },
    { "WardCode": 510102, "DistrictID": 1566, "WardName": "Phường Mỹ Long" }
  ]
}
```

---

# API: Get Available Services

Get available shipping services between two districts.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/available-services
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`

## Request Body

```typescript
interface GetServiceRequest {
  shop_id: number;
  from_district: number;
  to_district: number;
}
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    { "service_id": 53319, "short_name": "Nhanh", "service_type_id": 1 },
    { "service_id": 53320, "short_name": "Chuẩn", "service_type_id": 2 },
    { "service_id": 53321, "short_name": "Tiết kiệm", "service_type_id": 3 }
  ]
}
```

## Service Type Values

| service_type_id | Name | Description |
|-----------------|------|-------------|
| 1 | Nhanh | Fast delivery |
| 2 | Chuẩn | Standard delivery |
| 3 | Tiết kiệm | Economy delivery |

---

# API: Calculate Fee

Calculate shipping fee before creating an order.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/fee
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`
- `ShopId: <shop-id>`

## Request Body

```typescript
interface CalculateFeeRequest {
  from_district_id?: number;
  from_ward_code?: string;
  to_district_id: number;
  to_ward_code: string;
  service_id?: number;
  service_type_id?: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  insurance_value?: number;
  cod_value?: number;
  coupon?: string;
  cod_failed_amount?: number;
  items?: { name: string; quantity: number; weight: number; length: number; width: number; height: number; }[];
}
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

---

# API: Fee of Order Info

Get detailed fee breakdown of an existing order.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/soc
```

## Headers

- `Content-Type: application/json`
- `Token: <your-ghn-token>`
- `ShopId: <shop-id>`

## Request Body

```typescript
interface FeeOfOrderInfoRequest {
  order_code: string;
}
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
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
      { "value": 40700, "payment_type": 2, "paid_date": "0001-01-01T00:00:00Z", "created_date": "2020-05-29T14:33:51.082Z" }
    ],
    "cod_collect_date": "0001-01-01T00:00:00Z",
    "transaction_id": "54ca80f5-5154-4486-9fc6-8cc218086de8"
  }
}
```

---

# Common Integration Patterns

## 1. Store Both Order Codes

When creating GHN orders, store both:
- `order_code` - GHN's identifier (for tracking)
- `client_order_code` - Your internal reference

```typescript
const ghnResponse = await createGHNOrder({ ... });
await saveOrder({
  id: "order_123",
  ghn_order_code: ghnResponse.data.order_code,
  client_order_code: "YOUR_INTERNAL_REF",
});
```

## 2. Address Lookup Flow

```
Get Province → Get District (by province_id) → Get Ward (by district_id)
```

## 3. Status Mapping

```typescript
const statusMap: Record<string, string> = {
  picking: "picking_up",
  picked: "in_transit",
  delivering: "out_for_delivery",
  delivery_fail: "failed",
  waiting_to_return: "returning",
  return: "returning",
  delivered: "delivered",
};
```

---

# Test Credentials

- **Token:** `637170d5-942b-11ea-9821-0281a26fb5d4`
- **Shop ID:** `885`
- **Test Order Code:** `5ENLKKHD`

---

# Error Codes

| Code | Message | Action |
|------|---------|--------|
| 200 | Success | Success |
| 400 | Syntax error | Check JSON format |
| 401 | Token is not valid! | Check your token |
| 404 | Not Found | Verify IDs/codes |
| 400 | Sai thông tin Required Note | Check required_note value |