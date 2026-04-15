# GHN Get Province API

Get list of all provinces supported by GHN.

## Endpoint

```
GET /shiip/public-api/master-data/province
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

**Body:** None required

## cURL Example

```bash
curl --location --request GET 'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province' \
  --header 'Content-Type: application/json' \
  --header 'Token: d6e3dccb-6289-11ea-8b85-c60e4edfe802'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    { "ProvinceID": 201, "ProvinceName": "Hà Nội", "Code": "4" },
    { "ProvinceID": 202, "ProvinceName": "Hồ Chí Minh", "Code": "8" },
    { "ProvinceID": 203, "ProvinceName": "Đà Nẵng", "Code": "511" },
    { "ProvinceID": 204, "ProvinceName": "Đồng Nai", "Code": "61" }
  ]
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `ProvinceID` | Province ID |
| `ProvinceName` | Province Name |
| `Code` | Province Code |
| `NameExtension` | Extension Name |
| `CanUpdateCOD` | Can Update COD (true/false) |
| `Status` | Status (1: Unlock, 2: Lock) |
| `CreatedAt` | Created Date |
| `UpdatedAt` | Updated Date |

## Error Response

```json
{
  "code": 401,
  "message": "code=401, message=Token is not valid!",
  "data": null
}
```

## TypeScript Interface

```typescript
interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
  NameExtension?: string[];
  CanUpdateCOD?: boolean;
  Status?: 1 | 2;
  CreatedAt?: string;
  UpdatedAt?: string;
}

interface GHNGetProvinceResponse {
  code: number;
  message: string;
  data: GHNProvince[];
}
```