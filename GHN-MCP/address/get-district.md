# GHN Get District API

Get list of districts within a province.

## Endpoint

```
GET /shiip/public-api/master-data/district
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
  "province_id": 201
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `province_id` | number | Yes | Province ID from Get Province API |

## cURL Example

```bash
curl --location --request GET 'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district' \
  --header 'token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "province_id": 201
  }'
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

## Response Fields

| Field | Description |
|-------|-------------|
| `DistrictID` | District ID |
| `ProvinceID` | Province ID |
| `DistrictName` | District Name |
| `Code` | District Code |
| `Type` | Type |
| `SupportType` | Support Type (0: Lock, 1: Take/Pay, 2: Deliver, 3: Take/Deliver/Pay) |
| `NameExtension` | Extension Name |
| `CanUpdateCOD` | Can Update COD (true/false) |
| `Status` | Status (1: Unlock, 2: Lock) |
| `CreatedDate` | Created Date |
| `UpdatedDate` | Updated Date |

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
- **Province ID:** `201`

## TypeScript Interface

```typescript
interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
  Type?: number;
  SupportType?: 0 | 1 | 2 | 3;
  NameExtension?: string[];
  CanUpdateCOD?: boolean;
  Status?: 1 | 2;
  CreatedDate?: string;
  UpdatedDate?: string;
}

interface GHNGetDistrictRequest {
  province_id: number;
}

interface GHNGetDistrictResponse {
  code: number;
  message: string;
  data: GHNDistrict[];
}
```