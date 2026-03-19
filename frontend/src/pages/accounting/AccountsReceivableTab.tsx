import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import { crmApi } from '@/api/crm';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  open: 'orange',
  partially_paid: 'blue',
  paid: 'green',
  overdue: 'red',
  written_off: 'default',
};

export default function AccountsReceivableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => accountingApi.getAccountsReceivable().then(res => res.data),
  });

  const { data: customersRaw = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createAR(data),
    onSuccess: () => {
      message.success('Invoice created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create invoice'),
  });

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      invoice_number: values.invoice_number,
      invoice_date: values.invoice_date ? values.invoice_date.format('YYYY-MM-DD') : null,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      amount: Number(values.amount),
      description: values.description,
    });
  };

  const customerList = Array.isArray(customersRaw) ? customersRaw : customersRaw?.data || [];
  const customerOptions = customerList.map((c: any) => ({
    label: c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || c.id,
    value: c.id,
  }));

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoice_number', key: 'invoice_number' },
    { title: 'Customer', key: 'customer', render: (_: any, r: any) => r.customer?.company_name || r.customer?.first_name || r.customer_id || '-' },
    { title: 'Invoice Date', dataIndex: 'invoice_date', key: 'invoice_date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Total', dataIndex: 'total_amount', key: 'total_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Paid', dataIndex: 'paid_amount', key: 'paid_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Balance', dataIndex: 'balance_amount', key: 'balance_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Accounts Receivable</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setIsModalVisible(true); form.resetFields(); }}>
          Add Invoice
        </Button>
      </div>

      <Table columns={columns} dataSource={Array.isArray(data) ? data : data?.data || []} loading={isLoading} rowKey="id" />

      <Modal title="Add Invoice" open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true, message: 'Please select a customer' }]}>
            <Select showSearch optionFilterProp="label" placeholder="Search and select customer" options={customerOptions} />
          </Form.Item>
          <Form.Item name="invoice_number" label="Invoice Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. INV-001" />
          </Form.Item>
          <Form.Item name="invoice_date" label="Invoice Date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" min={0} step="0.01" prefix="$" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
