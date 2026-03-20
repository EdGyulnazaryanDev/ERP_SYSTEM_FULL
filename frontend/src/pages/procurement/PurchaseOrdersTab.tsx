import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createPurchaseOrder(data),
    onSuccess: () => { message.success('Purchase Order created'); setIsModalVisible(false); form.resetFields(); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create PO'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => procurementApi.updatePurchaseOrder(id, data),
    onSuccess: () => { message.success('Purchase Order updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update PO'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementApi.approvePurchaseOrder(id, {}),
    onSuccess: () => { message.success('Purchase Order approved'); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to approve PO'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      order_date: values.order_date ? values.order_date.format('YYYY-MM-DD') : null,
      total_amount: Number(values.total_amount),
      items: values.items || [],
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = Array.isArray(data) ? data : (data?.data || []);

  const statusColor = (s: string) => {
    if (!s) return 'default';
    const v = s.toLowerCase();
    if (v === 'approved') return 'green';
    if (v === 'rejected' || v === 'cancelled') return 'red';
    if (v === 'pending_approval' || v === 'pending') return 'orange';
    return 'default';
  };

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number' },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name', render: (v: string) => v || '-' },
    {
      title: 'Order Date', dataIndex: 'order_date', key: 'order_date',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'Total', dataIndex: 'total_amount', key: 'total_amount', align: 'right' as const,
      render: (v: number) => `$${Number(v || 0).toFixed(2)}`,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor(s)}>{(s || '').toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => {
        const isPending = ['pending_approval', 'pending', 'draft'].includes((record.status || '').toLowerCase());
        return (
          <Space>
            <Button
              type="link" size="small" icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                setIsModalVisible(true);
                setTimeout(() => form.setFieldsValue({ ...record, order_date: record.order_date ? dayjs(record.order_date) : null }), 0);
              }}
            />
            {isPending && (
              <Popconfirm
                title="Approve this Purchase Order?"
                description="This will mark the PO as approved and notify accounting."
                onConfirm={() => approveMutation.mutate(record.id)}
                okText="Approve"
                okButtonProps={{ type: 'primary' }}
              >
                <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }}
                  loading={approveMutation.isPending}>
                  Approve
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Purchase Orders</h2>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditingRecord(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); }}>
          Create PO
        </Button>
      </div>

      <Table columns={columns} dataSource={rows} loading={isLoading} rowKey="id"
        pagination={{ pageSize: 20 }} />

      <Modal
        title={editingRecord ? 'Edit Purchase Order' : 'Create Purchase Order'}
        open={isModalVisible}
        forceRender
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="vendor_id" label="Vendor">
            <Select placeholder="Select Vendor" allowClear showSearch optionFilterProp="children">
              {(Array.isArray(vendors) ? vendors : vendors?.data || []).map((v: any) => (
                <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="order_date" label="Order Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="total_amount" label="Total Amount">
            <Input type="number" step="0.01" prefix="$" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending_approval">
            <Select>
              <Select.Option value="draft">Draft</Select.Option>
              <Select.Option value="pending_approval">Pending Approval</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item className="mb-0">
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
