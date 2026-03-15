import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, Space, message, Card, Row, Col, InputNumber, Alert } from 'antd';
import { PlusOutlined, DollarOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function PayrollTab() {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [form] = Form.useForm();
  const [salaryForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });
  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payslips', selectedMonth, selectedYear],
    queryFn: () => hrApi.getPayslips(selectedMonth, selectedYear).then(res => res.data),
  });

  const generatePayslipsMutation = useMutation({
    mutationFn: ({ month, year }: any) => hrApi.generatePayslips(month, year),
    onSuccess: () => {
      message.success('Payslips generated successfully');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setIsGenerateModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to generate payslips';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const createSalaryStructureMutation = useMutation({
    mutationFn: (data: any) => hrApi.createSalaryStructure(data),
    onSuccess: () => {
      message.success('Salary structure saved');
      setIsSalaryModalOpen(false);
      salaryForm.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to save salary structure';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => hrApi.updatePayslipStatus(id, status),
    onSuccess: () => {
      message.success('Payslip status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: () => message.error('Failed to update payslip status'),
  });

  const handleGeneratePayslips = async () => {
    try {
      const values = await form.validateFields();
      generatePayslipsMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: 'Payslip #',
      dataIndex: 'payslip_number',
      key: 'payslip_number',
      width: 150,
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee ? `${employee.first_name} ${employee.last_name}` : '-',
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record: any) => `${dayjs().month(record.month - 1).format('MMM')} ${record.year}`,
    },
    {
      title: 'Working Days',
      dataIndex: 'working_days',
      key: 'working_days',
      width: 120,
    },
    {
      title: 'Present Days',
      dataIndex: 'present_days',
      key: 'present_days',
      width: 120,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: (amount: number) => `${amount?.toFixed(2) || '0.00'}`,
    },
    {
      title: 'Deductions',
      dataIndex: 'total_deductions',
      key: 'total_deductions',
      render: (amount: number) => `${amount?.toFixed(2) || '0.00'}`,
    },
    {
      title: 'Net Salary',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (amount: number) => (
        <span className="font-semibold">${amount?.toFixed(2) || '0.00'}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          draft: 'gray',
          processed: 'blue',
          paid: 'green',
          cancelled: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'processed' })}
            >
              Approve
            </Button>
          )}
          {record.status === 'processed' && (
            <Button
              type="link"
              size="small"
              onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'paid' })}
            >
              Mark Paid
            </Button>
          )}
          <Button type="link" size="small">
            View
          </Button>
        </Space>
      ),
    },
  ];

  const payslipList = Array.isArray(payslips) ? payslips : (payslips?.data || []);

  const totalGross = payslipList.reduce((sum: number, p: any) => sum + (Number(p.gross_salary) || 0), 0);
  const totalDeductions = payslipList.reduce((sum: number, p: any) => sum + (Number(p.total_deductions) || 0), 0);
  const totalNet = payslipList.reduce((sum: number, p: any) => sum + (Number(p.net_salary) || 0), 0);
  const paidCount = payslipList.filter((p: any) => p.status === 'paid').length;

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Payroll Management</h2>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <div className="text-center">
                <DollarOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                <h3 className="text-2xl font-bold mt-2">${totalGross.toFixed(2)}</h3>
                <p className="text-gray-600">Total Gross Salary</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <DollarOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
                <h3 className="text-2xl font-bold mt-2">${totalDeductions.toFixed(2)}</h3>
                <p className="text-gray-600">Total Deductions</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <DollarOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                <h3 className="text-2xl font-bold mt-2">${totalNet.toFixed(2)}</h3>
                <p className="text-gray-600">Total Net Salary</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <FileTextOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                <h3 className="text-2xl font-bold mt-2">{paidCount}</h3>
                <p className="text-gray-600">Paid Payslips</p>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="mb-4 flex justify-between">
        <Space>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ width: 150 }}
            options={months}
          />
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 120 }}
          >
            {years.map(year => (
              <Select.Option key={year} value={year}>{year}</Select.Option>
            ))}
          </Select>
        </Space>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSalaryModalOpen(true)}
          >
            Setup Salary
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generate Payslips
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={payslipList}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="Generate Payslips"
        open={isGenerateModalOpen}
        onOk={handleGeneratePayslips}
        onCancel={() => { setIsGenerateModalOpen(false); form.resetFields(); }}
        confirmLoading={generatePayslipsMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ month: dayjs().month() + 1, year: dayjs().year() }}>
          <Form.Item name="month" label="Month" rules={[{ required: true }]}>
            <Select options={months} />
          </Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <Select>
              {years.map(year => (
                <Select.Option key={year} value={year}>{year}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="Employees must have a salary structure set up before payslips can be generated. Use the 'Setup Salary' button to configure."
          />
        </Form>
      </Modal>

      <Modal
        title="Setup Employee Salary Structure"
        open={isSalaryModalOpen}
        onOk={async () => {
          const values = await salaryForm.validateFields();
          createSalaryStructureMutation.mutate({
            employee_id: values.employee_id,
            basic_salary: values.basic_salary,
            effective_from: dayjs().format('YYYY-MM-DD'),
          });
        }}
        onCancel={() => { setIsSalaryModalOpen(false); salaryForm.resetFields(); }}
        confirmLoading={createSalaryStructureMutation.isPending}
      >
        <Form form={salaryForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select employee"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employeeList.map((e: any) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={2} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
