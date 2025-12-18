import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CloudflareR2Service {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.get('r2.accountId')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get('r2.accessKeyId')!,
        secretAccessKey: this.configService.get('r2.secretAccessKey')!,
      },
    });

    this.bucket = this.configService.get('r2.bucket')!;
    this.publicUrl = this.configService.get('r2.publicUrl')!;
  }

  async uploadAvatar(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 5MB)');
    }

    const ext = file.originalname.split('.').pop();
    const key = `avatars/${uuidv4()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    return {
      url: `${this.publicUrl}/${key}`,
      key,
    };
  }

  async deleteFile(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}