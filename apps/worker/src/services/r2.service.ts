/**
 * r2.service.ts — Cloudflare R2 (S3-compatible) client.
 *
 * Security: presigned URL TTL is capped at 300 seconds (5 min) per
 * security rules to limit exposure window for artifact links.
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

// ---------------------------------------------------------------------------
// R2Service
// ---------------------------------------------------------------------------

export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: process.env["R2_ENDPOINT"]!,
      credentials: {
        accessKeyId: process.env["R2_ACCESS_KEY_ID"]!,
        secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"]!,
      },
    });
    this.bucket = process.env["R2_BUCKET"]!;
  }

  /** Upload a local file to R2 at the given key. */
  async upload(key: string, filePath: string, contentType: string): Promise<void> {
    const { size } = await stat(filePath);
    const stream = createReadStream(filePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        ContentLength: size,
      }),
    );
  }

  /**
   * Check if an object exists at the given key.
   * Uses HeadObject which is cheaper than GetObject.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a presigned GET URL for the given key.
   *
   * TTL is capped at 300 seconds (5 min) per security rules.
   * Never pass a larger value — presigned URLs are ephemeral access grants.
   */
  async presign(key: string, expiresIn = 300): Promise<string> {
    const cappedTtl = Math.min(expiresIn, 300);
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: cappedTtl });
  }
}
