import { useState } from 'react';
import { Button, Card, Table, Space, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { modulesApi } from '@/api/modules';
import type { ModuleInstance } from '@/types';

export default function ModuleDataPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ModuleInstance | null>(null);

  const { data: module } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      const response = await modulesApi.getModule(moduleId!);
      return response.data;
    },
    enabled: !!moduleId,
  });

  const { data: moduleData, isLoading } = useQuery({
    queryKey: ['moduleData', moduleId],
    queryFn: async () => {
      const response = await modulesApi.getModuleData(moduleId!);
      return response.data;
    },
    enabled: !!moduleId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      modulesApi.createModuleRecord(moduleId!, data),
    onSuccess: () => {
      message.success('Record created successfully');
      queryClient.invalidateQueries({ queryKey: ['moduleData', moduleId] });
      setIsModalOpen(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      modulesApi.updateModuleRecord(moduleId!, id, data),
    onSuccess: () => {
      message.success('Record updated successfully');
      queryClient.invalidateQueries({ queryKey: ['moduleData', moduleId] });
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => modulesApi.deleteModuleRecord(moduleId!, id),
    onSuccess: () => {
      message.success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['moduleData', moduleId] });
    },
  });

  const handleSubmit = (values: Record<string, unknown>) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openModal = (record?: ModuleInstance) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record.data);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const columns = [
    ...(module?.fields.map((field) => ({
      title: field.displayName,
      dataIndex: ['data', field.name],
      key: field.name,
    })) || []),
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ModuleInstance) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteMutation.mutate(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{module?.displayName} Data</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          Add Record
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={moduleData?.data}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Edit Record' : 'Add Record'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {module?.fields.map((field) => (
            <Form.Item
              key={field.name}
              label={field.displayName}
              name={field.name}
              rules={[
                { required: field.required, message: `${field.displayName} is required` },
              ]}
            >
              {field.type === 'number' ? (
                <Input type="number" />
              ) : field.type === 'boolean' ? (
                <Select options={[
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ]} />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingRecord ? 'Update' : 'Create'}
              </Button>
              <Button onClick={closeModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
