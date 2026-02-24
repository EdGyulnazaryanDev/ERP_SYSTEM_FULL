# Usage Examples

## Complete CRUD Example

Here's a complete example of building a custom module page with all features:

```typescript
// src/pages/customers/CustomersPage.tsx
import { useState } from 'react';
import { Button, Card, Modal, Form, Space, Drawer } from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { BaseService } from '@/services/BaseService';
import DataTable from '@/components/common/DataTable';
import DynamicForm from '@/components/forms/DynamicForm';
import FilterBuilder from '@/components/forms/FilterBuilder';
import BulkImport from '@/components/forms/BulkImport';
import { useDataTable } from '@/hooks/useDataTable';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import type { DataTableColumn } from '@/components/common/DataTable';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const customerService = new BaseService<Customer>('/customers');

export default function CustomersPage() {
  const [form] = Form.useForm();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Table state management
  const {
    page,
    pageSize,
    queryParams,
    handlePageChange,
    handleFilterChange,
    handleSortChange,
    handleSearchChange,
  } = useDataTable(20);

  // CRUD operations
  const {
    isModalOpen,
    editingRecord,
    openModal,
    closeModal,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useCrudOperations<Customer>(customerService, ['customers']);

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: async () => {
      const response = await customerService.getAll(queryParams);
      return response.data;
    },
  });

  // Define columns
  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      filterable: true,
      sortable: true,
    },
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
      filterable: true,
    },
    {
      key: 'phone',
      title: 'Phone',
      dataIndex: 'phone',
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      render: (value) => (
        <Tag color={value === 'active' ? 'green' : 'red'}>
          {value}
        </Tag>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              openModal(record);
              form.setFieldsValue(record);
            }}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => deleteMutation.mutate(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = (values: Partial<Customer>) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleExport = async () => {
    const blob = await customerService.export(queryParams, 'xlsx');
    // Download logic
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Space>
          <Input.Search
            placeholder="Search customers..."
            onSearch={handleSearchChange}
            style={{ width: 250 }}
          />
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            Filters
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setBulkImportOpen(true)}
          >
            Import
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            Add Customer
          </Button>
        </Space>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          total={data?.total}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onExport={handleExport}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRecord ? 'Edit Customer' : 'Add Customer'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </Form.Item>
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

      {/* Filter Drawer */}
      <Drawer
        title="Advanced Filters"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
      >
        <FilterBuilder
          fields={[
            { name: 'name', displayName: 'Name', type: 'text', required: false },
            { name: 'email', displayName: 'Email', type: 'email', required: false },
            { name: 'status', displayName: 'Status', type: 'select', required: false },
          ]}
          onFilterChange={handleFilterChange}
        />
      </Drawer>
    </div>
  );
}
```

## Service Usage Examples

### Basic CRUD Operations

```typescript
import { BaseService } from '@/services/BaseService';

const productService = new BaseService('/products');

// Create
const newProduct = await productService.create({
  name: 'Product 1',
  price: 99.99,
  stock: 100
});

// Read all with filters
const products = await productService.getAll({
  page: 1,
  pageSize: 20,
  filters: [
    { field: 'price', operator: 'gte', value: 50 },
    { field: 'stock', operator: 'gt', value: 0 }
  ],
  sort: [
    { field: 'price', order: 'asc' }
  ]
});

// Read one
const product = await productService.getById('123');

// Update
const updated = await productService.update('123', {
  price: 89.99
});

// Partial update
const patched = await productService.patch('123', {
  stock: 95
});

// Delete
await productService.delete('123');

// Bulk delete
await productService.bulkDelete(['123', '456', '789']);

// Export
const blob = await productService.export(
  { filters: [...] },
  'xlsx'
);
```

### Advanced Filtering

```typescript
// Multiple conditions
const filters = [
  { field: 'status', operator: 'eq', value: 'active' },
  { field: 'price', operator: 'between', value: [10, 100] },
  { field: 'name', operator: 'like', value: 'Product' },
  { field: 'category', operator: 'in', value: ['electronics', 'books'] }
];

const result = await service.getAll({ filters });
```

### Complex Queries

```typescript
// Search with filters and sorting
const result = await service.getAll({
  page: 1,
  pageSize: 50,
  search: 'laptop',
  filters: [
    { field: 'price', operator: 'lte', value: 1000 },
    { field: 'inStock', operator: 'eq', value: true }
  ],
  sort: [
    { field: 'rating', order: 'desc' },
    { field: 'price', order: 'asc' }
  ]
});
```

## Hook Usage Examples

### useDataTable Hook

