import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Procurement (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let requisitionId: string;
  let rfqId: string;
  let purchaseOrderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const ctx = await registerAndLogin(app);
    token = ctx.token;
    userId = ctx.userId;
  });

  afterAll(async () => { await app.close(); });

  // --- Purchase Requisitions ---
  describe('Purchase Requisitions', () => {
    const requisition = () => ({
      requisition_number: `REQ-${Date.now()}`,
      requisition_date: new Date().toISOString().split('T')[0],
      requested_by: userId || 'system',
      department: 'Engineering',
      status: 'pending',
      priority: 'medium',
      required_by_date: '2026-06-01',
      purpose: 'Office supplies replenishment',
      items: [
        {
          product_name: 'Laptop Stand',
          quantity: 5,
          unit: 'pcs',
          estimated_price: 45.0,
          total_estimated: 225.0,
          specifications: 'Adjustable height',
        },
      ],
    });

    it('POST /api/procurement/requisitions — creates requisition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/procurement/requisitions')
        .set(authHeader(token))
        .send(requisition());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      requisitionId = res.body.id;
    });

    it('GET /api/procurement/requisitions — lists requisitions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/procurement/requisitions')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/procurement/requisitions/:id — returns single', async () => {
      if (!requisitionId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/procurement/requisitions/${requisitionId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(requisitionId);
    });

    it('GET /api/procurement/pending-approvals — returns approval queue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/procurement/pending-approvals')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/procurement/requisitions/:id/approve — approves requisition', async () => {
      if (!requisitionId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/procurement/requisitions/${requisitionId}/approve`)
        .set(authHeader(token))
        .send({ approved_by: userId || 'admin', notes: 'Approved for Q2' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- RFQs ---
  describe('RFQs', () => {
    it('GET /api/procurement/rfqs — lists RFQs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/procurement/rfqs')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/procurement/rfqs — creates RFQ', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/procurement/rfqs')
        .set(authHeader(token))
        .send({
          rfq_number: `RFQ-${Date.now()}`,
          rfq_date: new Date().toISOString().split('T')[0],
          deadline: '2026-05-15',
          notes: 'Please quote best price',
          ...(requisitionId ? { requisition_id: requisitionId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) rfqId = res.body.id;
    });
  });

  // --- Purchase Orders ---
  describe('Purchase Orders', () => {
    it('GET /api/procurement/purchase-orders — lists POs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/procurement/purchase-orders')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/procurement/purchase-orders — creates PO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/procurement/purchase-orders')
        .set(authHeader(token))
        .send({
          po_number: `PO-${Date.now()}`,
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery: '2026-05-20',
          status: 'draft',
          subtotal: 225.0,
          tax: 22.5,
          total: 247.5,
          items: [
            {
              product_name: 'Laptop Stand',
              quantity: 5,
              unit: 'pcs',
              unit_price: 45.0,
              total: 225.0,
            },
          ],
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) purchaseOrderId = res.body.id;
    });
  });

  // --- Goods Receipts ---
  describe('Goods Receipts', () => {
    it('GET /api/procurement/goods-receipts — lists receipts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/procurement/goods-receipts')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/procurement/goods-receipts — creates receipt', async () => {
      if (!purchaseOrderId) return;
      const res = await request(app.getHttpServer())
        .post('/api/procurement/goods-receipts')
        .set(authHeader(token))
        .send({
          receipt_number: `GR-${Date.now()}`,
          receipt_date: new Date().toISOString().split('T')[0],
          purchase_order_id: purchaseOrderId,
          status: 'pending',
          notes: 'All items received in good condition',
          items: [
            { product_name: 'Laptop Stand', quantity_received: 5, unit: 'pcs' },
          ],
        });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});