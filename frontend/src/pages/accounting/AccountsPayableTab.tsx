import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  open: 'orange',
  partially_paid: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'default',
};

export default function AccountsPayableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: () => accountingApi.getAccountsPayable().then(res => res.data),
  });

  const { data: suppliersRaw, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => apiClient.get('/suppliers?pageSize=200').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createAP(data),
    onSuccess: () => {
      message.success('Bill created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create bill'),
  });

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      supplier_id: values.supplier_id,
      bill_number: values.bill_number,
      bill_date: values.bill_date ? values.bill_date.format('YYYY-MM-DD') : null,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      amount: Number(values.amount),
      description: values.description,
    });
  };

  const supplierList = Array.isArray(suppliersRaw) ? suppliersRaw : suppliersRaw?.data || [];
  const supplierOptions = supplierList.map((s: any) => ({
    label: s.name || s.id,
    value: s.id,
  }));

  const columns = [
    { title: 'Bill #', dataIndex: 'bill_number', key: 'bill_number' },
    { title: 'Supplier', key: 'supplier', render: (_: any, r: any) => r.supplier?.name || r.vendor_id || '-' },
    { title: 'Bill Date', dataIndex: 'bill_date', key: 'bill_date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Total', dataIndex: 'total_amount', key: 'total_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Paid', dataIndex: 'paid_amount', key: 'paid_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Balance', dataIndex: 'balance_amount', key: 'balance_amount', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Accounts Payable</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setIsModalVisible(true); form.resetFields(); }}>
          Add Bill
        </Button>
      </div>

      <Table columns={columns} dataSource={Array.isArray(data) ? data : data?.data || []} loading={isLoading} rowKey="id" />

      <Modal title="Add Bill" open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true, message: 'Please select a supplier' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={suppliersLoading ? 'Loading suppliers...' : 'Search and select supplier'}
              options={supplierOptions}
              loading={suppliersLoading}
              notFoundContent={suppliersLoading ? 'Loading...' : 'No suppliers found'}
            />
          </Form.Item>
          <Form.Item name="bill_number" label="Bill Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. BILL-001" />
          </Form.Item>
          <Form.Item name="bill_date" label="Bill Date" rules={[{ required: true }]} initialValue={dayjs()}>
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
