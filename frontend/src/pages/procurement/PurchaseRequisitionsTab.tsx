import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function PurchaseRequisitionsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-requisitions'],
    queryFn: () => procurementApi.getRequisitions().then(res => res.data),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createRequisition(data),
    onSuccess: () => {
      message.success('Purchase Requisition created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create PR'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => procurementApi.updateRequisition(id, data),
    onSuccess: () => {
      message.success('Purchase Requisition updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update PR'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementApi.approveRequisition(id, {}),
    onSuccess: () => {
      message.success('Requisition approved — JE created & inbound shipment opened');
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => procurementApi.rejectRequisition(id, { rejection_reason: 'Rejected by manager' }),
    onSuccess: () => {
      message.success('Requisition rejected');
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to reject'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      request_date: values.request_date ? values.request_date.format('YYYY-MM-DD') : null,
      required_date: values.required_date ? values.required_date.format('YYYY-MM-DD') : null,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Req #', dataIndex: 'requisition_number', key: 'requisition_number' },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v: string) => v || '-' },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (priority: string) => <Tag color={priority === 'HIGH' || priority === 'high' ? 'red' : 'blue'}>{priority}</Tag> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={status === 'APPROVED' || status === 'approved' ? 'green' : status === 'REJECTED' || status === 'rejected' ? 'red' : 'orange'}>{status}</Tag>,
    },
    {
      title: 'Items', key: 'items',
      render: (_: unknown, r: any) => r.items?.length ? `${r.items.length} item(s)` : '-',
    },
    {
      title: 'Est. Total', key: 'total',
      render: (_: unknown, r: any) => {
        const total = (r.items || []).reduce((s: number, i: any) => s + Number(i.total_estimated || 0), 0);
        return total > 0 ? `$${total.toFixed(2)}` : '-';
      },
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
              setTimeout(() => {
                form.setFieldsValue({
                  ...record,
                  request_date: record.request_date ? dayjs(record.request_date) : null,
                  required_date: record.required_date ? dayjs(record.required_date) : null
                });
              }, 0);
            }}
          />
          {(record.status === 'pending_approval' || record.status === 'PENDING_APPROVAL') && (
            <>
              <Popconfirm
                title="Approve this requisition?"
                description="This will create a Journal Entry and open an inbound shipment."
                onConfirm={() => approveMutation.mutate(record.id)}
                okText="Approve"
                okButtonProps={{ type: 'primary' }}
              >
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                  loading={approveMutation.isPending}
                >
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this requisition?"
                onConfirm={() => rejectMutation.mutate(record.id)}
                okText="Reject"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" danger icon={<StopOutlined />}>Reject</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Purchase Requisitions</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Create Requisition
        </Button>
      </div>

      <Table columns={columns} dataSource={Array.isArray(data) ? data : (data?.data || [])} loading={isLoading} rowKey="id"
        expandable={{
          expandedRowRender: (record: any) => {
            const items = record.items ?? [];
            if (!items.length) return <p style={{ margin: 0 }}>No items</p>;
            return (
              <Table
                size="small"
                dataSource={items}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
                  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
                  { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
                  { title: 'Unit', dataIndex: 'unit', key: 'unit', render: (v: string) => v || '-' },
                  {
                    title: 'Est. Price', dataIndex: 'estimated_price', key: 'estimated_price',
                    render: (v: number) => v ? `${Number(v).toFixed(2)}` : '-',
                  },
                  {
                    title: 'Total', dataIndex: 'total_estimated', key: 'total_estimated',
                    render: (v: number) => v ? `${Number(v).toFixed(2)}` : '-',
                  },
                ]}
              />
            );
          },
          rowExpandable: (record: any) => (record.items?.length ?? 0) > 0,
        }}
      />

      <Modal
        title={editingRecord ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
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
          <Form.Item name="requested_by_id" label="Requested By" rules={[{ required: true }]}>
            <Select placeholder="Select Employee">
              {employees?.data?.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="request_date" label="Request Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="required_date" label="Required Date">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="MEDIUM" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="LOW">Low</Select.Option>
              <Select.Option value="MEDIUM">Medium</Select.Option>
              <Select.Option value="HIGH">High</Select.Option>
              <Select.Option value="URGENT">Urgent</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="DRAFT" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="remarks" label="Remarks">
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
