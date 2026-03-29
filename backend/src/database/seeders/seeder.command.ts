import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ComprehensiveSeeder } from './comprehensive.seeder';
import { WorkflowSeeder } from './workflow.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(ComprehensiveSeeder);
  const workflowSeeder = app.get(WorkflowSeeder);

  // Get tenant ID from command line or use default
  // Pass --workflow-only to skip the comprehensive seeder
  const args = process.argv.slice(2);
  const tenantId = args.find((a) => !a.startsWith('--')) || 'default-tenant-id';
  const workflowOnly = args.includes('--workflow-only');

  console.log(`\n🌱 Running seeder for tenant: ${tenantId}\n`);

  try {
    if (!workflowOnly) {
      await seeder.seed(tenantId);
    }
    await workflowSeeder.seed(tenantId);
    console.log('\n✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
