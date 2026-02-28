import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';

const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const accountSubtypes = ['CURRENT', 'NON_CURRENT', 'OPERATING', 'NON_OPERATING'];

export default function ChartOfAccountsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

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
      dataIndex: 'account_subtype',
      key: 'account_subtype',
      render: (subtype: string) => subtype || '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => `$${balance?.toFixed(2) || '0.00'}`,
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
        dataSource={data?.data || []}
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
            <Select options={accountTypes.map(t => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="account_subtype" label="Account Subtype">
            <Select options={accountSubtypes.map(t => ({ label: t, value: t }))} allowClear />
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
