import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

export interface TestContext {
  app: INestApplication;
  http: ReturnType<typeof request>;
  token: string;
  tenantId: string;
  userId: string;
}

const TEST_COMPANY = `TestCo_${Date.now()}`;
const TEST_EMAIL = `admin_${Date.now()}@test.local`;
const TEST_PASSWORD = 'Test@123456';

export async function createTestApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

export async function registerAndLogin(app: INestApplication): Promise<{ token: string; tenantId: string; userId: string; email: string }> {
  const email = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`;

  const reg = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      companyName: `TestCo_${Date.now()}`,
      email,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'Admin',
    });

  if (reg.status !== 201 && reg.status !== 200) {
    throw new Error(`Registration failed: ${JSON.stringify(reg.body)}`);
  }

  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD, actorType: 'staff' });

  if (login.status !== 200 && login.status !== 201) {
    throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  }

  const { accessToken, user } = login.body;
  return {
    token: accessToken,
    tenantId: user?.tenantId ?? user?.tenant_id ?? '',
    userId: user?.id ?? '',
    email,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
