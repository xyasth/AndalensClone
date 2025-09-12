declare module "b2" {
  export interface B2UploadUrlResponse {
    data: {
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  export interface B2UploadResponse {
    data: {
      fileId: string;
      fileName: string;
      accountId: string;
      bucketId: string;
      contentLength: number;
      contentSha1: string;
      contentType: string;
      fileInfo: Record<string, string>;
      uploadTimestamp: number;
    };
  }

  export default class B2 {
    constructor(config: { applicationKeyId: string; applicationKey: string });

    authorize(): Promise<unknown>;

    getUploadUrl(params: { bucketId: string }): Promise<B2UploadUrlResponse>;

    uploadFile(params: {
      uploadUrl: string;
      uploadAuthToken: string;
      fileName: string;
      data: Buffer;
    }): Promise<B2UploadResponse>;
  }
}
