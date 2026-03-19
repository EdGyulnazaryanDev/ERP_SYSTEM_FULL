import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import dayjs from 'dayjs';

const ENTRY_TYPES = [
  { label: 'General', value: 'general' },
  { label: 'Sales', value: 'sales' },
  { label: 'Purchase', value: 'purchase' },
  { label: 'Payment', value: 'payment' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Adjustment', value: 'adjustment' },
];

const statusColor: Record<string, string> = {
  draft: 'orange',
  posted: 'green',
  reversed: 'red',
};

export default function JournalEntriesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => accountingApi.getJournalEntries().then(res => res.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingApi.getAccounts().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createJournalEntry(data),
    onSuccess: () => {
      message.success('Journal entry created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create journal entry'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      entry_date: values.entry_date ? values.entry_date.format('YYYY-MM-DD') : null,
      entry_type: values.entry_type || 'general',
      description: values.description,
      reference: values.reference,
      lines: [
        { account_id: values.debit_account_id, description: values.description, debit: Number(values.amount), credit: 0 },
        { account_id: values.credit_account_id, description: values.description, debit: 0, credit: Number(values.amount) },
      ],
    };
    createMutation.mutate(payload);
  };

  const accountOptions = Array.isArray(accounts)
    ? accounts.map((a: any) => ({ label: `${a.account_code} - ${a.account_name}`, value: a.id }))
    : [];

  const columns = [
    { title: 'Entry #', dataIndex: 'entry_number', key: 'entry_number', width: 140 },
    { title: 'Date', dataIndex: 'entry_date', key: 'entry_date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Type', dataIndex: 'entry_type', key: 'entry_type' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Debit', dataIndex: 'total_debit', key: 'total_debit', render: (v: number) => v != null ? `$${Number(v).toFixed(2)}` : '-' },
    { title: 'Credit', dataIndex: 'total_credit', key: 'total_credit', render: (v: number) => v != null ? `$${Number(v).toFixed(2)}` : '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => setViewRecord(record)} />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Journal Entries</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setIsModalVisible(true); form.resetFields(); }}>
          New Entry
        </Button>
      </div>

      <Table columns={columns} dataSource={Array.isArray(data) ? data : data?.data || []} loading={isLoading} rowKey="id" />

      {/* Create Modal */}
      <Modal title="New Journal Entry" open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }} footer={null} width={560}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" defaultValue={dayjs()} />
          </Form.Item>
          <Form.Item name="entry_type" label="Type" initialValue="general">
            <Select options={ENTRY_TYPES} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" min={0} prefix="$" />
          </Form.Item>
          <Form.Item name="debit_account_id" label="Debit Account" rules={[{ required: true }]}>
            <Select options={accountOptions} showSearch optionFilterProp="label" placeholder="Select account to debit" />
          </Form.Item>
          <Form.Item name="credit_account_id" label="Credit Account" rules={[{ required: true }]}>
            <Select options={accountOptions} showSearch optionFilterProp="label" placeholder="Select account to credit" />
          </Form.Item>
          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal title={`Entry: ${viewRecord?.entry_number}`} open={!!viewRecord} onCancel={() => setViewRecord(null)} footer={null} width={600}>
        {viewRecord && (
          <div>
            <p><b>Date:</b> {new Date(viewRecord.entry_date).toLocaleDateString()}</p>
            <p><b>Status:</b> <Tag color={statusColor[viewRecord.status]}>{viewRecord.status?.toUpperCase()}</Tag></p>
            <p><b>Description:</b> {viewRecord.description || '-'}</p>
            <Table
              size="small"
              pagination={false}
              dataSource={viewRecord.lines || []}
              rowKey="id"
              columns={[
                { title: 'Account', render: (_: any, r: any) => r.account?.account_name || r.account_id },
                { title: 'Debit', dataIndex: 'debit', render: (v: number) => v > 0 ? `$${Number(v).toFixed(2)}` : '-' },
                { title: 'Credit', dataIndex: 'credit', render: (v: number) => v > 0 ? `$${Number(v).toFixed(2)}` : '-' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
