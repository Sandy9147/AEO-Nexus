import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageConfigStatusDto, PresignedUploadResponseDto } from '@aeo-nexus/contracts';

@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET || process.env.R2_BUCKET || '';
  private readonly accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
  private readonly secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
  private readonly region = process.env.AWS_REGION || 'us-east-1';
  private readonly endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '';

  getStorageStatus(): StorageConfigStatusDto {
    const isConfigured = Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
    const provider = isConfigured
      ? this.endpoint.includes('r2.cloudflarestorage.com')
        ? 'r2'
        : 's3'
      : 'unconfigured';

    return {
      isConfigured,
      provider,
      bucket: isConfigured ? this.bucket : undefined,
      region: isConfigured ? this.region : undefined,
      warning: isConfigured
        ? undefined
        : 'Object storage (S3/Cloudflare R2) is not configured. File uploads are disabled until S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are set.',
    };
  }

  getDownloadUrl(storageKey: string): string {
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${storageKey}`;
    }
    if (this.bucket) {
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
    }
    return `/api/assets/download/${storageKey}`;
  }

  generatePresignedUpload(
    workspaceId: string,
    filename: string,
    contentType: string,
    folderId?: string | null,
  ): PresignedUploadResponseDto {
    const status = this.getStorageStatus();
    if (!status.isConfigured) {
      throw new BadRequestException(
        'Object storage is not configured. File uploads are disabled on this instance.',
      );
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folderPrefix = folderId ? `${folderId}/` : '';
    const key = `workspaces/${workspaceId}/${folderPrefix}${Date.now()}-${sanitizedFilename}`;

    const host = this.endpoint
      ? new URL(this.endpoint).host
      : `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const protocol = this.endpoint ? new URL(this.endpoint).protocol : 'https:';

    const expiresInSeconds = 900;
    const uploadUrl = `${protocol}//${host}/${key}?X-Amz-Expires=${expiresInSeconds}`;
    const downloadUrl = this.getDownloadUrl(key);

    return {
      uploadUrl,
      downloadUrl,
      key,
      expiresInSeconds,
      method: 'PUT',
    };
  }
}
