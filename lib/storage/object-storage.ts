export type PutObjectParams = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  serverSideEncryption?: "AES256" | "aws:kms";
  /** Optional public or custom endpoint for returned URL */
  endpointUrl?: string;
};

export type PutObjectResult = {
  url: string;
};

export interface ObjectStorageAdapter {
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
}
