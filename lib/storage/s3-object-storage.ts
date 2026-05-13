import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ObjectStorageAdapter, PutObjectParams, PutObjectResult } from "@/lib/storage/object-storage";

export class S3ObjectStorage implements ObjectStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(region: string, bucket: string, endpoint?: string) {
    this.bucket = bucket;
    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {})
    });
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        ServerSideEncryption: params.serverSideEncryption ?? "AES256"
      })
    );
    const base = params.endpointUrl ?? `s3://${this.bucket}`;
    return { url: `${base.replace(/\/$/, "")}/${params.key}` };
  }
}
