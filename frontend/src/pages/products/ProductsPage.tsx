import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tooltip,
  Tag,
  message,
  Segmented,
  Row,
  Col,
  Card,
  Statistic,
  Alert,
  List,
  AutoComplete,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type Product } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { ProductService } from '@/services/ProductService';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    category: undefined as string | undefined,
    supplier: undefined as string | undefined,
    is_active: undefined as boolean | undefined,
    search: undefined as string | undefined,
  });
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [recentProducts, setRecentProducts] = useState<Product[]>(() => {
    try {
      const raw = sessionStorage.getItem('recent_products');
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch (e) {
      return [];
    }
  });

  // Queries
  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.getProducts(filters),
    select: (response) => {
      // normalize numbers inside products to avoid runtime errors when calling toFixed
      const data = response.data;
      if (Array.isArray(data?.data)) {
        const normalized = data.data.map(ProductService.normalizeProduct);
        return { ...data, data: normalized };
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ['system-categories'],
    queryFn: () => categoriesApi.getAll(),
    select: (response) => {
      if (Array.isArray(response?.data)) {
        return response.data.map((cat: any) => cat.name);
      }
      return [];
    },
  });

  // Deduplicate and fallback
  const mergedCategories = Array.from(new Set(categories || []));

  const { data: suppliers } = useQuery({
    queryKey: ['product-suppliers'],
    queryFn: () => productsApi.getSuppliers(),
    select: (data) => (Array.isArray(data.data) ? data.data : []),
  });

  // Load custom (local) suppliers from localStorage and merge with API suppliers
  const loadLocalSuppliers = () => {
    try {
      const raw = sessionStorage.getItem('custom_suppliers') || localStorage.getItem('custom_suppliers');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch (e) {
      return [] as string[];
    }
  };

  const [localSuppliers, setLocalSuppliers] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadLocalSuppliers();
  });

  const mergedSuppliers = Array.from(new Set([...(suppliers || []), ...localSuppliers]));

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: () => productsApi.getLowStockProducts(),
    select: (data) => data.data || [],
  });

  const { data: stats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => productsApi.getProductStats(),
    select: (data) => data.data,
    enabled: viewMode === 'stats',
  });

  const pushRecentProduct = (p: Product) => {
    try {
      const next = [p, ...recentProducts].slice(0, 5);
      setRecentProducts(next);
      sessionStorage.setItem('recent_products', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.createProduct(data),
    onSuccess: (res: any) => {
      const created = res.data as Product;
      message.success('Product created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      // merge supplier into local storage if not present
      try {
        const supplier = created.supplier;
        if (supplier) {
          const locals = loadLocalSuppliers();
          if (!locals.includes(supplier)) {
            const next = [...locals, supplier];
            localStorage.setItem('custom_suppliers', JSON.stringify(next));
            setLocalSuppliers(next);
          }
        }
      } catch (e) {
        // ignore
      }
      // push to recent products
      pushRecentProduct(created);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productsApi.updateProduct(id, data),
    onSuccess: (res: any) => {
      message.success('Product updated successfully');
      setIsModalVisible(false);
      setEditingProduct(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });

      try {
        const product = res.data as Product;
        if (product.supplier) {
          const locals = loadLocalSuppliers();
          if (!locals.includes(product.supplier)) {
            const next = [...locals, product.supplier];
            localStorage.setItem('custom_suppliers', JSON.stringify(next));
            setLocalSuppliers(next);
          }
        }
      } catch (e) { }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      message.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete product');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDeleteProducts(ids),
    onSuccess: () => {
      message.success('Products deleted successfully');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete products');
    },
  });

  // Handlers
  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.setFieldsValue(product);
    } else {
      setEditingProduct(null);
      setTimeout(() => form.resetFields(), 0);
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleSubmit = async (values: any) => {
    const payload = { ...values };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (product: Product) => {
    Modal.confirm({
      title: 'Delete Product',
      content: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(product.id),
    });
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select products to delete');
      return;
    }

    Modal.confirm({
      title: 'Bulk Delete Products',
      content: `Are you sure you want to delete ${selectedRowKeys.length} product(s)? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => bulkDeleteMutation.mutate(selectedRowKeys as string[]),
    });
  };

  const handleDuplicateProduct = (product: Product) => {
    const { created_at, updated_at, ...rest } = product as any;
    const newSku = `${product.sku}-COPY-${Date.now()}`.slice(0, 100);
    handleOpenModal();
    form.setFieldsValue({ ...rest, sku: newSku, name: `${product.name} (Copy)` });
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.category && <Tag color="blue">{record.category}</Tag>}
        </div>
      ),
    },
    {
      title: 'Cost Price',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      render: (price: unknown) => <span>{ProductService.formatPrice(price)}</span>,
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 120,
      render: (price: unknown) => <span className="font-semibold">{ProductService.formatPrice(price)}</span>,
    },
    {
      title: 'Margin',
      key: 'margin',
      width: 100,
      render: (_: unknown, record: Product) => {
        const margin = ProductService.calculateMargin(record.selling_price, record.cost_price);
        const colorClass = ProductService.getMarginColorClass(margin);
        return (
          <span className={colorClass}>
            {margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      title: 'Stock',
      dataIndex: 'quantity_in_stock',
      key: 'quantity_in_stock',
      width: 100,
      render: (stock: number, record: Product) => {
        const isLow = stock <= record.reorder_level;
        return (
          <Tooltip title={`Reorder level: ${record.reorder_level}`}>
            <Tag color={isLow ? 'red' : 'green'}>{stock}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      render: (supplier: string) => supplier || '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateProduct(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tableRowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products & Services</h1>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
            loading={productsFetching}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Add Product
          </Button>
        </Space>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as 'list' | 'stats')}
          options={[
            { label: 'List View', value: 'list' },
            { label: 'Statistics', value: 'stats' },
          ]}
        />
      </div>

      {/* Statistics View */}
      {viewMode === 'stats' && (
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Products"
                value={stats?.total_products || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Products"
                value={stats?.active_products || 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Stock Value"
                value={stats?.total_stock_value || 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Low Stock Items"
                value={stats?.low_stock_count || 0}
                suffix={`/ ${stats?.total_products || 0}`}
                valueStyle={{ color: stats?.low_stock_count ? '#cf1322' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts && lowStockProducts.length > 0 && viewMode === 'list' && (
        <Alert
          message="Low Stock Alert"
          description={`${lowStockProducts.length} product(s) have stock below reorder level`}
          type="warning"
          icon={<WarningOutlined />}
          showIcon
        />
      )}

      {/* Filters */}
      {viewMode === 'list' && (
        <Card>
          <Space wrap className="w-full">
            <Input
              placeholder="Search by name, SKU, or description..."
              style={{ width: 250 }}
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
              allowClear
            />
            <Select
              placeholder="Filter by category"
              style={{ minWidth: 200 }}
              value={filters.category}
              onChange={(value) =>
                setFilters({ ...filters, category: value, page: 1 })
              }
              allowClear
              options={(mergedCategories || []).map((cat: any) => ({
                label: cat,
                value: cat,
              }))}
            />
            <Select
              placeholder="Filter by supplier"
              style={{ width: 150 }}
              value={filters.supplier}
              onChange={(value) =>
                setFilters({ ...filters, supplier: value, page: 1 })
              }
              allowClear
              options={
                (mergedSuppliers || []).map((sup) => ({
                  label: sup,
                  value: sup,
                })) || []
              }
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 120 }}
              value={filters.is_active}
              onChange={(value) =>
                setFilters({ ...filters, is_active: value, page: 1 })
              }
              allowClear
              options={[
                { label: 'Active', value: true },
                { label: 'Inactive', value: false },
              ]}
            />
          </Space>
        </Card>
      )}

      {/* Bulk Actions */}
      {viewMode === 'list' && selectedRowKeys.length > 0 && (
        <Alert
          message={`${selectedRowKeys.length} product(s) selected`}
          type="info"
          action={
            <Button
              size="small"
              danger
              onClick={handleBulkDelete}
              loading={bulkDeleteMutation.isPending}
            >
              Delete Selected
            </Button>
          }
        />
      )}

      {/* Products Table */}
      {viewMode === 'list' && (
        <Table
          columns={columns}
          dataSource={productsData?.data || []}
          loading={productsLoading}
          rowKey="id"
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: productsData?.total || 0,
            onChange: (page, pageSize) => {
              setFilters({ ...filters, page, limit: pageSize });
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} products`,
          }}
          scroll={{ x: 1500 }}
          rowSelection={tableRowSelection}
        />
      )}

      {/* Recent Created Products */}
      {viewMode === 'list' && recentProducts && recentProducts.length > 0 && (
        <Card title="Recently Created" className="mt-4">
          <List
            dataSource={recentProducts}
            renderItem={(p) => (
              <List.Item
                actions={[
                  <Button key="view" type="link" onClick={() => handleOpenModal(p)}>View</Button>,
                  <Button key="dup" type="link" onClick={() => handleDuplicateProduct(p)}>Duplicate</Button>,
                ]}
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.sku} • {p.supplier || '—'}</div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Product Form Modal */}
      <Modal
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: 'Product name is required' }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU"
            rules={[
              { required: true, message: 'SKU is required' },
              { max: 100, message: 'SKU cannot exceed 100 characters' },
            ]}
          >
            <Input placeholder="Enter product SKU" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter product description" rows={3} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select or enter a category' }]}
          >
            <AutoComplete
              placeholder="Select or enter category"
              options={(mergedCategories || []).map((cat: string) => ({
                value: cat,
              }))}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>

          <Form.Item
            name="supplier"
            label="Supplier"
            rules={[{ required: true, message: 'Please select or enter a supplier' }]}
          >
            <AutoComplete
              placeholder="Select or enter supplier"
              options={(mergedSuppliers || []).map((sup) => ({
                value: sup,
              }))}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="cost_price"
                label="Cost Price"
                rules={[
                  { required: true, message: 'Cost price is required' },
                  { type: 'number', min: 0, message: 'Cost price must be non-negative' },
                ]}
              >
                <InputNumber
                  placeholder="0.00"
                  step={0.01}
                  min={0}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="selling_price"
                label="Selling Price"
                rules={[
                  { required: true, message: 'Selling price is required' },
                  { type: 'number', min: 0, message: 'Selling price must be non-negative' },
                ]}
              >
                <InputNumber
                  placeholder="0.00"
                  step={0.01}
                  min={0}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="quantity_in_stock"
                label="Quantity in Stock"
                rules={[{ type: 'number', min: 0 }]}
              >
                <InputNumber
                  placeholder="0"
                  step={1}
                  min={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="reorder_level"
                label="Reorder Level"
                rules={[{ type: 'number', min: 0 }]}
              >
                <InputNumber
                  placeholder="10"
                  step={1}
                  min={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="tax_rate"
                label="Tax Rate (%)"
                rules={[{ type: 'number', min: 0, max: 100 }]}
              >
                <InputNumber
                  placeholder="0"
                  step={0.01}
                  min={0}
                  max={100}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="unit_of_measure"
                label="Unit of Measure"
              >
                <Input placeholder="e.g., pcs, kg, ltr" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="image_url"
            label="Image URL"
          >
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

