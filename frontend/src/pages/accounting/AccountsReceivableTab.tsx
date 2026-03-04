import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import dayjs from 'dayjs';

export default function AccountsReceivableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => accountingApi.getAccountsReceivable().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createAR(data),
    onSuccess: () => {
      message.success('Account Receivable created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to create Account Receivable');
    }
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      amount: Number(values.amount)
    };
    createMutation.mutate(payload);
  };

  const columns = [
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Invoice #', dataIndex: 'invoice_number', key: 'invoice_number' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amt: number) => `$${(amt || 0).toFixed(2)}` },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'PAID' ? 'green' : (status === 'OVERDUE' ? 'red' : 'orange')}>{status}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              setIsModalVisible(true);
              setTimeout(() => {
                form.setFieldsValue({
                  ...record,
                  due_date: record.due_date ? dayjs(record.due_date) : null
                });
              }, 0);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Accounts Receivable</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Receivable
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Account Receivable' : 'Add Account Receivable'}
        open={isModalVisible}
        forceRender
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          setTimeout(() => form.resetFields(), 0);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="customer_id" label="Customer ID" rules={[{ required: true, message: 'Customer ID is required' }]}>
            <Input placeholder="Enter customer UUID" />
          </Form.Item>

          <Form.Item name="invoice_number" label="Invoice Number" rules={[{ required: true, message: 'Invoice number is required' }]}>
            <Input placeholder="Enter invoice number" />
          </Form.Item>

          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required' }]}>
            <Input type="number" step="0.01" prefix="$" placeholder="0.00" />
          </Form.Item>

          <Form.Item name="due_date" label="Due Date" rules={[{ required: true, message: 'Due date is required' }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
