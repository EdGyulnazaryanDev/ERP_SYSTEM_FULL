import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Manufacturing (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let bomId: string;
  let workOrderId: string;
  let productionPlanId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  // --- Bills of Materials ---
  describe('Bills of Materials (BOMs)', () => {
    const bom = () => ({
      bom_number: `BOM-${Date.now()}`,
      product_name: `Finished Product ${Date.now()}`,
      product_code: `FP-${Date.now()}`,
      quantity: 1,
      unit: 'pcs',
      status: 'draft',
      version: '1.0',
      notes: 'Standard BOM for assembly',
      lines: [
        {
          component_name: 'Steel Frame',
          component_code: 'SF-001',
          quantity: 2,
          unit: 'pcs',
          unit_cost: 15.0,
          notes: 'Main structural component',
        },
        {
          component_name: 'Bolts M8',
          component_code: 'BM8-001',
          quantity: 8,
          unit: 'pcs',
          unit_cost: 0.5,
        },
      ],
    });

    it('POST /api/manufacturing/boms — creates BOM', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/manufacturing/boms')
        .set(authHeader(token))
        .send(bom());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      bomId = res.body.id;
    });

    it('GET /api/manufacturing/boms — lists BOMs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/manufacturing/boms')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/manufacturing/boms/:id — returns single BOM', async () => {
      if (!bomId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/manufacturing/boms/${bomId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(bomId);
    });

    it('PUT /api/manufacturing/boms/:id — updates BOM', async () => {
      if (!bomId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/manufacturing/boms/${bomId}`)
        .set(authHeader(token))
        .send({ notes: 'Updated notes', version: '1.1' });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('POST /api/manufacturing/boms/:id/approve — approves BOM', async () => {
      if (!bomId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/manufacturing/boms/${bomId}/approve`)
        .set(authHeader(token))
        .send({ approved_by: 'manager', notes: 'Approved for production' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Work Orders ---
  describe('Work Orders', () => {
    const workOrder = () => ({
      work_order_number: `WO-${Date.now()}`,
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: '2026-05-20',
      quantity: 10,
      status: 'draft',
      priority: 'medium',
      notes: 'Standard production run',
      ...(bomId ? { bom_id: bomId } : {}),
    });

    it('POST /api/manufacturing/work-orders — creates work order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/manufacturing/work-orders')
        .set(authHeader(token))
        .send(workOrder());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      workOrderId = res.body.id;
    });

    it('GET /api/manufacturing/work-orders — lists work orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/manufacturing/work-orders')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/manufacturing/work-orders/:id — returns single work order', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/manufacturing/work-orders/${workOrderId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(workOrderId);
    });

    it('PUT /api/manufacturing/work-orders/:id/release — releases work order', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .set(authHeader(token))
        .send({});
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('PUT /api/manufacturing/work-orders/:id/complete — completes work order', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/manufacturing/work-orders/${workOrderId}/complete`)
        .set(authHeader(token))
        .send({ actual_quantity: 10, notes: 'Completed on time' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Production Plans ---
  describe('Production Plans', () => {
    it('POST /api/manufacturing/production-plans — creates plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/manufacturing/production-plans')
        .set(authHeader(token))
        .send({
          plan_name: `Plan_${Date.now()}`,
          plan_period_start: '2026-05-01',
          plan_period_end: '2026-05-31',
          status: 'draft',
          notes: 'May production plan',
          lines: bomId
            ? [{ bom_id: bomId, planned_quantity: 50, unit: 'pcs' }]
            : [],
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) productionPlanId = res.body.id;
    });

    it('GET /api/manufacturing/production-plans — lists plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/manufacturing/production-plans')
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
