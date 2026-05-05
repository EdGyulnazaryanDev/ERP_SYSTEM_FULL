import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Warehouse (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let warehouseId: string;
  let binId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  describe('Warehouses', () => {
    const warehouse = () => ({
      name: `Warehouse_${Date.now()}`,
      code: `WH-${Date.now()}`,
      address: '123 Storage Lane',
      city: 'Stockton',
      country: 'USA',
      is_active: true,
      capacity: 10000,
    });

    it('POST /api/warehouse — creates warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/warehouse')
        .set(authHeader(token))
        .send(warehouse());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      warehouseId = res.body.id;
    });

    it('GET /api/warehouse — lists warehouses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/warehouse')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/warehouse/:id — returns single warehouse', async () => {
      if (!warehouseId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/warehouse/${warehouseId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(warehouseId);
    });

    it('PUT /api/warehouse/:id — updates warehouse', async () => {
      if (!warehouseId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/warehouse/${warehouseId}`)
        .set(authHeader(token))
        .send({ name: 'Updated Warehouse Name' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  describe('Bins', () => {
    it('POST /api/warehouse/bins — creates bin in warehouse', async () => {
      if (!warehouseId) return;
      const res = await request(app.getHttpServer())
        .post('/api/warehouse/bins')
        .set(authHeader(token))
        .send({
          bin_code: `BIN-${Date.now()}`,
          bin_name: 'Aisle A Shelf 1',
          warehouse_id: warehouseId,
          capacity: 500,
          bin_type: 'storage',
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) binId = res.body.id;
    });

    it('GET /api/warehouse/bins — lists bins', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/warehouse/bins')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  describe('Stock Movements', () => {
    it('POST /api/warehouse/stock-movements — records stock-in movement', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/warehouse/stock-movements')
        .set(authHeader(token))
        .send({
          movement_type: 'stock_in',
          quantity: 50,
          reference: `MOV-${Date.now()}`,
          notes: 'Initial stock receipt',
          movement_date: new Date().toISOString(),
          ...(warehouseId ? { warehouse_id: warehouseId } : {}),
          ...(binId ? { bin_id: binId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('GET /api/warehouse/stock-movements — lists movements', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/warehouse/stock-movements')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/warehouse/:id', () => {
    it('deletes warehouse', async () => {
      if (!warehouseId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/warehouse/${warehouseId}`)
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
