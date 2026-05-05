import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerAndLogin, authHeader } from './helpers/create-test-app';

describe('HR (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let employeeId: string;
  let leaveTypeId: string;
  let leaveRequestId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => { await app.close(); });

  // --- Employees ---
  describe('Employees', () => {
    const employee = () => ({
      employee_code: `EMP-${Date.now()}`,
      first_name: 'Alice',
      last_name: `Smith_${Date.now()}`,
      email: `emp_${Date.now()}@company.local`,
      phone: '+1-555-0200',
      date_of_birth: '1990-05-15',
      gender: 'female',
      department: 'Engineering',
      position: 'Senior Engineer',
      hire_date: '2024-01-15',
      employment_type: 'full_time',
      status: 'active',
      salary: 85000,
    });

    it('POST /api/hr/employees — creates employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/employees')
        .set(authHeader(token))
        .send(employee());
      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('id');
      employeeId = res.body.id;
    });

    it('rejects employee without required department', async () => {
      const { department: _, ...noDept } = employee();
      const res = await request(app.getHttpServer())
        .post('/api/hr/employees')
        .set(authHeader(token))
        .send(noDept);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /api/hr/employees — lists employees paginated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/employees')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/hr/employees/search — finds employee by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/employees/search?q=Alice')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/hr/employees/department/:dept — filters by department', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/employees/department/Engineering')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('GET /api/hr/employees/:id — returns single employee', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/hr/employees/${employeeId}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(employeeId);
    });

    it('PUT /api/hr/employees/:id — updates employee', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .put(`/api/hr/employees/${employeeId}`)
        .set(authHeader(token))
        .send({ position: 'Lead Engineer' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Attendance ---
  describe('Attendance', () => {
    it('POST /api/hr/attendance/clock-in — records clock-in', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .post('/api/hr/attendance/clock-in')
        .set(authHeader(token))
        .send({ employee_id: employeeId, clock_in: new Date().toISOString() });
      expect(res.status).toBeOneOf([200, 201]);
    });

    it('GET /api/hr/attendance — lists attendance records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/attendance')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // --- Leave Types ---
  describe('Leave Types', () => {
    it('POST /api/hr/leave-types — creates leave type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/leave-types')
        .set(authHeader(token))
        .send({
          name: 'Annual Leave',
          days_per_year: 20,
          is_paid: true,
          carry_forward: true,
          max_carry_forward: 5,
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) leaveTypeId = res.body.id;
    });

    it('GET /api/hr/leave-types — lists leave types', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/leave-types')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  // --- Leave Requests ---
  describe('Leave Requests', () => {
    it('POST /api/hr/leave-requests — submits leave request', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .post('/api/hr/leave-requests')
        .set(authHeader(token))
        .send({
          employee_id: employeeId,
          ...(leaveTypeId ? { leave_type_id: leaveTypeId } : {}),
          start_date: '2026-07-01',
          end_date: '2026-07-05',
          days_count: 5,
          reason: 'Summer vacation',
        });
      expect(res.status).toBeOneOf([200, 201]);
      if (res.body?.id) leaveRequestId = res.body.id;
    });

    it('GET /api/hr/leave-requests — lists requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/leave-requests')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/hr/leave-requests/:id/approve — approves request', async () => {
      if (!leaveRequestId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/hr/leave-requests/${leaveRequestId}/approve`)
        .set(authHeader(token))
        .send({ approver_id: employeeId, notes: 'Approved' });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });

  // --- Payroll ---
  describe('Payroll', () => {
    it('GET /api/hr/payslips — lists payslips', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/hr/payslips')
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });

    it('POST /api/hr/payroll/run — triggers payroll run', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/hr/payroll/run')
        .set(authHeader(token))
        .send({ month: 4, year: 2026 });
      expect(res.status).toBeOneOf([200, 201]);
    });
  });
});

expect.extend({
  toBeOneOf(received, items) {
    return { message: () => `expected ${received} to be one of ${items.join(', ')}`, pass: items.includes(received) };
  },
});
