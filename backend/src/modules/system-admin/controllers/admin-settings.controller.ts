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
  // Theme
  'theme_primary_color',
  'theme_logo_url',
  'theme_dark_mode',
  // Notifications
  'notify_new_tenant',
  'notify_plan_change',
  'notify_email',
  // Footer
  'footer_text',
  'footer_links',
  'footer_show_powered_by',
]);

// Keys that are safe to expose publicly (no auth needed)
const PUBLIC_KEYS = new Set([
  'platform_name',
  'theme_primary_color',
  'theme_logo_url',
  'theme_dark_mode',
  'footer_text',
  'footer_links',
  'footer_show_powered_by',
]);

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    @InjectRepository(GlobalSetting)
    private readonly settingsRepo: Repository<GlobalSetting>,
  ) {}

  /** Public endpoint — no auth required, returns only safe display settings */
  @Get('public')
  async getPublic() {
    const rows = await this.settingsRepo.find();
    return rows
      .filter((r) => PUBLIC_KEYS.has(r.key))
      .reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
  }

  @Get()
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async getAll() {
    const rows = await this.settingsRepo.find();
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  @Patch()
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
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
