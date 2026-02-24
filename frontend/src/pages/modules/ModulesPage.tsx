import { Button, Card, Table, Space, Tag, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { modulesApi, type ModuleDefinition } from '@/api/modules';

export default function ModulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['dynamic-modules'],
    queryFn: async () => {
      const response = await modulesApi.getModules();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: modulesApi.deleteModule,
    onSuccess: () => {
      message.success('Module deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['dynamic-modules'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete module');
    },
  });

  const handleDelete = (module: ModuleDefinition) => {
    Modal.confirm({
      title: 'Delete Module',
      content: `Are you sure you want to delete "${module.displayName}"? This will delete all data in this module.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(module.id),
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: ModuleDefinition) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <span className="font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Fields',
      dataIndex: 'fields',
      key: 'fields',
      render: (fields: ModuleDefinition['fields']) => (
        <Tag color="blue">{fields?.length || 0} fields</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'tableCreated',
      key: 'tableCreated',
      render: (created: boolean) => (
        <Tag color={created ? 'green' : 'orange'}>
          {created ? 'Ready' : 'Creating...'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ModuleDefinition) => (
        <Space>
          <Button
            type="link"
            icon={<DatabaseOutlined />}
            onClick={() => navigate(`/modules/${record.name}/data`)}
            disabled={!record.tableCreated}
          >
            Data
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/modules/builder?id=${record.id}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            loading={deleteMutation.isPending}
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
        <div>
          <h1 className="text-2xl font-bold">Modules</h1>
          <p className="text-gray-600">Create and manage custom modules for your ERP system</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/modules/builder')}
        >
          Create Module
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={modules}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
