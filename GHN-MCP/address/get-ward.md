# GHN Get Ward API

Get list of wards within a district.

## Endpoint

```
POST /shiip/public-api/master-data/ward?district_id={district_id}
```

Or:

```
POST /shiip/public-api/master-data/ward
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
  "district_id": 1566
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `district_id` | number | Yes | District ID from Get District API |

## cURL Example

```bash
curl --location --request POST 'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward' \
  --header 'token: 637170d5-942b-11ea-9821-0281a26fb5d4' \
  --header 'Content-Type: application/json' \
  --data-raw '{"district_id": 1566}'
```

## Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "WardCode": 510101,
      "DistrictID": 1566,
      "WardName": "Phường Mỹ Bình"
    },
    {
      "WardCode": 510102,
      "DistrictID": 1566,
      "WardName": "Phường Mỹ Long"
    }
  ]
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `WardCode` | Ward Code |
| `DistrictID` | District ID |
| `WardName` | Ward Name |
| `NameExtension` | Extension Name |
| `CanUpdateCOD` | Can Update COD (true/false) |
| `SupportType` | Support Type (0: Lock, 1: Take/Pay, 2: Deliver, 3: Take/Deliver/Pay) |
| `Status` | Status (1: Unlock, 2: Lock) |
| `CreatedDate` | Created Date |
| `UpdatedDate` | Updated Date |

## Error Response

```json
{
  "code": 404,
  "message": "code=404, message=Not Found",
  "data": null
}
```

## Test Credentials

- **Token:** `637170d5-942b-11ea-9821-0281a26fb5d4`
- **District ID:** `1566`

## TypeScript Interface

```typescript
interface GHNWard {
  WardCode: number;
  DistrictID: number;
  WardName: string;
  NameExtension?: string[];
  CanUpdateCOD?: boolean;
  SupportType?: 0 | 1 | 2 | 3;
  Status?: 1 | 2;
  CreatedDate?: string;
  UpdatedDate?: string;
}

interface GHNGetWardRequest {
  district_id: number;
}

interface GHNGetWardResponse {
  code: number;
  message: string;
  data: GHNWard[];
}
```