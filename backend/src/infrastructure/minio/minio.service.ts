import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Minio = require('minio');

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: any;
  private readonly bucket = 'uploads';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'minio'),
      port: parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', ''),
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        // Make bucket publicly readable
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          }],
        });
        await this.client.setBucketPolicy(this.bucket, policy);
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (err) {
      this.logger.warn(`MinIO bucket init failed: ${err.message}`);
    }
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = this.config.get<string>('MINIO_PORT', '9000');
    const ssl = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = ssl ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${this.bucket}/${objectName}`;
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch {
      // ignore if not found
    }
  }
}
