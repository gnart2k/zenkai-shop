import { loadEnv, defineConfig } from '@medusajs/framework/utils';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const s3Endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
const s3Bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET;
const normalizedS3Endpoint = s3Endpoint
  ? /^https?:\/\//i.test(s3Endpoint)
    ? s3Endpoint
    : `http://${s3Endpoint}`
  : undefined;
const defaultS3FileUrl =
  normalizedS3Endpoint && s3Bucket
    ? `${normalizedS3Endpoint.replace(/\/$/, '')}/${s3Bucket}`
    : undefined;

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
      // Auth tokens (portal admins and collaborators, storefront customers) last 7 days instead
      // of Medusa's 1-day default. The portal refreshes them while in use (see the storefront
      // middleware), so the real limit is 7 days of inactivity. Override with JWT_EXPIRES_IN.
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      // Portal actors sign in at /auth/{actor}/emailpass, separate from Medusa admins.
      authMethodsPerActor: {
        user: ['emailpass'],
        customer: ['emailpass'],
        collaborator: ['emailpass'],
        portal_admin: ['emailpass'],
      },
    },
  },
  modules: [
    {
      resolve: './src/modules/product-media',
    },
    {
      resolve: './src/modules/portal',
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payos",
            id: "payos",
            options: {
              client_id: process.env.PAYOS_CLIENT_ID,
              api_key: process.env.PAYOS_API_KEY,
              checksum_key: process.env.PAYOS_CHECKSUM_KEY,
              return_url: process.env.PAYOS_RETURN_URL,
              cancel_url: process.env.PAYOS_CANCEL_URL,
            },
          },
        ],
      },
    },
    {
      resolve: '@medusajs/medusa/fulfillment',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/fulfillment-manual',
            id: 'manual',
          },
          {
            resolve: './src/modules/ghn-fulfillment',
            id: 'ghn',
            options: {
              api_base_url: process.env.GHN_API_BASE_URL,
              api_token: process.env.GHN_API_TOKEN || process.env.GHN_API_KEY,
              shop_id: process.env.GHN_SHOP_ID || process.env.GHN_SHOPID,
              from_district_id:
                process.env.GHN_FROM_DISTRICT_ID || process.env.GHN_FROM_DISTRICT,
              from_ward_code: process.env.GHN_FROM_WARD_CODE,
              service_discovery_district_id:
                process.env.GHN_SERVICE_DISCOVERY_DISTRICT_ID,
            },
          },
        ],
      },
    },
    {
      resolve: '@medusajs/medusa/file',
      options: {
        develop: {
          open: true,
          port: 4300,
          host: 'localhost',
          logLevel: 'error',
          stats: 'normal',
          allowedHosts: 'auto',
          webSocketURL: undefined,
        },
        providers: [
          {
            resolve: '@medusajs/medusa/file-s3',
            id: 's3',
            options: {
              file_url: process.env.S3_FILE_URL || defaultS3FileUrl,
              access_key_id: process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY,
              region: process.env.S3_REGION || 'us-east-1',
              bucket: s3Bucket,
              endpoint: normalizedS3Endpoint,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
  ],
});
