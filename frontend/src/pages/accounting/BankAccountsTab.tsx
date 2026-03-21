import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Switch, Tooltip, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, BankOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
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
    mutationFn: (d: any) => accountingApi.createBankAccount(d),
    onSuccess: () => {
      message.success('Bank account created');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => accountingApi.updateBankAccount(id, data),
    onSuccess: () => {
      message.success('Bank account updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update'),
  });

  const rawList: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const totalBalance = rawList.reduce((s, r) => s + Number(r.current_balance || 0), 0);

  const openModal = (record?: any) => {
    setEditingRecord(record || null);
    setIsModalVisible(true);
    if (record) setTimeout(() => form.setFieldsValue(record), 0);
    else setTimeout(() => form.resetFields(), 0);
  };

  const columns = [
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (v: string, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: r.is_active ? '#e6f4ff' : '#f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: r.is_active ? '#1677ff' : '#8c8c8c', fontSize: 14, flexShrink: 0,
          }}>
            <BankOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{v}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.bank_name}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Account Number',
      dataIndex: 'account_number',
      key: 'account_number',
      width: 160,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>
          {'•'.repeat(Math.max(0, (v || '').length - 4))}{(v || '').slice(-4)}
        </span>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
      align: 'center' as const,
      render: (v: string) => (
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
          background: '#f0f5ff', color: '#1677ff',
          fontSize: 11, fontWeight: 700,
        }}>{v || 'USD'}</span>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'current_balance',
      key: 'current_balance',
      width: 130,
      align: 'right' as const,
      render: (v: number) => {
        const n = Number(v || 0);
        return (
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: n >= 0 ? '#1a1a2e' : '#ff4d4f' }}>
            ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      align: 'center' as const,
      render: (v: boolean) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 8px', borderRadius: 20,
          background: v ? '#f6ffed' : '#f5f5f5',
          color: v ? '#52c41a' : '#8c8c8c',
          border: `1px solid ${v ? '#52c41a33' : '#d9d9d9'}`,
          fontSize: 11, fontWeight: 600,
        }}>
          {v ? <CheckCircleOutlined /> : <StopOutlined />}
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Tooltip title="Edit">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* Total balance summary */}
      {rawList.length > 0 && (
        <Card
          size="small"
          style={{ marginBottom: 16, borderRadius: 10, border: '1px solid #1677ff22', background: '#1677ff08' }}
          styles={{ body: { padding: '12px 18px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <BankOutlined style={{ color: '#1677ff', fontSize: 16 }} />
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
                {rawList.length} bank account{rawList.length !== 1 ? 's' : ''}
              </span>
            </Space>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Total Balance</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#1677ff' }}>
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => openModal()}>
          Add Bank Account
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={rawList}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20 }}
        rowClassName={(r: any) => !r.is_active ? 'row-inactive' : ''}
      />

      <Modal
        title={
          <Space>
            <BankOutlined style={{ color: '#1677ff' }} />
            {editingRecord ? 'Edit Bank Account' : 'Add Bank Account'}
          </Space>
        }
        open={isModalVisible}
        forceRender
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); }}
        footer={null}
      >
        <Form
          form={form} layout="vertical"
          onFinish={(values) => {
            const payload = { ...values, opening_balance: values.opening_balance ? Number(values.opening_balance) : undefined };
            if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: payload });
            else createMutation.mutate(payload);
          }}
        >
          <Form.Item name="account_name" label="Account Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Operating Account" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="account_number" label="Account Number" rules={[{ required: true }]}>
                <Input placeholder="Enter account number" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="currency" label="Currency" initialValue="USD" rules={[{ required: true }]}>
                <Input placeholder="USD" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="Enter bank name" />
          </Form.Item>
          {!editingRecord && (
            <Form.Item name="opening_balance" label="Opening Balance">
              <Input type="number" step="0.01" prefix="$" placeholder="0.00" />
            </Form.Item>
          )}
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`.row-inactive td { opacity: 0.55; }`}</style>
    </div>
  );
}
