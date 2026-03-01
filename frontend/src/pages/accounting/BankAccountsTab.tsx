import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';

export default function BankAccountsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => accountingApi.getBankAccounts().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createBankAccount(data),
    onSuccess: () => {
      message.success('Bank Account created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to create bank account');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => accountingApi.updateBankAccount(id, data),
    onSuccess: () => {
      message.success('Bank Account updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to update bank account');
    }
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      initial_balance: values.initial_balance ? Number(values.initial_balance) : undefined
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Account Name', dataIndex: 'account_name', key: 'account_name' },
    { title: 'Account Number', dataIndex: 'account_number', key: 'account_number' },
    { title: 'Bank Name', dataIndex: 'bank_name', key: 'bank_name' },
    { title: 'Balance', dataIndex: 'current_balance', key: 'current_balance', render: (bal: number) => `$${(bal || 0).toFixed(2)}` },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Yes' : 'No'}</Tag> },
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
              setTimeout(() => form.setFieldsValue(record), 0);
            }}
          />
        </Space>
      ),
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Bank Accounts</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Bank Account
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Bank Account' : 'Add Bank Account'}
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
          <Form.Item name="account_name" label="Account Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Operating Account" />
          </Form.Item>

          <Form.Item name="account_number" label="Account Number" rules={[{ required: true }]}>
            <Input placeholder="Enter account number" />
          </Form.Item>

          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="Enter bank name" />
          </Form.Item>

          <Form.Item name="currency" label="Currency" initialValue="USD" rules={[{ required: true }]}>
            <Input placeholder="e.g. USD, EUR" />
          </Form.Item>

          {!editingRecord && (
            <Form.Item name="initial_balance" label="Initial Balance" rules={[{ required: true }]}>
              <Input type="number" step="0.01" prefix="$" placeholder="0.00" />
            </Form.Item>
          )}

          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
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
