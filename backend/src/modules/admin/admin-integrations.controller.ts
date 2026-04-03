import { Controller, Get, Patch, Param, Body } from '@nestjs/common';

@Controller('admin/integrations')
export class AdminIntegrationsController {
  private integrations = [
    { key: 'slack', enabled: true },
    { key: 'trello', enabled: true },
    { key: 'jira', enabled: false },
    { key: 'github', enabled: false },
    { key: 'stripe', enabled: false },
    { key: 'google', enabled: false },
    { key: 'microsoft', enabled: false },
    { key: 'quickbooks', enabled: false },
    { key: 'teams', enabled: false },
    { key: 'dropbox', enabled: false },
  ];

  @Get()
  async getAllIntegrations() {
    return this.integrations;
  }

  @Patch(':key')
  async toggleIntegration(@Param('key') key: string, @Body() body: { enabled: boolean }) {
    const integration = this.integrations.find(i => i.key === key);
    if (integration) {
      integration.enabled = body.enabled;
    }
    return { key, enabled: body.enabled };
  }
}
