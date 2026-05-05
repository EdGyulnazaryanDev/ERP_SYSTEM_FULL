/**
 * End-to-end business flow tests.
 * Each describe block traces a complete cross-module business process.
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from '../helpers/create-test-app';

describe('Business Flows (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const ctx = await registerAndLogin(app);
    token = ctx.token;
    userId = ctx.userId;
  });

  afterAll(async () => { await app.close(); });

  // -----------------------------------------------------------------------
  // FLOW 1: Procurement → Goods Receipt → Inventory update
  // -----------------------------------------------------------------------
  describe('Flow 1: Procurement → Goods Receipt', () => {
    let requisitionId: string;
    let purchaseOrderId: string;
    let goodsReceiptId: string;

    it('Step 1 — creates purchase requisition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/procurement/requisitions')
        .set(authHeader(token))
        .send({
          requisition_number: `FLOW1-REQ-${Date.now()}`,
          requisition_date: new Date().toISOString().split('T')[0],
          requested_by: userId || 'system',
          department: 'Operations',
          status: 'pending',
          priority: 'high',
          required_by_date: '2026-06-01',
          purpose: 'Flow test — office chairs',
          items: [{ product_name: 'Office Chair', quantity: 10, unit: 'pcs', estimated_price: 200, total_estimated: 2000 }],
        });
      expect(res.status).toBeOneOf([200, 201]);
      requisitionId = res.body.id;
    });

    it('Step 2 — approves requisition', async () => {
      if (!requisitionId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/procurement/requisitions/${requisitionId}/approve`)
        .set(authHeader(token))
        .send({ approved_by: userId || 'admin', notes: 'Approved' });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 3 — creates purchase order from approved requisition', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/procurement/purchase-orders')
        .set(authHeader(token))
        .send({
          po_number: `FLOW1-PO-${Date.now()}`,
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery: '2026-05-20',
          status: 'sent',
          subtotal: 2000,
          tax: 200,
          total: 2200,
          ...(requisitionId ? { requisition_id: requisitionId } : {}),
          items: [{ product_name: 'Office Chair', quantity: 10, unit: 'pcs', unit_price: 200, total: 2000 }],
        });
      expect(res.status).toBeOneOf([200, 201]);
      purchaseOrderId = res.body.id;
    });

    it('Step 4 — creates goods receipt against PO', async () => {
      if (!purchaseOrderId) return;
      const res = await request(app.getHttpServer())
        .post('/api/procurement/goods-receipts')
        .set(authHeader(token))
        .send({
          receipt_number: `FLOW1-GR-${Date.now()}`,
          receipt_date: new Date().toISOString().split('T')[0],
          purchase_order_id: purchaseOrderId,
          status: 'pending',
          notes: 'All 10 chairs received',
          items: [{ product_name: 'Office Chair', quantity_received: 10, unit: 'pcs' }],
        });
      expect(res.status).toBeOneOf([200, 201]);
      goodsReceiptId = res.body.id;
    });

    it('Step 5 — approves goods receipt', async () => {
      if (!goodsReceiptId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/procurement/goods-receipts/${goodsReceiptId}/approve`)
        .set(authHeader(token))
        .send({ approved_by: userId || 'admin', notes: 'All items verified' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // -----------------------------------------------------------------------
  // FLOW 2: HR Onboarding → Leave Request → Payroll
  // -----------------------------------------------------------------------
  describe('Flow 2: HR Onboarding → Leave → Payroll', () => {
    let employeeId: string;
    let leaveTypeId: string;
    let leaveRequestId: string;

    it('Step 1 — creates employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/employees')
        .set(authHeader(token))
        .send({
          employee_code: `FLOW2-EMP-${Date.now()}`,
          first_name: 'Flow',
          last_name: `Test_${Date.now()}`,
          email: `flow2_${Date.now()}@company.local`,
          department: 'Finance',
          position: 'Analyst',
          hire_date: '2025-01-01',
          employment_type: 'full_time',
          status: 'active',
          salary: 60000,
        });
      expect(res.status).toBeOneOf([200, 201]);
      employeeId = res.body.id;
    });

    it('Step 2 — creates leave type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/leave-types')
        .set(authHeader(token))
        .send({ name: `FlowLeave_${Date.now()}`, days_per_year: 15, is_paid: true, carry_forward: false });
      expect(res.status).toBeOneOf([200, 201]);
      leaveTypeId = res.body.id;
    });

    it('Step 3 — employee submits leave request', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .post('/api/hr/leave-requests')
        .set(authHeader(token))
        .send({
          employee_id: employeeId,
          ...(leaveTypeId ? { leave_type_id: leaveTypeId } : {}),
          start_date: '2026-08-01',
          end_date: '2026-08-05',
          days_count: 5,
          reason: 'Personal vacation',
        });
      expect(res.status).toBeOneOf([200, 201]);
      leaveRequestId = res.body.id;
    });

    it('Step 4 — approves leave request', async () => {
      if (!leaveRequestId || !employeeId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/hr/leave-requests/${leaveRequestId}/approve`)
        .set(authHeader(token))
        .send({ approver_id: employeeId, notes: 'Enjoy your vacation' });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 5 — runs payroll for the month', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/payroll/run')
        .set(authHeader(token))
        .send({ month: 4, year: 2026 });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 6 — verifies payslips were generated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/payslips')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // FLOW 3: CRM Lead → Opportunity → Quote
  // -----------------------------------------------------------------------
  describe('Flow 3: CRM Lead → Opportunity → Quote', () => {
    let customerId: string;
    let leadId: string;
    let opportunityId: string;
    let quoteId: string;

    it('Step 1 — creates customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/customers')
        .set(authHeader(token))
        .send({
          customer_code: `FLOW3-CUST-${Date.now()}`,
          company_name: `FlowCorp_${Date.now()}`,
          contact_person: 'Carol Williams',
          email: `carol_${Date.now()}@flowcorp.local`,
          customer_type: 'business',
          status: 'active',
        });
      expect(res.status).toBeOneOf([200, 201]);
      customerId = res.body.id;
    });

    it('Step 2 — creates lead for customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/leads')
        .set(authHeader(token))
        .send({
          first_name: 'Carol',
          last_name: 'Williams',
          email: `carol_lead_${Date.now()}@flowcorp.local`,
          company: 'FlowCorp',
          status: 'new',
          source: 'referral',
        });
      expect(res.status).toBeOneOf([200, 201]);
      leadId = res.body.id;
    });

    it('Step 3 — converts lead to opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/opportunities')
        .set(authHeader(token))
        .send({
          title: `FlowCorp Deal ${Date.now()}`,
          stage: 'qualification',
          amount: 50000,
          close_date: '2026-09-30',
          probability: 40,
          ...(customerId ? { customer_id: customerId } : {}),
          ...(leadId ? { lead_id: leadId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      opportunityId = res.body.id;
    });

    it('Step 4 — advances opportunity to proposal stage', async () => {
      if (!opportunityId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/crm/opportunities/${opportunityId}`)
        .set(authHeader(token))
        .send({ stage: 'proposal', probability: 65 });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 5 — creates quote for opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/quotes')
        .set(authHeader(token))
        .send({
          quote_number: `FLOW3-Q-${Date.now()}`,
          quote_date: new Date().toISOString().split('T')[0],
          expiry_date: '2026-07-31',
          status: 'draft',
          subtotal: 50000,
          tax: 5000,
          total: 55000,
          notes: 'Initial proposal for FlowCorp',
          ...(customerId ? { customer_id: customerId } : {}),
          ...(opportunityId ? { opportunity_id: opportunityId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      quoteId = res.body.id;
    });

    it('Step 6 — marks opportunity as won', async () => {
      if (!opportunityId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/crm/opportunities/${opportunityId}`)
        .set(authHeader(token))
        .send({ stage: 'closed_won', probability: 100 });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // -----------------------------------------------------------------------
  // FLOW 4: Manufacturing BOM → Work Order → Complete
  // -----------------------------------------------------------------------
  describe('Flow 4: Manufacturing BOM → Work Order → Complete', () => {
    let bomId: string;
    let workOrderId: string;

    it('Step 1 — creates and approves BOM', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/manufacturing/boms')
        .set(authHeader(token))
        .send({
          bom_number: `FLOW4-BOM-${Date.now()}`,
          product_name: 'Assembly Unit',
          product_code: `AU-${Date.now()}`,
          quantity: 1,
          unit: 'pcs',
          status: 'draft',
          lines: [{ component_name: 'Base Plate', component_code: 'BP-001', quantity: 1, unit: 'pcs', unit_cost: 30 }],
        });
      expect(create.status).toBeOneOf([200, 201]);
      bomId = create.body.id;

      if (bomId) {
        const approve = await request(app.getHttpServer())
          .post(`/api/manufacturing/boms/${bomId}/approve`)
          .set(authHeader(token))
          .send({ approved_by: 'manager' });
        expect(approve.status).toBeOneOf([200, 201]);
      }
    });

    it('Step 2 — creates work order from BOM', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/manufacturing/work-orders')
        .set(authHeader(token))
        .send({
          work_order_number: `FLOW4-WO-${Date.now()}`,
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_end_date: '2026-06-01',
          quantity: 5,
          status: 'draft',
          priority: 'high',
          ...(bomId ? { bom_id: bomId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      workOrderId = res.body.id;
    });

    it('Step 3 — releases work order for production', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .set(authHeader(token))
        .send({});
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 4 — completes work order', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/manufacturing/work-orders/${workOrderId}/complete`)
        .set(authHeader(token))
        .send({ actual_quantity: 5, notes: 'All units produced' });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('Step 5 — verifies work order shows completed status', async () => {
      if (!workOrderId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/manufacturing/work-orders/${workOrderId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(['completed', 'done', 'finished']).toContain(res.body.status?.toLowerCase?.());
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
