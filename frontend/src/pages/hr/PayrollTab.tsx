import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, Space, message, Row, Col, Card, InputNumber, Alert } from 'antd';
import { PlusOutlined, DollarOutlined, FileTextOutlined, SettingOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';
import { downloadPayslipPdf, downloadAllPayslipsPdf } from '@/utils/payslipPdf';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: '#8c8c8c', bg: '#fafafa',   label: 'Draft' },
  processed: { color: '#1677ff', bg: '#e6f4ff',   label: 'Processed' },
  paid:      { color: '#52c41a', bg: '#f6ffed',   label: 'Paid' },
  cancelled: { color: '#ff4d4f', bg: '#fff2f0',   label: 'Cancelled' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8c8c8c', bg: '#fafafa', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

export default function PayrollTab() {
  const [viewPayslip, setViewPayslip] = useState<any>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [form] = Form.useForm();
  const [salaryForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => hrApi.getEmployees().then(res => res.data) });
  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payslips', selectedMonth, selectedYear],
    queryFn: () => hrApi.getPayslips(selectedMonth, selectedYear).then(res => res.data),
  });

  const generatePayslipsMutation = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => hrApi.generatePayslips(month, year),
    onSuccess: (_, vars) => { message.success('Payslips generated'); setSelectedMonth(vars.month); setSelectedYear(vars.year); queryClient.invalidateQueries({ queryKey: ['payslips'] }); setIsGenerateModalOpen(false); form.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });

  const createSalaryStructureMutation = useMutation({
    mutationFn: (data: any) => hrApi.createSalaryStructure(data),
    onSuccess: () => { message.success('Salary structure saved'); setIsSalaryModalOpen(false); salaryForm.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => hrApi.updatePayslipStatus(id, status),
    onSuccess: () => { message.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['payslips'] }); },
    onError: () => message.error('Failed to update status'),
  });

  const payslipList = Array.isArray(payslips) ? payslips : (payslips?.data || []);
  const totalGross = payslipList.reduce((sum: number, p: any) => sum + Number(p.gross_salary || 0), 0);
  const totalDeductions = payslipList.reduce((sum: number, p: any) => sum + Number(p.total_deductions || 0), 0);
  const totalNet = payslipList.reduce((sum: number, p: any) => sum + Number(p.net_salary || 0), 0);
  const paidCount = payslipList.filter((p: any) => p.status === 'paid').length;

  const months = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ value: m, label: dayjs().month(m-1).format('MMMM') }));
  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i);

  const columns = [
    { title: 'Payslip #', dataIndex: 'payslip_number', key: 'payslip_number', width: 150,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Employee', dataIndex: 'employee', key: 'employee', render: (emp: any) => emp ? <span style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</span> : '-' },
    { title: 'Period', key: 'period', render: (_: any, r: any) => `${dayjs().month(r.month - 1).format('MMM')} ${r.year}` },
    { title: 'Days', dataIndex: 'present_days', key: 'present_days', width: 80, render: (v: number, r: any) => `${v}/${r.working_days}` },
    { title: 'Gross', dataIndex: 'gross_salary', key: 'gross_salary', render: (v: number) => <span style={{ fontFamily: 'monospace' }}>${Number(v || 0).toFixed(2)}</span> },
    { title: 'Deductions', dataIndex: 'total_deductions', key: 'total_deductions', render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#ff4d4f' }}>-${Number(v || 0).toFixed(2)}</span> },
    { title: 'Net', dataIndex: 'net_salary', key: 'net_salary', render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#52c41a' }}>${Number(v || 0).toFixed(2)}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (status: string) => <StatusPill status={status} /> },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          {record.status === 'draft' && <Button type="link" size="small" onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'processed' })}>Approve</Button>}
          {record.status === 'processed' && <Button type="link" size="small" onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'paid' })}>Mark Paid</Button>}
          <Button type="link" size="small" onClick={() => setViewPayslip(record)}>View</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => downloadPayslipPdf(record)}>PDF</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={12} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Gross', value: `$${totalGross.toFixed(2)}`, color: '#52c41a', icon: <DollarOutlined /> },
          { label: 'Total Deductions', value: `$${totalDeductions.toFixed(2)}`, color: '#ff4d4f', icon: <DollarOutlined /> },
          { label: 'Total Net', value: `$${totalNet.toFixed(2)}`, color: '#1677ff', icon: <DollarOutlined /> },
          { label: 'Paid Payslips', value: paidCount, color: '#722ed1', icon: <FileTextOutlined /> },
        ].map((stat, i) => (
          <Col key={i} xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 12, border: `1px solid ${stat.color}22`, background: `${stat.color}08` }} bodyStyle={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 16 }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--app-text)' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{stat.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 150 }} options={months} />
          <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 120 }}>
            {years.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
          </Select>
        </Space>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setIsSalaryModalOpen(true)}>Setup Salary</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsGenerateModalOpen(true)}>Generate Payslips</Button>
          <Button icon={<DownloadOutlined />} disabled={payslipList.length === 0} onClick={() => downloadAllPayslipsPdf(payslipList, selectedMonth, selectedYear)}>Download All PDF</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={payslipList}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        scroll={{ x: 1100 }}
        rowClassName={(record: any) => record.status === 'paid' ? 'row-paid' : record.status === 'cancelled' ? 'row-cancelled' : ''}
      />

      <Modal title="Generate Payslips" open={isGenerateModalOpen}
        onOk={async () => { const values = await form.validateFields(); generatePayslipsMutation.mutate(values); }}
        onCancel={() => { setIsGenerateModalOpen(false); form.resetFields(); }}
        confirmLoading={generatePayslipsMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ month: dayjs().month() + 1, year: dayjs().year() }}>
          <Form.Item name="month" label="Month" rules={[{ required: true }]}><Select options={months} /></Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <Select>{years.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}</Select>
          </Form.Item>
          <Alert type="info" showIcon message="Employees must have a salary structure set up before payslips can be generated." />
        </Form>
      </Modal>

      <Modal title="Setup Employee Salary Structure" open={isSalaryModalOpen}
        onOk={async () => { const values = await salaryForm.validateFields(); createSalaryStructureMutation.mutate({ employee_id: values.employee_id, basic_salary: values.basic_salary, effective_from: dayjs().format('YYYY-MM-DD') }); }}
        onCancel={() => { setIsSalaryModalOpen(false); salaryForm.resetFields(); }}
        confirmLoading={createSalaryStructureMutation.isPending}
      >
        <Form form={salaryForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select employee" filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employeeList.map((e: any) => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))} />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={2} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Payslip Details" open={!!viewPayslip} onCancel={() => setViewPayslip(null)}
        footer={<Space><Button onClick={() => setViewPayslip(null)}>Close</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => viewPayslip && downloadPayslipPdf(viewPayslip)}>Download PDF</Button></Space>}
        width={600}
      >
        {viewPayslip && (
          <div className="space-y-3">
            {[
              ['Payslip #', viewPayslip.payslip_number],
              ['Employee', viewPayslip.employee ? `${viewPayslip.employee.first_name} ${viewPayslip.employee.last_name}` : '-'],
              ['Period', `${dayjs().month(viewPayslip.month - 1).format('MMMM')} ${viewPayslip.year}`],
              ['Working Days', viewPayslip.working_days],
              ['Present Days', viewPayslip.present_days],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b pb-2">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Gross Salary</span><span className="font-medium">${Number(viewPayslip.gross_salary || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Total Deductions</span><span className="font-medium text-red-500">-${Number(viewPayslip.total_deductions || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Net Salary</span><span className="font-bold text-green-600 text-lg">${Number(viewPayslip.net_salary || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusPill status={viewPayslip.status} /></div>
          </div>
        )}
      </Modal>

      <style>{`
        .row-paid td { background: rgba(34, 197, 94, 0.12) !important; }
        .row-cancelled td { background: rgba(239, 68, 68, 0.12) !important; opacity: 0.82; }
      `}</style>
    </div>
  );
}
