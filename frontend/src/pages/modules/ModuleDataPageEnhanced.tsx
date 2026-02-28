import { useState } from 'react';
import { Button, Card, Space, Modal, Form, message, Input, Table, Tag } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { modulesApi, type ModuleField } from '@/api/modules';

export default function ModuleDataPageEnhanced() {
  const { moduleName } = useParams<{ moduleName: string }>();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch module definition
  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['dynamic-modules', moduleName],
    queryFn: async () => {
      const modules = await modulesApi.getModules();
      return modules.data.find(m => m.name === moduleName);
    },
    enabled: !!moduleName,
  });

  // Fetch module data
  const { data: moduleData, isLoading: dataLoading } = useQuery({
    queryKey: ['module-data', moduleName, page, pageSize],
    queryFn: async () => {
      const response = await modulesApi.getModuleData(moduleName!, {
        page,
        limit: pageSize,
      });
      return response.data;
    },
    enabled: !!moduleName,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      modulesApi.createModuleRecord(moduleName!, data),
    onSuccess: () => {
      message.success('Record created successfully');
      queryClient.invalidateQueries({ queryKey: ['module-data', moduleName] });
      setIsModalOpen(false);
      setTimeout(() => form.resetFields(), 0);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      modulesApi.updateModuleRecord(moduleName!, id, data),
    onSuccess: () => {
      message.success('Record updated successfully');
      queryClient.invalidateQueries({ queryKey: ['module-data', moduleName] });
      setIsModalOpen(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update record');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      modulesApi.deleteModuleRecord(moduleName!, id),
    onSuccess: () => {
      message.success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['module-data', moduleName] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete record');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      modulesApi.bulkDeleteRecords(moduleName!, ids),
    onSuccess: () => {
      message.success('Records deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['module-data', moduleName] });
      setSelectedRows([]);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete records');
    },
  });

  const handleSubmit = (values: Record<string, any>) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this record?',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      message.warning('Please select rows to delete');
      return;
    }

    Modal.confirm({
      title: 'Confirm Bulk Delete',
      content: `Are you sure you want to delete ${selectedRows.length} records?`,
      onOk: () => bulkDeleteMutation.mutate(selectedRows),
    });
  };

  const openModal = (record?: any) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setTimeout(() => form.resetFields(), 0);
  };

  const renderFieldInput = (field: ModuleField) => {
    switch (field.type) {
      case 'longtext':
        return <Input.TextArea rows={4} />;
      case 'number':
      case 'integer':
      case 'decimal':
        return <Input type="number" step={field.type === 'decimal' ? '0.01' : '1'} />;
      case 'date':
        return <Input type="date" />;
      case 'datetime':
        return <Input type="datetime-local" />;
      case 'boolean':
        return (
          <select className="ant-input">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'email':
        return <Input type="email" />;
      case 'phone':
        return <Input type="tel" />;
      case 'url':
        return <Input type="url" />;
      default:
        return <Input />;
    }
  };

  const renderFieldValue = (value: any, field: ModuleField) => {
    if (value === null || value === undefined) return '-';

    switch (field.type) {
      case 'boolean':
        return <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag>;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      default:
        return String(value);
    }
  };

  const columns = [
    ...(module?.fields.map((field) => ({
      title: field.displayName,
      dataIndex: field.name,
      key: field.name,
      render: (value: any) => renderFieldValue(value, field),
    })) || []),
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  if (moduleLoading) {
    return <div>Loading module...</div>;
  }

  if (!module) {
    return <div>Module not found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{module.displayName} Data</h1>
          <p className="text-gray-500">{module.description}</p>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            Add Record
          </Button>
        </Space>
      </div>

      {selectedRows.length > 0 && (
        <Card className="mb-4 bg-blue-50">
          <div className="flex justify-between items-center">
            <span>{selectedRows.length} rows selected</span>
            <Button danger onClick={handleBulkDelete}>
              Delete Selected
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={moduleData?.data || []}
          loading={dataLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: moduleData?.total || 0,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          rowSelection={{
            selectedRowKeys: selectedRows,
            onChange: (keys) => setSelectedRows(keys as string[]),
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRecord ? 'Edit Record' : 'Add Record'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {module.fields.map((field) => (
            <Form.Item
              key={field.name}
              label={field.displayName}
              name={field.name}
              rules={[
                { required: field.required, message: `${field.displayName} is required` },
              ]}
            >
              {renderFieldInput(field)}
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
