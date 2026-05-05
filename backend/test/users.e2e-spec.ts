import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let createdUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const ctx = await registerAndLogin(app);
    token = ctx.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(token))
        .send({
          email: `newuser_${Date.now()}@test.local`,
          password: 'Test@123456',
          first_name: 'Jane',
          last_name: 'Doe',
          is_active: true,
        });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      expect(res.body.first_name).toBe('Jane');
      createdUserId = res.body.id;
    });

    it('rejects user creation without email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(token))
        .send({ first_name: 'NoEmail', last_name: 'User' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects duplicate email', async () => {
      const email = `dup_user_${Date.now()}@test.local`;
      await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(token))
        .send({ email, password: 'Test@123456', first_name: 'A', last_name: 'B', is_active: true });
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(authHeader(token))
        .send({ email, password: 'Test@123456', first_name: 'C', last_name: 'D', is_active: true });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/users', () => {
    it('returns paginated user list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app.getHttpServer()).get('/api/users');
      expect(res.status).toBeOneOf([401, 403]);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns single user by ID', async () => {
      if (!createdUserId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/users/${createdUserId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdUserId);
    });

    it('returns 404 for unknown ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set(authHeader(token));
      expect(res.status).toBeOneOf([404, 400]);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('updates user fields', async () => {
      if (!createdUserId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/users/${createdUserId}`)
        .set(authHeader(token))
        .send({ first_name: 'Updated' });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body.first_name).toBe('Updated');
    });
  });

  describe('GET /api/users/me', () => {
    it('returns authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email');
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
