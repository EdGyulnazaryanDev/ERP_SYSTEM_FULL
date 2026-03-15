import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, Space, message, Card, Row, Col } from 'antd';
import { PlusOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function PayrollTab() {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

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
      message.error(error.response?.data?.message || 'Failed to generate payslips');
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

  const totalGross = payslips?.data?.reduce((sum: number, p: any) => sum + (Number(p.gross_salary) || 0), 0) || 0;
  const totalDeductions = payslips?.data?.reduce((sum: number, p: any) => sum + (Number(p.total_deductions) || 0), 0) || 0;
  const totalNet = payslips?.data?.reduce((sum: number, p: any) => sum + (Number(p.net_salary) || 0), 0) || 0;
  const paidCount = payslips?.data?.filter((p: any) => p.status === 'paid').length || 0;

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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsGenerateModalOpen(true)}
        >
          Generate Payslips
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payslips?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="Generate Payslips"
        open={isGenerateModalOpen}
        onOk={handleGeneratePayslips}
        onCancel={() => {
          setIsGenerateModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={generatePayslipsMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ month: dayjs().month() + 1, year: dayjs().year() }}>
          <Form.Item
            name="month"
            label="Month"
            rules={[{ required: true, message: 'Please select month' }]}
          >
            <Select options={months} />
          </Form.Item>

          <Form.Item
            name="year"
            label="Year"
            rules={[{ required: true, message: 'Please select year' }]}
          >
            <Select>
              {years.map(year => (
                <Select.Option key={year} value={year}>{year}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-700">
              This will generate payslips for all active employees for the selected period.
              Existing payslips for this period will not be regenerated.
            </p>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
