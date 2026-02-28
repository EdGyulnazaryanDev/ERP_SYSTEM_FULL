import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

export default function StockMovementsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => apiClient.get('/transactions').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/transactions', data),
    onSuccess: () => {
      message.success('Stock movement recorded successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to record stock movement'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/transactions/${id}`, data),
    onSuccess: () => {
      message.success('Stock movement updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update stock movement'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      movement_date: values.movement_date ? values.movement_date.format('YYYY-MM-DD') : null,
      quantity: Number(values.quantity)
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Movement #', dataIndex: 'movement_number', key: 'movement_number' },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'From', dataIndex: 'from_location', key: 'from_location' },
    { title: 'To', dataIndex: 'to_location', key: 'to_location' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Type', dataIndex: 'movement_type', key: 'movement_type', render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: 'Date', dataIndex: 'movement_date', key: 'movement_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
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
                  movement_date: record.movement_date ? dayjs(record.movement_date) : null
                });
              }, 0);
            }}
          />
        </Space>
      ),
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Stock Movements</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Record Movement
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Movement' : 'Record Movement'}
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
          <Form.Item name="product_id" label="Product ID" rules={[{ required: true }]}>
            <Input placeholder="Enter Product UUID" />
          </Form.Item>

          <Form.Item name="movement_type" label="Movement Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="RECEIPT">Receipt</Select.Option>
              <Select.Option value="ISSUE">Issue</Select.Option>
              <Select.Option value="TRANSFER">Transfer</Select.Option>
              <Select.Option value="ADJUSTMENT">Adjustment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="from_location" label="From Location">
            <Input placeholder="Source details" />
          </Form.Item>

          <Form.Item name="to_location" label="To Location">
            <Input placeholder="Destination details" />
          </Form.Item>

          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <Input type="number" placeholder="Movement quantity" />
          </Form.Item>

          <Form.Item name="movement_date" label="Movement Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="reference_document" label="Reference Document">
            <Input placeholder="e.g. PO-1234 or SO-999" />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Record'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
