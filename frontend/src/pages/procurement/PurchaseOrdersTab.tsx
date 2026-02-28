import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

export default function PurchaseOrdersTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => procurementApi.getPurchaseOrders().then(res => res.data),
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/suppliers').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createPurchaseOrder(data),
    onSuccess: () => {
      message.success('Purchase Order created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create PO'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => procurementApi.updatePurchaseOrder(id, data),
    onSuccess: () => {
      message.success('Purchase Order updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update PO'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      order_date: values.order_date ? values.order_date.format('YYYY-MM-DD') : null,
      total_amount: Number(values.total_amount)
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number' },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name' },
    { title: 'Order Date', dataIndex: 'order_date', key: 'order_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'Total Amount', dataIndex: 'total_amount', key: 'total_amount', render: (amt: number) => `$${(amt || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'APPROVED' ? 'green' : 'orange'}>{status}</Tag> },
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
                  order_date: record.order_date ? dayjs(record.order_date) : null
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
        <h2 className="text-xl font-semibold">Purchase Orders</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Create PO
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Purchase Order' : 'Create Purchase Order'}
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
          <Form.Item name="vendor_id" label="Vendor" rules={[{ required: true }]}>
            <Select placeholder="Select Vendor">
              {vendors?.data?.map((v: any) => (
                <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="order_date" label="Order Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="total_amount" label="Total Amount" rules={[{ required: true }]}>
            <Input type="number" step="0.01" prefix="$" />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="DRAFT" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
            </Select>
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
