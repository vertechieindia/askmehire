import { getServerEnv } from "@/lib/config/env";
import { S3ObjectStorage } from "@/lib/storage/s3-object-storage";
import type { ObjectStorageAdapter } from "@/lib/storage/object-storage";
import { AppError } from "@/lib/http/api-errors";

let cached: ObjectStorageAdapter | null = null;

export function getObjectStorage(): ObjectStorageAdapter {
  if (cached) {
    return cached;
  }
  const env = getServerEnv();
  if (!env.AWS_REGION || !env.S3_BUCKET) {
    throw new AppError(
      "STORAGE_CONFIG",
      "Object storage is not configured (AWS_REGION and S3_BUCKET required to upload).",
      503
    );
  }
  cached = new S3ObjectStorage(env.AWS_REGION, env.S3_BUCKET, env.S3_ENDPOINT);
  return cached;
}

export function resetObjectStorageCache() {
  cached = null;
}
