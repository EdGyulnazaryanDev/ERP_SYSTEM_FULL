import { useState, useEffect } from 'react';
import { Card, Input, Button, List, message, Space, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products';
import { useAccessControl } from '@/hooks/useAccessControl';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [newSupplier, setNewSupplier] = useState('');
  const { canPerform } = useAccessControl();
  const canCreate = canPerform('suppliers', 'create');
  const canDelete = canPerform('suppliers', 'delete');
  const { data: apiSuppliers = [], isLoading } = useQuery({
    queryKey: ['product-suppliers'],
    queryFn: () => productsApi.getSuppliers(),
    select: (res) => res.data || [],
  });

  // Use localStorage to persist custom suppliers
  const loadLocalSuppliers = (): string[] => {
    try {
      const raw = localStorage.getItem('custom_suppliers');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const [localSuppliers, setLocalSuppliers] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadLocalSuppliers();
  });

  const suppliers = Array.from(new Set([...(apiSuppliers || []), ...localSuppliers]));

  useEffect(() => {
    // ensure local suppliers are saved to localStorage on mount
    if (localSuppliers.length === 0) return;
    localStorage.setItem('custom_suppliers', JSON.stringify(localSuppliers));
  }, [localSuppliers]);

  const saveLocal = (items: string[]) => {
    localStorage.setItem('custom_suppliers', JSON.stringify(items));
    setLocalSuppliers(items);
    // refresh product suppliers query
    queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
  };

  const addSupplier = async () => {
    const name = newSupplier?.trim();
    if (!name) return message.warning('Enter supplier name');
    if (suppliers.includes(name)) return message.info('Supplier already exists');

    // Save to local storage only
    const next = [...localSuppliers, name];
    saveLocal(next);
    setNewSupplier('');
    message.success('Supplier added');
  };

  const removeLocalSupplier = async (name: string) => {
    // Remove from local storage only
    const next = localSuppliers.filter((s) => s !== name);
    saveLocal(next);
    message.success('Supplier removed');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copied to clipboard');
    } catch (e) {
      message.error('Failed to copy');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Suppliers</h1>

      <Card className="mt-4">
        {canCreate && (
          <Space align="start" style={{ width: '100%' }}>
            <Input
              placeholder="Add new supplier"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              onPressEnter={addSupplier}
              style={{ width: 300 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addSupplier}>
              Add Supplier
            </Button>
          </Space>
        )}
      </Card>

      <Card title="Supplier List" className="mt-4">
        <List
          loading={isLoading}
          dataSource={suppliers}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title="Copy" key="copy">
                  <Button type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(item)} />
                </Tooltip>,
                localSuppliers.includes(item) && canDelete ? (
                  <Popconfirm
                    key="delete"
                    title={`Delete local supplier "${item}"?`}
                    onConfirm={() => removeLocalSupplier(item)}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ) : null,
              ]}
            >
              {item}
            </List.Item>
          )}
        />
      </Card>

      <Card title="Notes" className="mt-4">
        <p>
          Suppliers are detected from existing products via the API. You can add local supplier suggestions here. Local suppliers are stored in your browser and will be merged into the suppliers dropdown when creating products.
        </p>
      </Card>
    </div>
  );
}
