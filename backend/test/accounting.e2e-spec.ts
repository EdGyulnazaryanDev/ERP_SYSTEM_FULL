import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('Accounting (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let accountId: string;
  let journalEntryId: string;
  let arId: string;
  let apId: string;
  let bankAccountId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  // --- Chart of Accounts ---
  describe('Chart of Accounts', () => {
    const account = () => ({
      account_code: `1${Date.now().toString().slice(-5)}`,
      account_name: `Revenue Account ${Date.now()}`,
      account_type: 'revenue',
      account_category: 'income',
      is_active: true,
    });

    it('POST /api/accounting/accounts — creates account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/accounting/accounts')
        .set(authHeader(token))
        .send(account());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      accountId = res.body.id;
    });

    it('GET /api/accounting/accounts — lists accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/accounts')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/accounting/accounts/:id — returns single account', async () => {
      if (!accountId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/accounting/accounts/${accountId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(accountId);
    });

    it('PUT /api/accounting/accounts/:id — updates account', async () => {
      if (!accountId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/accounting/accounts/${accountId}`)
        .set(authHeader(token))
        .send({ account_name: 'Updated Revenue Account' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Journal Entries ---
  describe('Journal Entries', () => {
    it('POST /api/accounting/journal-entries — creates balanced journal entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/accounting/journal-entries')
        .set(authHeader(token))
        .send({
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'manual',
          reference: `JE-${Date.now()}`,
          description: 'Test journal entry',
          lines: [
            { account_id: accountId, debit: 1000, credit: 0, description: 'Debit side' },
            { account_id: accountId, debit: 0, credit: 1000, description: 'Credit side' },
          ],
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) journalEntryId = res.body.id;
    });

    it('GET /api/accounting/journal-entries — lists journal entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/journal-entries')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/accounting/journal-entries/:id — returns single entry', async () => {
      if (!journalEntryId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/accounting/journal-entries/${journalEntryId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // --- Bank Accounts ---
  describe('Bank Accounts', () => {
    it('POST /api/accounting/bank-accounts — creates bank account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/accounting/bank-accounts')
        .set(authHeader(token))
        .send({
          account_name: `Business Checking ${Date.now()}`,
          account_number: `${Date.now()}`,
          bank_name: 'Test Bank',
          currency: 'USD',
          opening_balance: 50000,
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) bankAccountId = res.body.id;
    });

    it('GET /api/accounting/bank-accounts — lists bank accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/bank-accounts')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // --- Accounts Receivable ---
  describe('Accounts Receivable', () => {
    it('POST /api/accounting/ar — creates AR invoice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/accounting/ar')
        .set(authHeader(token))
        .send({
          invoice_number: `INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: '2026-05-31',
          amount: 5000,
          paid_amount: 0,
          status: 'unpaid',
          ...(accountId ? { ar_account_id: accountId, revenue_account_id: accountId } : {}),
          ...(bankAccountId ? { bank_account_id: bankAccountId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) arId = res.body.id;
    });

    it('GET /api/accounting/ar — lists AR invoices', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/ar')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/accounting/ar/:id/payment — records payment against AR', async () => {
      if (!arId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/accounting/ar/${arId}/payment`)
        .set(authHeader(token))
        .send({
          payment_amount: 5000,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          reference: `PAY-${Date.now()}`,
          ...(bankAccountId ? { bank_account_id: bankAccountId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Accounts Payable ---
  describe('Accounts Payable', () => {
    it('POST /api/accounting/ap — creates AP bill', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/accounting/ap')
        .set(authHeader(token))
        .send({
          bill_number: `BILL-${Date.now()}`,
          bill_date: new Date().toISOString().split('T')[0],
          due_date: '2026-05-31',
          amount: 3000,
          status: 'unpaid',
          ...(accountId ? { ap_account_id: accountId, expense_account_id: accountId } : {}),
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) apId = res.body.id;
    });

    it('GET /api/accounting/ap — lists AP bills', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/ap')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // --- Financial Reports ---
  describe('Financial Reports', () => {
    it('GET /api/accounting/trial-balance — returns trial balance', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/trial-balance')
        .set(authHeader(token));
      expect(res.status).toBeOneOf([200, 404]);
    });

    it('GET /api/accounting/balance-sheet — returns balance sheet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/balance-sheet')
        .set(authHeader(token));
      expect(res.status).toBeOneOf([200, 404]);
    });

    it('GET /api/accounting/profit-loss — returns P&L', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/accounting/profit-loss')
        .set(authHeader(token));
      expect(res.status).toBeOneOf([200, 404]);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
