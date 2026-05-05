import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin } from './helpers/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `auth_test_${Date.now()}@test.local`;
  const password = 'Test@123456';

  describe('POST /api/auth/register', () => {
    it('registers a new company and admin user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          companyName: `AuthTestCo_${Date.now()}`,
          email,
          password,
          confirmPassword: password,
          firstName: 'Auth',
          lastName: 'Test',
        });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('rejects registration with mismatched passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          companyName: 'MismatchCo',
          email: `mismatch_${Date.now()}@test.local`,
          password: 'Test@123456',
          confirmPassword: 'WrongPassword',
          firstName: 'A',
          lastName: 'B',
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects duplicate email registration', async () => {
      const dupEmail = `dup_${Date.now()}@test.local`;
      await request(app.getHttpServer()).post('/api/auth/register').send({
        companyName: 'DupCo1',
        email: dupEmail,
        password,
        confirmPassword: password,
        firstName: 'A',
        lastName: 'B',
      });
      const res = await request(app.getHttpServer()).post('/api/auth/register').send({
        companyName: 'DupCo2',
        email: dupEmail,
        password,
        confirmPassword: password,
        firstName: 'A',
        lastName: 'B',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password, actorType: 'staff' });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('rejects wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword', actorType: 'staff' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.local', password, actorType: 'staff' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password, actorType: 'staff' });
      token = res.body.accessToken;
    });

    it('returns current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
    });

    it('rejects request without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBeOneOf([401, 403]);
    });

    it('rejects request with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBeOneOf([401, 403]);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password, actorType: 'staff' });
      refreshToken = res.body.refreshToken;
    });

    it('returns new access token with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'bad-token' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out successfully', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password, actorType: 'staff' });
      const token = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBeOneOf([200, 201]);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    const pass = items.includes(received);
    return {
      message: () => `expected ${received} to be one of ${items.join(', ')}`,
      pass,
    };
  },
});
