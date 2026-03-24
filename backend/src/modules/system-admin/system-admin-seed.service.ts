import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SystemAdmin } from './entities/system-admin.entity';

@Injectable()
export class SystemAdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(SystemAdminSeedService.name);

  constructor(
    @InjectRepository(SystemAdmin)
    private readonly systemAdminRepo: Repository<SystemAdmin>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSystemAdmin();
  }

  async seedSystemAdmin() {
    const email =
      this.configService.get<string>('SYSTEM_ADMIN_EMAIL') ??
      'admin@platform.local';
    const password =
      this.configService.get<string>('SYSTEM_ADMIN_PASSWORD') ?? 'Admin@123456';

    const existing = await this.systemAdminRepo.findOne({ where: { email } });
    if (existing) return;

    const hashed = await bcrypt.hash(password, 10);
    await this.systemAdminRepo.save(
      this.systemAdminRepo.create({ email, password: hashed, isActive: true }),
    );

    this.logger.log(`Platform Super Admin seeded: ${email}`);
  }
}
