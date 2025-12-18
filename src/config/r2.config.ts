// src/config/r2.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucket: process.env.CLOUDFLARE_R2_BUCKET,
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, ''),
}));