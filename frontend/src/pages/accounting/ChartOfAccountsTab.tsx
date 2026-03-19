import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';

const accountTypes = [
  { label: 'Asset', value: 'asset' },
  { label: 'Liability', value: 'liability' },
  { label: 'Equity', value: 'equity' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Expense', value: 'expense' },
];

const accountSubtypes: Record<string, { label: string; value: string }[]> = {
  asset: [
    { label: 'Current Asset', value: 'current_asset' },
    { label: 'Fixed Asset', value: 'fixed_asset' },
    { label: 'Cash', value: 'cash' },
    { label: 'Bank', value: 'bank' },
    { label: 'Accounts Receivable', value: 'accounts_receivable' },
    { label: 'Inventory', value: 'inventory' },
  ],
  liability: [
    { label: 'Current Liability', value: 'current_liability' },
    { label: 'Long Term Liability', value: 'long_term_liability' },
    { label: 'Accounts Payable', value: 'accounts_payable' },
  ],
  equity: [
    { label: 'Capital', value: 'capital' },
    { label: 'Retained Earnings', value: 'retained_earnings' },
  ],
  revenue: [
    { label: 'Sales Revenue', value: 'sales_revenue' },
    { label: 'Service Revenue', value: 'service_revenue' },
    { label: 'Other Income', value: 'other_income' },
  ],
  expense: [
    { label: 'Cost of Goods Sold', value: 'cost_of_goods_sold' },
    { label: 'Operating Expense', value: 'operating_expense' },
    { label: 'Administrative Expense', value: 'administrative_expense' },
  ],
};

export default function ChartOfAccountsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingApi.getAccounts().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createAccount(data),
    onSuccess: () => {
      message.success('Account created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => accountingApi.updateAccount(id, data),
    onSuccess: () => {
      message.success('Account updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteAccount(id),
    onSuccess: () => {
      message.success('Account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const columns = [
    { title: 'Code', dataIndex: 'account_code', key: 'account_code', width: 120 },
    { title: 'Name', dataIndex: 'account_name', key: 'account_name' },
    {
      title: 'Type',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Subtype',
      dataIndex: 'account_sub_type',
      key: 'account_sub_type',
      render: (subtype: string) => subtype || '-',
    },
    {
      title: 'Balance',
      dataIndex: 'current_balance',
      key: 'current_balance',
      render: (balance: number) => `$${Number(balance || 0).toFixed(2)}`,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Yes' : 'No'}</Tag>,
    },
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
              setSelectedType(record.account_type || '');
              setTimeout(() => form.setFieldsValue(record), 0);
            }}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Account',
                content: 'Are you sure?',
                onOk: () => deleteMutation.mutate(record.id),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Chart of Accounts</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Account
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={Array.isArray(data) ? data : data?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingRecord ? 'Edit Account' : 'Add Account'}
        open={isModalVisible}
        forceRender
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          setTimeout(() => form.resetFields(), 0);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="account_code" label="Account Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="account_name" label="Account Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="account_type" label="Account Type" rules={[{ required: true }]}>
            <Select
              options={accountTypes}
              onChange={(val) => { setSelectedType(val); form.setFieldValue('account_sub_type', undefined); }}
            />
          </Form.Item>
          <Form.Item name="account_sub_type" label="Account Subtype" rules={[{ required: true }]}>
            <Select options={accountSubtypes[selectedType] || []} allowClear />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
