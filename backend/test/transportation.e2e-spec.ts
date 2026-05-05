import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Transportation (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let courierId: string;
  let shipmentId: string;
  let trackingNumber: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  // --- Couriers ---
  describe('Couriers', () => {
    it('POST /api/transportation/couriers — creates courier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transportation/couriers')
        .set(authHeader(token))
        .send({
          name: `FastShip_${Date.now()}`,
          code: `FS-${Date.now()}`,
          contact_email: `courier_${Date.now()}@fastship.com`,
          contact_phone: '+1-555-0300',
          is_active: true,
          service_types: ['standard', 'express'],
        });
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      courierId = res.body.id;
    });

    it('GET /api/transportation/couriers — lists couriers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transportation/couriers')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/transportation/couriers/:id — returns single courier', async () => {
      if (!courierId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/transportation/couriers/${courierId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(courierId);
    });
  });

  // --- Shipments ---
  describe('Shipments', () => {
    const shipment = () => ({
      priority: 'normal',
      origin_name: 'Warehouse A',
      origin_address: '100 Industrial Rd',
      origin_city: 'Chicago',
      origin_postal_code: '60601',
      origin_phone: '+1-555-0100',
      destination_name: 'Customer Corp',
      destination_address: '200 Business Ave',
      destination_city: 'New York',
      destination_postal_code: '10001',
      destination_phone: '+1-555-0200',
      weight: 2.5,
      weight_unit: 'kg',
      package_count: 1,
      package_type: 'box',
      pickup_date: new Date().toISOString().split('T')[0],
      estimated_delivery_date: '2026-05-10',
      shipping_cost: 25.0,
      requires_signature: false,
      is_fragile: false,
      is_insured: false,
      ...(courierId ? { courier_id: courierId } : {}),
      items: [
        { description: 'Electronics', quantity: 1, weight: 2.5, value: 500 },
      ],
    });

    it('POST /api/transportation/shipments — creates shipment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transportation/shipments')
        .set(authHeader(token))
        .send(shipment());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      shipmentId = res.body.id;
      trackingNumber = res.body.tracking_number;
    });

    it('GET /api/transportation/shipments — lists shipments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transportation/shipments')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/transportation/shipments?status=pending — filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transportation/shipments?status=pending')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/transportation/shipments/pending-count — returns pending count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transportation/shipments/pending-count')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/transportation/shipments/:id — returns single shipment', async () => {
      if (!shipmentId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/transportation/shipments/${shipmentId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(shipmentId);
    });

    it('PUT /api/transportation/shipments/:id/status — updates shipment status', async () => {
      if (!shipmentId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/transportation/shipments/${shipmentId}/status`)
        .set(authHeader(token))
        .send({ status: 'picked_up', notes: 'Picked up by courier' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Public Tracking ---
  describe('Public Tracking', () => {
    it('GET /api/transportation/shipments/track/:trackingNumber — returns tracking info (public)', async () => {
      if (!trackingNumber) return;
      const res = await request(app.getHttpServer())
        .get(`/api/transportation/shipments/track/${trackingNumber}`);
      expect(res.status).toBeOneOf([200, 404]);
    });
  });

  // --- Delivery Routes ---
  describe('Delivery Routes', () => {
    it('POST /api/transportation/routes — creates delivery route', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transportation/routes')
        .set(authHeader(token))
        .send({
          route_name: `Route_${Date.now()}`,
          route_date: new Date().toISOString().split('T')[0],
          status: 'planned',
          ...(courierId ? { courier_id: courierId } : {}),
          ...(shipmentId ? { shipment_ids: [shipmentId] } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('GET /api/transportation/routes — lists routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transportation/routes')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
