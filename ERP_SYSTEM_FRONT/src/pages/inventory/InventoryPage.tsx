import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  InboxOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { inventoryApi, type Inventory } from '@/api/inventory';

const { Search } = Input;

export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>();

  console.log('InventoryPage rendering');

  // Safe number conversion helper
  const toSafeNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Safe currency formatter
  const formatCurrency = (value: unknown): string => {
    const num = toSafeNumber(value);
    return `$${num.toFixed(2)}`;
  };

  const { data: items = [], isLoading, error, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      try {
        console.log('Fetching inventory...');
        const response = await inventoryApi.getAll();
        console.log('Inventory response:', response);
        const data = response?.data;
        
        if (!data) {
          console.warn('No data in response');
          return [];
        }
        
        if (!Array.isArray(data)) {
          console.warn('Data is not an array:', typeof data, data);
          return [];
        }
        
        console.log('Inventory items count:', data.length);
        return data;
      } catch (e) {
        console.error('Error fetching inventory:', e);
        throw e;
      }
    },
    retry: 1,
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      try {
        const response = await inventoryApi.getSummary();
        return response?.data || {
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
        };
      } catch (e) {
        console.error('Error fetching inventory summary:', e);
        return {
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
        };
      }
    },
  });

  const safeItems = Array.isArray(items) ? items : [];
  
  const filteredItems = safeItems.filter((item: Inventory) => {
    if (!item) return false;
    
    const productName = item?.product_name || '';
    const sku = item?.sku || '';
    const location = item?.location || '';
    
    const matchesSearch =
      productName.toLowerCase().includes(searchText.toLowerCase()) ||
      sku.toLowerCase().includes(searchText.toLowerCase());
    const matchesLocation = !locationFilter || location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const locations = Array.from(
    new Set(
      safeItems
        .map((item: Inventory) => item?.location)
        .filter((loc): loc is string => Boolean(loc))
    )
  );

  const handleDelete = async (id: string) => {
    try {
      await inventoryApi.delete(id);
      message.success('Inventory item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    } catch (e: unknown) {
      console.error('Delete error:', e);
      const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(errorMessage || 'Failed to delete inventory item');
    }
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: (a: Inventory, b: Inventory) => {
        const nameA = a?.product_name || '';
        const nameB = b?.product_name || '';
        return nameA.localeCompare(nameB);
      },
      render: (text: string) => text || '-',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text: string) => text || '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: Inventory) => {
        const qty = toSafeNumber(quantity);
        const reorderLevel = toSafeNumber(record?.reorder_level);
        const isLowStock = qty <= reorderLevel && qty > 0;
        const isOutOfStock = qty === 0;
        return (
          <Space>
            <span>{qty}</span>
            {isOutOfStock && <Tag color="red">Out of Stock</Tag>}
            {isLowStock && <Tag color="orange">Low Stock</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Available',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      render: (qty: number) => toSafeNumber(qty),
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved_quantity',
      key: 'reserved_quantity',
      render: (qty: number) => toSafeNumber(qty),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => location || '-',
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      render: (cost: number) => formatCurrency(cost),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Total Value',
      key: 'total_value',
      render: (_: unknown, record: Inventory) => {
        const qty = toSafeNumber(record?.quantity);
        const cost = toSafeNumber(record?.unit_cost);
        return formatCurrency(qty * cost);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: unknown, record: Inventory) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/inventory/${record.id}/edit`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this item?"
            description="Are you sure you want to delete this inventory item?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isError) {
    const errorMsg = (error as Error)?.message || 'Failed to load inventory data';
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
            <h2>Error Loading Inventory</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>{errorMsg}</p>
            <Space>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
              >
                Retry
              </Button>
              <Button onClick={() => navigate('/inventory/create')}>
                Add First Item
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Items"
              value={toSafeNumber(summary?.totalItems)}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Quantity"
              value={toSafeNumber(summary?.totalQuantity)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={toSafeNumber(summary?.totalValue)}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={toSafeNumber(summary?.lowStockItems)}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {safeItems.length === 0 && !isLoading && (
        <Alert
          message="No Inventory Items"
          description="You haven't added any inventory items yet. Click the 'Add Item' button to get started."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button type="primary" onClick={() => navigate('/inventory/create')}>
              Add First Item
            </Button>
          }
        />
      )}

      <Card
        title="Inventory Management"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['inventory'] });
                queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
              }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/inventory/create')}
            >
              Add Item
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Search
                placeholder="Search by product name or SKU"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={12}>
              <Select
                placeholder="Filter by location"
                style={{ width: '100%' }}
                value={locationFilter}
                onChange={setLocationFilter}
                allowClear
              >
                {locations.map((location) => (
                  <Select.Option key={location} value={location}>
                    {location}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: isLoading ? 'Loading...' : 'No inventory items found',
          }}
        />
      </Card>
    </div>
  );
}
