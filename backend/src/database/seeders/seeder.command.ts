import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ComprehensiveSeeder } from './comprehensive.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(ComprehensiveSeeder);

  // Get tenant ID from command line or use default
  const tenantId = process.argv[2] || 'default-tenant-id';

  console.log(`\n🌱 Running seeder for tenant: ${tenantId}\n`);

  try {
    await seeder.seed(tenantId);
    console.log('\n✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
