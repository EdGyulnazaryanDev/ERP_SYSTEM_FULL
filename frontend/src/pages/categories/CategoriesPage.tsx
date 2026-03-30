import { useState } from 'react';
import {
  Button,
  Card,
  Table,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  Select,
  TreeSelect,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CreateCategoryDto } from '@/api/categories';
import { useAccessControl } from '@/hooks/useAccessControl';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const colorOptions = [
  { label: 'Blue', value: '#1890ff' },
  { label: 'Green', value: '#52c41a' },
  { label: 'Red', value: '#f5222d' },
  { label: 'Orange', value: '#fa8c16' },
  { label: 'Purple', value: '#722ed1' },
  { label: 'Cyan', value: '#13c2c2' },
  { label: 'Magenta', value: '#eb2f96' },
  { label: 'Gold', value: '#faad14' },
];

export default function CategoriesPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const { get: getLimit } = usePlanLimits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const canCreateCategories = canPerform('categories', 'create');
  const canEditCategories = canPerform('categories', 'edit');
  const canDeleteCategories = canPerform('categories', 'delete');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => {
      const response = await categoriesApi.getTree();
      return response.data;
    },
    enabled: viewMode === 'tree',
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      message.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      closeModal();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCategoryDto }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      message.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      closeModal();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      message.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete category');
    },
  });

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        parent_id: category.parent_id,
        is_active: category.is_active,
        sort_order: category.sort_order,
      });
    } else {
      setEditingCategory(null);
      form.resetFields();
      form.setFieldsValue({ is_active: true, sort_order: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleSubmit = (values: CreateCategoryDto) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (category: Category) => {
    Modal.confirm({
      title: 'Delete Category',
      content: `Are you sure you want to delete "${category.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(category.id),
    });
  };

  const buildTreeSelectData = (cats: Category[] = []): any[] => {
    return cats.map((cat) => ({
      title: cat.name,
      value: cat.id,
      children: cat.children ? buildTreeSelectData(cat.children) : undefined,
    }));
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <Space>
          {record.icon && <span style={{ fontSize: '18px' }}>{record.icon}</span>}
          {!record.icon && <FolderOutlined style={{ fontSize: '18px' }} />}
          <span className="font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Parent',
      dataIndex: 'parent',
      key: 'parent',
      render: (parent: Category) => (parent ? parent.name : '-'),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) =>
        color ? (
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: color,
                borderRadius: 4,
                border: '1px solid #d9d9d9',
              }}
            />
            <span>{color}</span>
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Sort Order',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Category) => (
        <Space>
          {canEditCategories && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            >
              Edit
            </Button>
          )}
          {canDeleteCategories && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderTree = (data: Category[]): any[] => {
    return data.map((item) => ({
      title: (
        <div className="flex items-center justify-between py-2">
          <Space>
            {item.icon && <span style={{ fontSize: '18px' }}>{item.icon}</span>}
            {!item.icon && <FolderOutlined style={{ fontSize: '18px' }} />}
            <span className="font-medium">{item.name}</span>
            {item.description && (
              <span className="text-gray-500 text-sm">- {item.description}</span>
            )}
            <Tag color={item.is_active ? 'green' : 'red'}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Tag>
          </Space>
          <Space>
            {canEditCategories && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openModal(item)}
              >
                Edit
              </Button>
            )}
            {canDeleteCategories && (
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(item)}
              >
                Delete
              </Button>
            )}
          </Space>
        </div>
      ),
      key: item.id,
      children: item.children ? renderTree(item.children) : undefined,
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-600">
            Manage product and content categories
            {getLimit('categories') !== null && (
              <span style={{ marginLeft: 8, color: '#8a9bb0', fontSize: 13 }}>
                ({(categories?.length ?? 0)} / {getLimit('categories')} used)
              </span>
            )}
          </p>
        </div>
        <Space>
          <Button.Group>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              type={viewMode === 'tree' ? 'primary' : 'default'}
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </Button>
          </Button.Group>
          {canCreateCategories && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              Create Category
            </Button>
          )}
        </Space>
      </div>

      <Card>
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={categories}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <div className="p-4">
            {categoryTree && categoryTree.length > 0 ? (
              <div className="space-y-2">
                {renderTree(categoryTree).map((node) => (
                  <Card key={node.key} size="small">
                    {node.title}
                    {node.children && node.children.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2">
                        {node.children.map((child: any) => (
                          <Card key={child.key} size="small">
                            {child.title}
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No categories found
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {(canCreateCategories || canEditCategories) && (
        <Modal
          title={editingCategory ? 'Edit Category' : 'Create Category'}
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Electronics, Clothing" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Category description" />
          </Form.Item>

          <Form.Item label="Parent Category" name="parent_id">
            <TreeSelect
              placeholder="Select parent category (optional)"
              allowClear
              treeData={buildTreeSelectData(categoryTree || categories || [])}
              treeDefaultExpandAll
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Color" name="color">
              <Select
                placeholder="Select color"
                allowClear
                options={colorOptions}
              />
            </Form.Item>

            <Form.Item label="Icon (Emoji)" name="icon">
              <Input placeholder="e.g., 📱, 👕, 🏠" maxLength={2} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Sort Order" name="sort_order">
              <InputNumber min={0} className="w-full" />
            </Form.Item>

            <Form.Item label="Active" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={closeModal}>Cancel</Button>
            </Space>
          </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
