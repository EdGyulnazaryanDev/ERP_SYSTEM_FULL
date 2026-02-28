import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';

export default function JournalEntriesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => accountingApi.getJournalEntries().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createJournalEntry(data),
    onSuccess: () => {
      message.success('Journal entry created');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });

  const columns = [
    { title: 'Entry Number', dataIndex: 'entry_number', key: 'entry_number' },
    { title: 'Date', dataIndex: 'entry_date', key: 'entry_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Reference', dataIndex: 'reference_number', key: 'reference_number' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'POSTED' ? 'green' : 'orange'}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => { setEditingRecord(record); setIsModalVisible(true); setTimeout(() => form.setFieldsValue(record), 0); }} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Journal Entries</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); }}>
          Add Entry
        </Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
      <Modal title={editingRecord ? 'Edit Entry' : 'Add Entry'} open={isModalVisible} onCancel={() => { setIsModalVisible(false); setTimeout(() => form.resetFields(), 0); }} footer={null} forceRender>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference Number">
            <Input />
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
