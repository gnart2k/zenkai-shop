<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## GHN Fulfillment Provider (Vietnam)

This backend registers a custom GHN fulfillment provider for calculated shipping options in Vietnam.

Set these environment variables before running checkout with GHN:

```bash
GHN_API_BASE_URL=https://online-gateway.ghn.vn/shiip/public-api
GHN_API_TOKEN=...
# or GHN_API_KEY=... (alias)
GHN_SHOP_ID=...
GHN_FROM_DISTRICT_ID=...
GHN_FROM_WARD_CODE=... # optional but recommended
GHN_SERVICE_DISCOVERY_DISTRICT_ID=... # optional
```

After updating env values, re-run seed so GHN shipping options are created:

```bash
pnpm seed
```

## MinIO Storage Setup

### Install MinIO and expose port 9001

Install MinIO and run it with the console and API ports bound to `9001` so the SDK can reach the service:

```bash
minio server /data --console-address :9001 --address :9001
```

### Create access credentials

1. Open the Admin Console and go to **User → Access Keys**.
2. Click **Create Access Keys** and then **Create** in the modal.
3. Copy both the access key ID and the secret key (the secret key is only shown once).

### Create a public bucket policy

1. Go to **Administrator → Buckets**, select the bucket you created, and open the **Summary** section.
2. Click the pencil icon next to **Access Policy**.
3. Select **Custom** and paste the policy below, replacing `{bucket_name}` with your bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "s3:GetObject"
      ],
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "*"
        ]
      },
      "Resource": [
        "arn:aws:s3:::{bucket_name}/*"
      ]
    }
  ]
}
```

You can edit the access policy anytime in the bucket **Summary** section.

### Register the S3 File Module

The File Module accepts a single provider. Add the official S3 provider in `medusa-config.ts`:

```ts
import { Modules } from "@medusajs/framework/utils"

module.exports = {
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // other options...
            },
          },
        ],
      },
    },
  ],
}
```

### Additional configuration for MinIO/Supabase

When targeting MinIO or Supabase, set `forcePathStyle` so the SDK does not assume AWS DNS-style buckets:

```ts
additional_client_config: {
  forcePathStyle: true,
},
```

### S3 File Module options

| Option | Description | Default |
| --- | --- | --- |
| `file_url` | Base URL used when generating uploads. For MinIO, it should point to the server plus the bucket (e.g. `http://localhost:9001/{bucket}`). | - |
| `access_key_id` | Access key ID of the S3-compatible user. | - |
| `secret_access_key` | Secret access key for the user. | - |
| `region` | Region of the bucket. Use `us-east-1` for MinIO, `auto` for Cloudflare. | - |
| `bucket` | Name of the bucket. | - |
| `endpoint` | URL of the S3-compatible API (e.g. `http://localhost:9001`). | - |
| `prefix` | Optional string prepended to every uploaded file. | - |
| `cache_control` | Cache control header for uploads (e.g. `public, max-age=31536000`). | `public, max-age=31536000` |
| `download_file_duration` | Expiry time for presigned download URLs in seconds. | `3600` |
| `additional_client_config` | Extra configuration forwarded to the AWS SDK (see [AWS SDK docs](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html) for the full list). | - |

Use these options to match your MinIO deployment before wiring them into the module provider.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Build with AI Agents

### Claude Code Plugin

If you use AI agents like Claude Code, check out the [medusa-dev Claude Code plugin](https://github.com/medusajs/medusa-claude-plugins).

### Other Agents

If you use AI agents other than Claude Code, copy the [skills directory](https://github.com/medusajs/medusa-claude-plugins/tree/main/plugins/medusa-dev/skills) into your agent's relevant `skills` directory.

### MCP Server

You can also add the MCP server `https://docs.medusajs.com/mcp` to your AI agents to answer questions related to Medusa. The `medusa-dev` Claude Code plugin includes this MCP server by default.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
