import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../../common/guards/system-admin.guard';
import { GlobalSetting } from '../entities/global-setting.entity';

const ALLOWED_KEYS = new Set([
  'platform_name',
  'support_email',
  'max_tenants',
  'maintenance_mode',
  'default_plan',
  'registration_enabled',
]);

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminSettingsController {
  constructor(
    @InjectRepository(GlobalSetting)
    private readonly settingsRepo: Repository<GlobalSetting>,
  ) {}

  @Get()
  async getAll() {
    const rows = await this.settingsRepo.find();
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  @Patch()
  async update(@Body() body: Record<string, string>) {
    const toSave: GlobalSetting[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      const existing = await this.settingsRepo.findOne({ where: { key } });
      if (existing) {
        existing.value = String(value);
        toSave.push(existing);
      } else {
        toSave.push(this.settingsRepo.create({ key, value: String(value) }));
      }
    }

    if (toSave.length > 0) await this.settingsRepo.save(toSave);

    const rows = await this.settingsRepo.find();
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }
}
