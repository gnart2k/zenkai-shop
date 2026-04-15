# GHN Order Detail API

Retrieve detailed information about a GHN shipment.

## Endpoint

```
POST /shiip/public-api/v2/shipping-order/detail
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
  "order_code": "5ENLKKHD"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_code` | string | Yes | GHN order code returned when creating order |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail' \
  --header 'Content-Type: application/json' \
  --header 'Token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --data-raw '{
    "order_code": "5ENLKKHD"
  }'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "shop_id": 855,
    "client_id": 500379,
    "return_name": "Lastmile",
    "return_phone": "0332190458",
    "return_address": "310 Quan Nhân",
    "return_ward_code": "1A0710",
    "return_district_id": 1493,
    "from_name": "Nguyen",
    "from_phone": "0332190458",
    "from_address": "310 Quan Nhân",
    "from_ward_code": "1A0710",
    "from_district_id": 1493,
    "to_name": "Tindeptrai",
    "to_phone": "0987654321",
    "to_address": "48 Bùi Thị Xuân",
    "to_ward_code": "21302",
    "to_district_id": 1461,
    "weight": 2,
    "length": 10,
    "width": 10,
    "height": 10,
    "converted_weight": 200,
    "service_type_id": 2,
    "service_id": 53321,
    "payment_type_id": 2,
    "cod_amount": 0,
    "insurance_value": 0,
    "order_value": 0,
    "client_order_code": "",
    "required_note": "KHONGCHOXEMHANG",
    "content": "Tindeptrai",
    "note": "",
    "pickup_time": "2021-11-11T03:04:23.928Z",
    "items": [
      {
        "name": "test",
        "quantity": 1,
        "weight": 2
      }
    ],
    "order_code": "Z82T1",
    "status": "return",
    "pick_warehouse_id": 2461,
    "deliver_warehouse_id": 1364,
    "current_warehouse_id": 2461,
    "return_warehouse_id": 2271,
    "leadtime": "2021-11-13T23:59:59Z",
    "order_date": "2021-11-11T03:04:23.928Z",
    "finish_date": null,
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

## Response Fields

| Field | Description |
|-------|-------------|
| `shop_id` | Mã cửa hàng |
| `client_id` | Thông tin cá nhân |
| `return_name` | Tên người nhận hoàn hàng |
| `return_phone` | Số điện thoại người nhận hoàn hàng |
| `return_address` | Địa chỉ người nhận hoàn hàng |
| `return_ward_code` | Phường/Xã người nhận hoàn hàng |
| `return_district_id` | Quận/Huyện người nhận hoàn hàng |
| `from_name` | Tên người gửi |
| `from_phone` | Số điện thoại người gửi |
| `from_address` | Địa chỉ người gửi |
| `from_ward_code` | Phường/Xã người gửi |
| `from_district_id` | Quận/Huyện người gửi |
| `to_name` | Tên người nhận |
| `to_phone` | Số điện thoại người nhận |
| `to_address` | Địa chỉ người nhận |
| `to_ward_code` | Phường/Xã người nhận |
| `to_district_id` | Quận/Huyện người nhận |
| `weight` | Cân nặng |
| `length` | Chiều dài |
| `width` | Chiều rộng |
| `height` | Chiều cao |
| `converted_weight` | Khối lượng quy đổi |
| `service_type_id` | Mã loại hình dịch vụ |
| `service_id` | Mã dịch vụ |
| `payment_type_id` | Mã người thanh toán phí dịch vụ |
| `cod_amount` | Tiền thu hộ |
| `cod_collect_date` | Ngày thu tiền thu hộ |
| `cod_transfer_date` | Ngày chuyển tiền thu hộ |
| `insurance_value` | Phí khai giá hàng hóa |
| `client_order_code` | Mã đơn hàng riêng của Khách hàng |
| `required_note` | Ghi chú bắt buộc |
| `content` | Nội dung |
| `note` | Ghi chú |
| `pickup_time` | Thời gian lấy dự kiến |
| `order_code` | Mã đơn hàng |
| `sort_code` | Mã vận hành |
| `status` | Trạng thái |
| `pick_warehouse_id` | Kho lấy |
| `deliver_warehouse_id` | Kho giao |
| `current_warehouse_id` | Kho hiện tại |
| `return_warehouse_id` | Kho trả |
| `next_warehouse_id` | Kho kế tiếp |
| `leadtime` | Thời gian giao dự kiến |
| `order_date` | Ngày tạo đơn |
| `finish_date` | Ngày giao hàng thành công |
| `log` | Lịch sử trạng thái |

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

## Test Credentials

- **Token:** `637170d5-942b-11ea-9821-0281a26fb5d4`
- **Test Order Code:** `5ENLKKHD`

## TypeScript Interface

```typescript
interface GHNOrderDetailRequest {
  order_code: string;
}

interface GHNOrderDetailResponse {
  code: number;
  message: string;
  data: GHNOrder | null;
}

interface GHNOrder {
  shop_id: number;
  client_id: number;
  return_name: string;
  return_phone: string;
  return_address: string;
  return_ward_code: string;
  return_district_id: number;
  from_name: string;
  from_phone: string;
  from_address: string;
  from_ward_code: string;
  from_district_id: number;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  converted_weight: number;
  service_type_id: number;
  service_id: number;
  payment_type_id: number;
  cod_amount: number;
  insurance_value: number;
  order_value: number;
  client_order_code: string;
  required_note: string;
  content: string;
  note: string;
  pickup_time: string;
  order_code: string;
  status: string;
  pick_warehouse_id: number;
  deliver_warehouse_id: number;
  current_warehouse_id: number;
  return_warehouse_id: number;
  next_warehouse_id: number;
  leadtime: string;
  order_date: string;
  finish_date: string | null;
  items: { name: string; quantity: number; weight: number }[];
  log: { status: string; updated_date: string }[];
}
```