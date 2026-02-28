import apiClient from './client';

export const hrApi = {
  // Employees
  getEmployees: () => apiClient.get('/hr/employees'),
  getEmployee: (id: string) => apiClient.get(`/hr/employees/${id}`),
  searchEmployees: (query: string) => apiClient.get('/hr/employees/search', { params: { q: query } }),
  getEmployeesByDepartment: (department: string) => apiClient.get(`/hr/employees/department/${department}`),
  createEmployee: (data: any) => apiClient.post('/hr/employees', data),
  updateEmployee: (id: string, data: any) => apiClient.put(`/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => apiClient.delete(`/hr/employees/${id}`),

  // Attendance
  clockIn: (data: any) => apiClient.post('/hr/attendance/clock-in', data),
  clockOut: (data: any) => apiClient.post('/hr/attendance/clock-out', data),
  markAttendance: (data: any) => apiClient.post('/hr/attendance/mark', data),
  getEmployeeAttendance: (employeeId: string, startDate: string, endDate: string) => 
    apiClient.get(`/hr/attendance/employee/${employeeId}`, { params: { startDate, endDate } }),

  // Leave Types
  getLeaveTypes: () => apiClient.get('/hr/leave-types'),
  createLeaveType: (data: any) => apiClient.post('/hr/leave-types', data),
  updateLeaveType: (id: string, data: any) => apiClient.put(`/hr/leave-types/${id}`, data),

  // Leave Balance
  initializeLeaveBalance: (employeeId: string, year: number) => 
    apiClient.post(`/hr/leave-balance/initialize/${employeeId}`, null, { params: { year } }),
  getLeaveBalance: (employeeId: string) => apiClient.get(`/hr/leave-balance/${employeeId}`),

  // Leave Requests
  requestLeave: (data: any, employeeId: string) => 
    apiClient.post('/hr/leave-requests', data, { params: { employeeId } }),
  getLeaveRequests: (status?: string) => 
    apiClient.get('/hr/leave-requests', { params: { status } }),
  getEmployeeLeaveRequests: (employeeId: string) => 
    apiClient.get(`/hr/leave-requests/employee/${employeeId}`),
  approveLeave: (id: string, data: any) => apiClient.post(`/hr/leave-requests/${id}/approve`, data),
  rejectLeave: (id: string, data: any) => apiClient.post(`/hr/leave-requests/${id}/reject`, data),

  // Salary Components
  getSalaryComponents: () => apiClient.get('/hr/salary-components'),
  createSalaryComponent: (data: any) => apiClient.post('/hr/salary-components', data),
  updateSalaryComponent: (id: string, data: any) => apiClient.put(`/hr/salary-components/${id}`, data),

  // Salary Structure
  createSalaryStructure: (data: any) => apiClient.post('/hr/salary-structure', data),
  getSalaryStructure: (employeeId: string) => apiClient.get(`/hr/salary-structure/${employeeId}`),

  // Payroll
  generatePayslips: (month: number, year: number) => 
    apiClient.post('/hr/payroll/generate', null, { params: { month, year } }),
  getPayslips: (month?: number, year?: number) => 
    apiClient.get('/hr/payslips', { params: { month, year } }),
  getEmployeePayslips: (employeeId: string) => 
    apiClient.get(`/hr/payslips/employee/${employeeId}`),
  updatePayslipStatus: (id: string, status: string) => 
    apiClient.put(`/hr/payslips/${id}/status`, { status }),
};
