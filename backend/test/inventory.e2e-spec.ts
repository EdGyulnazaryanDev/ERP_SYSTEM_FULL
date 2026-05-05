import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let itemId: string;

  const item = () => ({
    product_name: `Widget_${Date.now()}`,
    sku: `SKU-${Date.now()}`,
    quantity: 100,
    reorder_point: 10,
    unit_cost: 5.5,
    unit_price: 12.0,
  });

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  describe('POST /api/inventory', () => {
    it('creates an inventory item', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set(authHeader(token))
        .send(item());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      itemId = res.body.id;
    });

    it('rejects item with missing product_name', async () => {
      const { product_name: _, ...noName } = item();
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set(authHeader(token))
        .send(noName);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('coerces string quantity to number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set(authHeader(token))
        .send({ ...item(), quantity: '50' });
      expect(res.status).toBeOneOf([200, 201]);
      expect(typeof res.body.quantity).toBe('number');
    });
  });

  describe('GET /api/inventory', () => {
    it('returns list of inventory items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/inventory/summary', () => {
    it('returns stock summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/summary')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('returns items below reorder point', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set(authHeader(token))
        .send({ ...item(), quantity: 2, reorder_point: 10 });
      const res = await request(app.getHttpServer())
        .get('/api/inventory/low-stock')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/inventory/:id', () => {
    it('returns item by ID', async () => {
      if (!itemId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/${itemId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(itemId);
    });
  });

  describe('PUT /api/inventory/:id', () => {
    it('updates inventory item', async () => {
      if (!itemId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/inventory/${itemId}`)
        .set(authHeader(token))
        .send({ quantity: 200 });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('deletes inventory item', async () => {
      if (!itemId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/inventory/${itemId}`)
        .set(authHeader(token));
      expect(res.status).toBeOneOf([200, 204]);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
