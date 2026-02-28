import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function BinsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bins'],
    queryFn: () => apiClient.get('/inventory/bins').then(res => res.data),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiClient.get('/inventory').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/inventory/bins', data),
    onSuccess: () => {
      message.success('Bin created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create bin'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/inventory/bins/${id}`, data),
    onSuccess: () => {
      message.success('Bin updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update bin'),
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
    { title: 'Bin Code', dataIndex: 'bin_code', key: 'bin_code' },
    { title: 'Warehouse', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    { title: 'Zone', dataIndex: 'zone', key: 'zone' },
    { title: 'Aisle', dataIndex: 'aisle', key: 'aisle' },
    { title: 'Rack', dataIndex: 'rack', key: 'rack' },
    { title: 'Level', dataIndex: 'level', key: 'level' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
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
        <h2 className="text-xl font-semibold">Bins & Locations</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Bin
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Bin' : 'Add Bin'}
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
          <Form.Item name="warehouse_id" label="Warehouse" rules={[{ required: true }]}>
            <Select placeholder="Select Warehouse">
              {warehouses?.data?.map((w: any) => (
                <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="bin_code" label="Bin Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. A1-01" />
          </Form.Item>

          <Form.Item name="zone" label="Zone">
            <Input placeholder="e.g. Zone A" />
          </Form.Item>

          <Form.Item name="aisle" label="Aisle">
            <Input placeholder="e.g. Aisle 1" />
          </Form.Item>

          <Form.Item name="rack" label="Rack">
            <Input placeholder="e.g. Rack 3" />
          </Form.Item>

          <Form.Item name="level" label="Level">
            <Input placeholder="e.g. Level 2" />
          </Form.Item>

          <Form.Item name="capacity" label="Capacity">
            <Input type="number" placeholder="Bin capacity" />
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
