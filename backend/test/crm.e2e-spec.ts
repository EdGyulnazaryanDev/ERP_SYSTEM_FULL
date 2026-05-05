import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('CRM (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let customerId: string;
  let leadId: string;
  let opportunityId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  // --- Customers ---
  describe('Customers', () => {
    const customer = () => ({
      customer_code: `CUST-${Date.now()}`,
      company_name: `Acme_${Date.now()}`,
      contact_person: 'John Smith',
      email: `cust_${Date.now()}@acme.local`,
      phone: '+1-555-0100',
      customer_type: 'business',
      status: 'active',
    });

    it('POST /api/crm/customers — creates customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/customers')
        .set(authHeader(token))
        .send(customer());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      customerId = res.body.id;
    });

    it('GET /api/crm/customers — lists customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/crm/customers')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/crm/customers/search — searches by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/crm/customers/search?q=Acme')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/crm/customers/:id — returns single customer', async () => {
      if (!customerId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/crm/customers/${customerId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(customerId);
    });

    it('PUT /api/crm/customers/:id — updates customer', async () => {
      if (!customerId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/crm/customers/${customerId}`)
        .set(authHeader(token))
        .send({ contact_person: 'Jane Smith' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Leads ---
  describe('Leads', () => {
    const lead = () => ({
      first_name: 'Bob',
      last_name: `Lead_${Date.now()}`,
      email: `lead_${Date.now()}@prospect.local`,
      company: 'ProspectCo',
      status: 'new',
      source: 'website',
    });

    it('POST /api/crm/leads — creates lead', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/leads')
        .set(authHeader(token))
        .send(lead());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      leadId = res.body.id;
    });

    it('GET /api/crm/leads — lists leads', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/crm/leads/:id — returns single lead', async () => {
      if (!leadId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/crm/leads/${leadId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(leadId);
    });
  });

  // --- Opportunities ---
  describe('Opportunities', () => {
    const opportunity = () => ({
      title: `Deal_${Date.now()}`,
      stage: 'prospecting',
      amount: 15000,
      close_date: '2026-12-31',
      probability: 25,
    });

    it('POST /api/crm/opportunities — creates opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/opportunities')
        .set(authHeader(token))
        .send(opportunity());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      opportunityId = res.body.id;
    });

    it('GET /api/crm/opportunities — lists opportunities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/crm/opportunities')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('PUT /api/crm/opportunities/:id — advances stage', async () => {
      if (!opportunityId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/crm/opportunities/${opportunityId}`)
        .set(authHeader(token))
        .send({ stage: 'proposal', probability: 60 });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Activities ---
  describe('Activities', () => {
    it('POST /api/crm/activities — creates activity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/crm/activities')
        .set(authHeader(token))
        .send({
          activity_type: 'call',
          subject: 'Follow-up call',
          notes: 'Discussed proposal details',
          activity_date: new Date().toISOString(),
          ...(customerId ? { customer_id: customerId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('GET /api/crm/activities — lists activities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/crm/activities')
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