```typescript
import { useDataTable } from '@/hooks/useDataTable';

function MyComponent() {
  const {
    page,
    pageSize,
    filters,
    sort,
    search,
    queryParams,
    handlePageChange,
    handleFilterChange,
    handleSortChange,
    handleSearchChange,
    resetFilters,
  } = useDataTable(10);

  // Use queryParams in your query
  const { data } = useQuery({
    queryKey: ['data', queryParams],
    queryFn: () => service.getAll(queryParams),
  });

  return (
    <DataTable
      onPageChange={handlePageChange}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      {...otherProps}
    />
  );
}
```

### useCrudOperations Hook

```typescript
import { useCrudOperations } from '@/hooks/useCrudOperations';

function MyComponent() {
  const {
    isModalOpen,
    editingRecord,
    openModal,
    closeModal,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkDeleteMutation,
  } = useCrudOperations(service, ['queryKey']);

  const handleSubmit = (values) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <>
      <Button onClick={() => openModal()}>Add</Button>
      <Button onClick={() => openModal(record)}>Edit</Button>
      <Button onClick={() => deleteMutation.mutate(id)}>Delete</Button>
      
      <Modal open={isModalOpen} onCancel={closeModal}>
        <Form onFinish={handleSubmit}>
          {/* form fields */}
        </Form>
      </Modal>
    </>
  );
}
```

### usePermissions Hook

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { canWrite, canDelete, isAdmin } = usePermissions();

  return (
    <>
      {canWrite && <Button>Edit</Button>}
      {canDelete && <Button danger>Delete</Button>}
      {isAdmin && <Button>Admin Panel</Button>}
    </>
  );
}
```

## Component Examples

### DataTable with All Features

```typescript
<DataTable
  columns={[
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      filterable: true,
      filterType: 'text',
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      sortable: true,
    },
    {
      key: 'createdAt',
      title: 'Created',
      dataIndex: 'createdAt',
      filterable: true,
      filterType: 'dateRange',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ]}
  data={data}
  loading={loading}
  total={total}
  page={page}
  pageSize={pageSize}
  onPageChange={handlePageChange}
  onFilterChange={handleFilterChange}
  onSortChange={handleSortChange}
  onExport={handleExport}
  rowSelection={{
    selectedRowKeys: selected,
    onChange: setSelected,
  }}
/>
```

### DynamicForm with Validation

```typescript
<DynamicForm
  form={form}
  fields={[
    {
      name: 'email',
      displayName: 'Email',
      type: 'email',
      required: true,
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      }
    },
    {
      name: 'age',
      displayName: 'Age',
      type: 'number',
      required: true,
      validation: {
        min: 18,
        max: 100
      }
    },
    {
      name: 'country',
      displayName: 'Country',
      type: 'select',
      required: true,
      validation: {
        options: ['USA', 'UK', 'Canada']
      }
    }
  ]}
  initialValues={record}
  onSubmit={handleSubmit}
  loading={loading}
/>
```

### Permission Guard

```typescript
import PermissionGuard from '@/components/common/PermissionGuard';

<PermissionGuard
  requiredPermission="admin"
  fallback={<div>Access Denied</div>}
>
  <AdminPanel />
</PermissionGuard>
```

## Real-World Scenarios

### Scenario 1: Product Management with Inventory

```typescript
// Create custom service
class ProductService extends BaseService<Product> {
  constructor() {
    super('/products');
  }

  async updateStock(id: string, quantity: number) {
    return this.patch(id, { stock: quantity });
  }

  async getLowStock(threshold: number = 10) {
    return this.getAll({
      filters: [
        { field: 'stock', operator: 'lte', value: threshold }
      ]
    });
  }
}

// Use in component
const productService = new ProductService();
const lowStock = await productService.getLowStock(5);
```

### Scenario 2: Order Processing with Status Workflow

```typescript
class OrderService extends BaseService<Order> {
  async updateStatus(orderId: string, status: OrderStatus) {
    return this.patch(orderId, { status });
  }

  async getOrdersByStatus(status: OrderStatus) {
    return this.getAll({
      filters: [{ field: 'status', operator: 'eq', value: status }]
    });
  }

  async getOrdersInDateRange(startDate: string, endDate: string) {
    return this.getAll({
      filters: [
        { field: 'createdAt', operator: 'between', value: [startDate, endDate] }
      ]
    });
  }
}
```

### Scenario 3: Customer Analytics Dashboard

```typescript
function CustomerAnalytics() {
  const { queryParams } = useDataTable();

  const { data: customers } = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: () => customerService.getAll(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/customers/stats');
      return response.data;
    },
  });

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="Total Customers" value={stats?.total} />
        </Col>
        <Col span={6}>
          <Statistic title="Active" value={stats?.active} />
        </Col>
        <Col span={6}>
          <Statistic title="New This Month" value={stats?.newThisMonth} />
        </Col>
      </Row>
      
      <DataTable
        columns={columns}
        data={customers?.data}
        {...tableProps}
      />
    </div>
  );
}
```
