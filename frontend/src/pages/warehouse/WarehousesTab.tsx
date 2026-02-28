import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function WarehousesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiClient.get('/inventory').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/inventory', data),
    onSuccess: () => {
      message.success('Warehouse created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create warehouse'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/inventory/${id}`, data),
    onSuccess: () => {
      message.success('Warehouse updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update warehouse'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      capacity: Number(values.capacity)
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'warehouse_code', key: 'warehouse_code' },
    { title: 'Name', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Manager', dataIndex: 'manager_name', key: 'manager_name' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag> },
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
                form.setFieldsValue(record);
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
        <h2 className="text-xl font-semibold">Warehouses</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Warehouse
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Warehouse' : 'Add Warehouse'}
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
          <Form.Item name="warehouse_code" label="Warehouse Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. WH-01" />
          </Form.Item>

          <Form.Item name="warehouse_name" label="Warehouse Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Main Distribution Center" />
          </Form.Item>

          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Full address/location" />
          </Form.Item>

          <Form.Item name="manager_name" label="Manager Name">
            <Input placeholder="Manager's full name" />
          </Form.Item>

          <Form.Item name="capacity" label="Capacity">
            <Input type="number" placeholder="Total storage capacity" />
          </Form.Item>

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
