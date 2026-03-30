import { useState, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, Switch, Tooltip, Tag, message, Row, Col, Card,
  Alert, List, AutoComplete, Dropdown, Segmented,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  WarningOutlined, DollarOutlined, ShoppingCartOutlined, CopyOutlined,
  CheckCircleOutlined, MoreOutlined,
  AppstoreOutlined, StopOutlined, RiseOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type Product } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { ProductService } from '@/services/ProductService';
import { useAccessControl } from '@/hooks/useAccessControl';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useDebounce } from '@/hooks/useDebounce';

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon, active, onClick, suffix,
}: {
  label: string; value: number | string; color: string; icon: React.ReactNode;
  active?: boolean; onClick?: () => void; suffix?: string;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        background: active ? `${color}14` : `${color}08`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 0 0 3px ${color}22` : undefined,
        transform: active ? 'translateY(-1px)' : undefined,
      }}
      styles={{ body: { padding: '14px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: active ? `${color}28` : `${color}18`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>
            {value}{suffix && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>{suffix}</span>}
          </div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>
            {label}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const { get: getLimit } = usePlanLimits();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [productLens, setProductLens] = useState<'all' | 'lowMargin' | 'attention' | 'unsourced'>('all');
  const [tableDensity, setTableDensity] = useState<'small' | 'middle'>('small');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    category: undefined as string | undefined,
    supplier: undefined as string | undefined,
    is_active: undefined as boolean | undefined,
    search: undefined as string | undefined,
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [recentProducts, setRecentProducts] = useState<Product[]>(() => {
    try {
      const raw = sessionStorage.getItem('recent_products');
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch { return []; }
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ['products', { ...filters, search: debouncedSearch || undefined }],
    queryFn: () => productsApi.getProducts({ ...filters, search: debouncedSearch || undefined }),
    select: (response) => {
      const data = response.data;
      if (Array.isArray(data?.data)) {
        return { ...data, data: data.data.map(ProductService.normalizeProduct) };
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await categoriesApi.getAll();
      return r.data;
    },
    select: (data) => {
      const list = Array.isArray(data) ? data : [];
      return list.filter((c: any) => c?.is_active !== false).map((c: any) => c.name as string);
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['product-suppliers'],
    queryFn: () => productsApi.getSuppliers(),
    select: (d) => Array.isArray(d.data) ? d.data : [],
  });

  const { data: stats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => productsApi.getProductStats(),
    select: (d) => d.data,
  });

  const loadLocalSuppliers = () => {
    try {
      const raw = sessionStorage.getItem('custom_suppliers') || localStorage.getItem('custom_suppliers');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return [] as string[]; }
  };

  const [localSuppliers, setLocalSuppliers] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : loadLocalSuppliers()
  );

  const mergedCategories = Array.from(new Set(categories || []));
  const mergedSuppliers = Array.from(
    new Set([...(suppliers || []), ...localSuppliers].filter((s): s is string => typeof s === 'string' && s.trim() !== ''))
  );

  // ── Computed stats ─────────────────────────────────────────────────────────
  const allProducts = useMemo(() => productsData?.data ?? [], [productsData]);

  const computedStats = useMemo(() => {
    const total = stats?.total_products ?? allProducts.length;
    const active = stats?.active_products ?? allProducts.filter(p => p.is_active).length;
    const lowStock = stats?.low_stock_count ?? allProducts.filter(p => p.quantity_in_stock <= p.reorder_level).length;
    const inactive = allProducts.filter(p => !p.is_active).length;
    const stockValue = stats?.total_stock_value ?? 0;
    return { total, active, lowStock, inactive, stockValue };
  }, [allProducts, stats]);

  // ── Stat filter logic ──────────────────────────────────────────────────────
  const toggleStatFilter = (key: string) => {
    if (activeStatFilter === key) {
      setActiveStatFilter(null);
      setFilters(f => ({ ...f, is_active: undefined, page: 1 }));
    } else {
      setActiveStatFilter(key);
      if (key === 'active') setFilters(f => ({ ...f, is_active: true, page: 1 }));
      else if (key === 'inactive') setFilters(f => ({ ...f, is_active: false, page: 1 }));
      else setFilters(f => ({ ...f, is_active: undefined, page: 1 }));
    }
  };

  // Low stock filter is client-side only
  const filteredProducts = useMemo(() => {
    let next = allProducts;

    if (activeStatFilter === 'lowStock') {
      next = next.filter((product) => Number(product.quantity_in_stock) <= Number(product.reorder_level));
    }

    if (productLens === 'lowMargin') {
      next = next.filter((product) => ProductService.calculateMargin(product.selling_price, product.cost_price) < 15);
    } else if (productLens === 'attention') {
      next = next.filter((product) =>
        Number(product.quantity_in_stock) <= Number(product.reorder_level)
        || ProductService.calculateMargin(product.selling_price, product.cost_price) <= 0,
      );
    } else if (productLens === 'unsourced') {
      next = next.filter((product) => !product.supplier?.trim());
    }

    return next;
  }, [allProducts, activeStatFilter, productLens]);

  const pushRecentProduct = (p: Product) => {
    try {
      const next = [p, ...recentProducts].slice(0, 5);
      setRecentProducts(next);
      sessionStorage.setItem('recent_products', JSON.stringify(next));
    } catch { /* ignore */ }
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.createProduct(data),
    onSuccess: (res: any) => {
      const created = res.data as Product;
      message.success('Product created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
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
      } catch { /* ignore */ }
      pushRecentProduct(created);
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.updateProduct(id, data),
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
      } catch { /* ignore */ }
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      message.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete product'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDeleteProducts(ids),
    onSuccess: () => {
      message.success('Products deleted');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete products'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenModal = (product?: Product) => {
    if (product) { setEditingProduct(product); form.setFieldsValue(product); }
    else { setEditingProduct(null); setTimeout(() => form.resetFields(), 0); }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleSubmit = (values: any) => {
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data: values });
    else createMutation.mutate(values);
  };

  const handleDelete = (product: Product) => {
    Modal.confirm({
      title: 'Delete Product',
      content: `Are you sure you want to delete "${product.name}"?`,
      okText: 'Delete', okType: 'danger',
      onOk: () => deleteMutation.mutate(product.id),
    });
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) { message.warning('Select products first'); return; }
    Modal.confirm({
      title: 'Bulk Delete',
      content: `Delete ${selectedRowKeys.length} product(s)?`,
      okText: 'Delete', okType: 'danger',
      onOk: () => bulkDeleteMutation.mutate(selectedRowKeys),
    });
  };

  const handleDuplicateProduct = (product: Product) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { created_at, updated_at, ...rest } = product as any;
    handleOpenModal();
    form.setFieldsValue({ ...rest, sku: `${product.sku}-COPY-${Date.now()}`.slice(0, 100), name: `${product.name} (Copy)` });
  };

  const canCreateProducts = canPerform('products', 'create');
  const canEditProducts = canPerform('products', 'edit');
  const canDeleteProducts = canPerform('products', 'delete');
  const canExportProducts = canPerform('products', 'export');

  const productInsights = useMemo(() => {
    const avgMargin = allProducts.length
      ? allProducts.reduce(
        (sum, product) => sum + ProductService.calculateMargin(product.selling_price, product.cost_price),
        0,
      ) / allProducts.length
      : 0;
    const unsourcedCount = allProducts.filter((product) => !product.supplier?.trim()).length;
    const outOfStockCount = allProducts.filter((product) => Number(product.quantity_in_stock) === 0).length;
    const categoryCount = new Map<string, number>();
    allProducts.forEach((product) => {
      if (product.category) {
        categoryCount.set(product.category, (categoryCount.get(product.category) ?? 0) + 1);
      }
    });
    const topCategory = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      avgMargin,
      unsourcedCount,
      outOfStockCount,
      topCategory,
      negativeMarginCount: allProducts.filter(
        (product) => ProductService.calculateMargin(product.selling_price, product.cost_price) <= 0,
      ).length,
    };
  }, [allProducts]);

  const resetWorkspace = () => {
    setProductLens('all');
    setActiveStatFilter(null);
    setSearchInput('');
    setFilters({
      page: 1,
      limit: 50,
      category: undefined,
      supplier: undefined,
      is_active: undefined,
      search: undefined,
    });
  };

  const exportProductsCsv = () => {
    const rows = filteredProducts.map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category ?? '',
      supplier: product.supplier ?? '',
      cost_price: Number(product.cost_price ?? 0).toFixed(2),
      selling_price: Number(product.selling_price ?? 0).toFixed(2),
      quantity_in_stock: Number(product.quantity_in_stock ?? 0),
      reorder_level: Number(product.reorder_level ?? 0),
      margin_percent: ProductService.calculateMargin(product.selling_price, product.cost_price).toFixed(2),
      status: product.is_active ? 'active' : 'inactive',
    }));

    if (!rows.length) {
      message.warning('No products available to export');
      return;
    }

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map((row) => header.map((key) => JSON.stringify(String(row[key as keyof typeof row] ?? ''))).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-workspace-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 130,
      fixed: 'left' as const,
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--app-text-muted)' }}>{text}</span>
      ),
    },
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--app-text)' }}>{text}</div>
          {record.category && (
            <Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>{record.category}</Tag>
          )}
          {record.description && (
            <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cost',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 100,
      align: 'right' as const,
      render: (price: unknown) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{ProductService.formatPrice(price)}</span>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 100,
      align: 'right' as const,
      render: (price: unknown) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{ProductService.formatPrice(price)}</span>
      ),
    },
    {
      title: 'Margin',
      key: 'margin',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, record: Product) => {
        const margin = ProductService.calculateMargin(record.selling_price, record.cost_price);
        const color = margin > 20 ? '#52c41a' : margin > 0 ? '#1677ff' : '#ff4d4f';
        const bg = margin > 20 ? '#f6ffed' : margin > 0 ? '#e6f4ff' : '#fff2f0';
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 8px', borderRadius: 20,
            background: bg, color, border: `1px solid ${color}33`,
            fontSize: 11, fontWeight: 600,
          }}>
            <RiseOutlined style={{ fontSize: 9 }} />
            {margin.toFixed(1)}%
          </div>
        );
      },
    },
    {
      title: 'Stock',
      dataIndex: 'quantity_in_stock',
      key: 'quantity_in_stock',
      width: 90,
      align: 'center' as const,
      render: (stock: number, record: Product) => {
        const isOut = stock === 0;
        const isLow = !isOut && stock <= record.reorder_level;
        const color = isOut ? '#ff4d4f' : isLow ? '#fa8c16' : '#52c41a';
        const bg = isOut ? '#fff2f0' : isLow ? '#fff7e6' : '#f6ffed';
        return (
          <Tooltip title={`Reorder level: ${record.reorder_level}`}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 8px', borderRadius: 20,
              background: bg, color, border: `1px solid ${color}33`,
              fontSize: 11, fontWeight: 600,
            }}>
              {isOut ? '✕ Out' : isLow ? `⚠ ${stock}` : `✓ ${stock}`}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 140,
      ellipsis: true,
      render: (supplier: string) => supplier
        ? <Tag color="geekblue" style={{ fontSize: 11 }}>{supplier}</Tag>
        : <span style={{ color: 'var(--app-text-soft)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      align: 'center' as const,
      render: (isActive: boolean) => (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 20,
          background: isActive ? '#f6ffed' : '#f5f5f5',
          color: isActive ? '#52c41a' : 'var(--app-text-muted)',
          border: `1px solid ${isActive ? '#52c41a33' : '#d9d9d9'}`,
          fontSize: 11, fontWeight: 600,
        }}>
          {isActive ? <CheckCircleOutlined /> : <StopOutlined />}
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, record: Product) => {
        const menuItems = [
          canEditProducts
            ? { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleOpenModal(record) }
            : null,
          canCreateProducts
            ? { key: 'dup', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => handleDuplicateProduct(record) }
            : null,
          canEditProducts && canDeleteProducts ? { type: 'divider' as const } : null,
          canDeleteProducts
            ? { key: 'del', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record) }
            : null,
        ].filter(Boolean);

        if (!menuItems.length) {
          return null;
        }

        return (
          <Dropdown menu={{ items: menuItems as NonNullable<typeof menuItems[number]>[] }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <AppstoreOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Products & Services
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
            Manage your product catalog, pricing, and stock levels
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
            loading={productsFetching}
            style={{ borderRadius: 8 }}
          >
            Refresh
          </Button>
          {canCreateProducts && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              style={{ borderRadius: 8 }}
              onClick={() => handleOpenModal()}
            >
              Add Product
            </Button>
          )}
        </Space>
      </div>

      {/* Stat cards */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Total Products" value={computedStats.total} color="#1677ff"
            icon={<ShoppingCartOutlined />}
            active={activeStatFilter === null && filters.is_active === undefined}
            onClick={() => { setActiveStatFilter(null); setFilters(f => ({ ...f, is_active: undefined, page: 1 })); }}
            suffix={getLimit('products') !== null ? ` / ${getLimit('products')}` : undefined}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Active" value={computedStats.active} color="#52c41a"
            icon={<CheckCircleOutlined />}
            active={activeStatFilter === 'active'}
            onClick={() => toggleStatFilter('active')}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Inactive" value={computedStats.inactive} color="#8c8c8c"
            icon={<StopOutlined />}
            active={activeStatFilter === 'inactive'}
            onClick={() => toggleStatFilter('inactive')}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Low Stock" value={computedStats.lowStock} color="#fa8c16"
            icon={<WarningOutlined />}
            active={activeStatFilter === 'lowStock'}
            onClick={() => toggleStatFilter('lowStock')}
          />
        </Col>
        <Col xs={12} sm={8} md={8} lg={8}>
          <StatCard
            label="Total Stock Value" value={`$${Number(computedStats.stockValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="#722ed1" icon={<DollarOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 12,
              border: '1px solid rgba(84, 214, 255, 0.18)',
              background: 'linear-gradient(135deg, rgba(8, 41, 63, 0.94) 0%, rgba(11, 57, 83, 0.88) 100%)',
              boxShadow: '0 20px 40px rgba(2, 10, 19, 0.18)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)' }}>Product Control Tower</div>
                <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 4 }}>
                  Focus on margin leaks, stock risk, and supplier gaps without leaving the page.
                </div>
              </div>
              <Space wrap>
                <Segmented
                  value={productLens}
                  onChange={(value) => setProductLens(value as typeof productLens)}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Low Margin', value: 'lowMargin' },
                    { label: 'Attention', value: 'attention' },
                    { label: 'No Supplier', value: 'unsourced' },
                  ]}
                />
                <Segmented
                  value={tableDensity}
                  onChange={(value) => setTableDensity(value as typeof tableDensity)}
                  options={[
                    { label: 'Compact', value: 'small' },
                    { label: 'Comfort', value: 'middle' },
                  ]}
                />
                <Button onClick={resetWorkspace}>Reset</Button>
                {canExportProducts && (
                  <Button icon={<DownloadOutlined />} onClick={exportProductsCsv}>
                    Export CSV
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: 12,
              background: 'rgba(8, 25, 40, 0.72)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
              boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Average margin</span>
                <strong style={{ color: productInsights.avgMargin >= 20 ? '#52c41a' : productInsights.avgMargin > 0 ? '#1677ff' : '#ff4d4f' }}>
                  {productInsights.avgMargin.toFixed(1)}%
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Top category</span>
                <strong>{productInsights.topCategory ? `${productInsights.topCategory[0]} (${productInsights.topCategory[1]})` : '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Missing supplier</span>
                <strong>{productInsights.unsourcedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Negative margin items</span>
                <strong style={{ color: productInsights.negativeMarginCount ? '#ff4d4f' : '#52c41a' }}>
                  {productInsights.negativeMarginCount}
                </strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {(productInsights.unsourcedCount > 0 || productInsights.negativeMarginCount > 0 || productInsights.outOfStockCount > 0) && (
        <Alert
          style={{ marginBottom: 16, borderRadius: 10 }}
          type={productInsights.negativeMarginCount > 0 ? 'warning' : 'info'}
          showIcon
          message="Catalog watchlist"
          description={[
            productInsights.negativeMarginCount > 0 ? `${productInsights.negativeMarginCount} products are selling at or below cost.` : null,
            productInsights.unsourcedCount > 0 ? `${productInsights.unsourcedCount} products have no supplier assigned.` : null,
            productInsights.outOfStockCount > 0 ? `${productInsights.outOfStockCount} products are out of stock.` : null,
          ].filter(Boolean).join(' ')}
        />
      )}

      {/* Bulk delete alert */}
      {canDeleteProducts && selectedRowKeys.length > 0 && (
        <Alert
          message={`${selectedRowKeys.length} product(s) selected`}
          type="info"
          style={{ marginBottom: 12, borderRadius: 8 }}
          action={
            <Button size="small" danger onClick={handleBulkDelete} loading={bulkDeleteMutation.isPending}>
              Delete Selected
            </Button>
          }
        />
      )}

      {/* Main table card */}
      <Card
        style={{
          borderRadius: 12,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Filters bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(134, 166, 197, 0.12)' }}>
          <Row gutter={12} align="middle">
            <Col xs={24} md={8}>
              <Input
                placeholder="Search by name, SKU, or description…"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setFilters(f => ({ ...f, page: 1 })); }}
                allowClear
                onClear={() => setSearchInput('')}
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} md={5}>
              <Select
                placeholder="Category"
                style={{ width: '100%' }}
                value={filters.category}
                onChange={(v) => setFilters({ ...filters, category: v, page: 1 })}
                allowClear
                options={(mergedCategories || []).map((cat: any) => ({ label: cat, value: cat }))}
              />
            </Col>
            <Col xs={24} md={5}>
              <Select
                placeholder="Supplier"
                style={{ width: '100%' }}
                value={filters.supplier}
                onChange={(v) => setFilters({ ...filters, supplier: v, page: 1 })}
                allowClear
                options={(mergedSuppliers || []).map((s) => ({ label: s, value: s }))}
              />
            </Col>
            <Col xs={24} md={4}>
              <Select
                placeholder="Status"
                style={{ width: '100%' }}
                value={filters.is_active}
                onChange={(v) => { setFilters({ ...filters, is_active: v, page: 1 }); setActiveStatFilter(null); }}
                allowClear
                options={[
                  { label: 'Active', value: true },
                  { label: 'Inactive', value: false },
                ]}
              />
            </Col>
          </Row>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredProducts}
          loading={productsLoading}
          rowKey="id"
          size={tableDensity}
          scroll={{ x: 1100 }}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: activeStatFilter === 'lowStock' ? filteredProducts.length : (productsData?.total || 0),
            onChange: (page, pageSize) => setFilters({ ...filters, page, limit: pageSize }),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} products`,
            style: { padding: '12px 20px' },
          }}
          rowSelection={canDeleteProducts ? {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          } : undefined}
          rowClassName={(record: Product) => {
            if (!record.is_active) return 'row-inactive';
            if (record.quantity_in_stock === 0) return 'row-out-of-stock';
            if (record.quantity_in_stock <= record.reorder_level) return 'row-low-stock';
            return '';
          }}
        />
      </Card>

      {/* Recently created */}
      {recentProducts.length > 0 && (
        <Card
          title={<span style={{ fontSize: 13, fontWeight: 600 }}>Recently Created</span>}
          style={{ marginTop: 16, borderRadius: 12 }}
          styles={{ body: { padding: '8px 16px' } }}
        >
          <List
            dataSource={recentProducts}
            renderItem={(p) => (
              <List.Item
                actions={[
                  ...(canEditProducts
                    ? [<Button key="view" type="link" size="small" onClick={() => handleOpenModal(p)}>Edit</Button>]
                    : []),
                  ...(canCreateProducts
                    ? [<Button key="dup" type="link" size="small" onClick={() => handleDuplicateProduct(p)}>Duplicate</Button>]
                    : []),
                ]}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>{p.sku} • {p.supplier || '—'}</div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Row highlight styles */}
      <style>{`
        .row-inactive td { background: rgba(255,255,255,0.02) !important; opacity: 0.72; }
        .row-out-of-stock td { background: rgba(255,77,79,0.10) !important; }
        .row-low-stock td { background: rgba(250,140,22,0.10) !important; }
      `}</style>

      {/* Product Form Modal */}
      {(canCreateProducts || canEditProducts) && (
        <Modal
          title={
            <Space>
              {editingProduct ? <EditOutlined /> : <PlusOutlined />}
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Space>
          }
          open={isModalVisible}
          onCancel={handleCloseModal}
          footer={null}
          width={600}
          forceRender
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item name="name" label="Product Name" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="Enter product name" />
            </Form.Item>
            <Form.Item name="sku" label="SKU" rules={[{ required: true }, { max: 100 }]}>
              <Input placeholder="Enter product SKU" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Enter product description" rows={3} />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Required' }]}>
              <AutoComplete
                placeholder="Select or enter category"
                options={(mergedCategories || []).map((cat: string) => ({ value: cat }))}
                filterOption={(input, opt) => opt!.value.toUpperCase().includes(input.toUpperCase())}
              />
            </Form.Item>
            <Form.Item name="supplier" label="Supplier" rules={[{ required: true, message: 'Required' }]}>
              <AutoComplete
                placeholder="Select or enter supplier"
                options={(mergedSuppliers || []).map((s) => ({ value: s }))}
                filterOption={(input, opt) => typeof opt?.value === 'string' && opt.value.toUpperCase().includes(input.toUpperCase())}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="cost_price" label="Cost Price" rules={[{ required: true }, { type: 'number', min: 0 }]}>
                  <InputNumber placeholder="0.00" step={0.01} min={0} precision={2} className="w-full" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="selling_price" label="Selling Price" rules={[{ required: true }, { type: 'number', min: 0 }]}>
                  <InputNumber placeholder="0.00" step={0.01} min={0} precision={2} className="w-full" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="quantity_in_stock" label="Quantity in Stock" rules={[{ type: 'number', min: 0 }]}>
                  <InputNumber placeholder="0" step={1} min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="reorder_level" label="Reorder Level" rules={[{ type: 'number', min: 0 }]}>
                  <InputNumber placeholder="10" step={1} min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="tax_rate" label="Tax Rate (%)" rules={[{ type: 'number', min: 0, max: 100 }]}>
                  <InputNumber placeholder="0" step={0.01} min={0} max={100} precision={2} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="unit_of_measure" label="Unit of Measure">
                  <Input placeholder="e.g., pcs, kg, ltr" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="image_url" label="Image URL">
              <Input placeholder="https://example.com/image.jpg" />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
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
      )}
    </div>
  );
}
