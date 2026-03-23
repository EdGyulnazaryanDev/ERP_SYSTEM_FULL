import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  message,
  Row,
  Col,
  Select,
  Alert,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { inventoryApi } from '@/api/inventory';
import apiClient from '@/api/client';

export default function InventoryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const response = await inventoryApi.getOne(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: string; warehouse_name: string; warehouse_code: string }[] }>('/warehouse');
      const raw = res.data;
      // GET /warehouse returns { data: [...] }
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // Coerce numeric fields and build payload
      const payload: any = {
        ...values,
        quantity: values.quantity !== undefined ? Number(values.quantity) : 0,
        reserved_quantity: values.reserved_quantity !== undefined ? Number(values.reserved_quantity) : 0,
        unit_cost: values.unit_cost !== undefined ? Number(values.unit_cost) : 0,
        unit_price: values.unit_price !== undefined ? Number(values.unit_price) : 0,
        reorder_level: values.reorder_level !== undefined ? Number(values.reorder_level) : 10,
        max_stock_level: values.max_stock_level !== undefined ? Number(values.max_stock_level) : 100,
      };

      // Remove fields not accepted by API
      delete payload.available_quantity;

      if (id) {
        return inventoryApi.update(id, payload);
      }
      return inventoryApi.create(payload);
    },
    onSuccess: (_data, values) => {
      const requestedQty = Number(values?.quantity || 0);
      if (!id && requestedQty > 0) {
        message.success('Inventory item created. Opening stock is now pending approval and inbound delivery.');
      } else {
        message.success(`Inventory item ${id ? 'updated' : 'created'} successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/inventory');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message ||
                       error?.message ||
                       'Failed to save inventory item';
      message.error(errorMsg);
      console.error('Inventory save error:', error);
    },
  });

  useEffect(() => {
    if (item) {
      form.setFieldsValue(item);
    }
  }, [item, form]);

  const handleSubmit = (values: unknown) => {
    saveMutation.mutate(values);
  };

  // Update available quantity when quantity or reserved_quantity change
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.quantity !== undefined || changedValues.reserved_quantity !== undefined) {
      const q = Number(allValues.quantity || 0);
      const r = Number(allValues.reserved_quantity || 0);
      form.setFieldsValue({ available_quantity: Math.max(q - r, 0) });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={id ? 'Edit Inventory Item' : 'New Inventory Item'}
        extra={
          <Space>
            <Button onClick={() => navigate('/inventory')}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={saveMutation.isPending}
            >
              Save
            </Button>
          </Space>
        }
      >
        {!id && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 10 }}
            message="New item receiving flow"
            description="If you enter an opening quantity, the system will create a pending procurement/accounting workflow. Stock will stay at zero until the requisition is approved and the inbound shipment is delivered."
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleValuesChange}
          initialValues={{
            quantity: 0,
            reserved_quantity: 0,
            unit_cost: 0,
            unit_price: 0,
            reorder_level: 10,
            max_stock_level: 100,
            weight_unit: 'kg',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Product Name"
                name="product_name"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input placeholder="Product name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="SKU"
                name="sku"
                rules={[{ required: true, message: 'Please enter SKU' }]}
              >
                <Input placeholder="SKU" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={id ? 'Quantity' : 'Requested Opening Qty'}
                name="quantity"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Quantity"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Reserved Quantity" name="reserved_quantity">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Reserved"
                  disabled={!id}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Available Quantity" name="available_quantity">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  disabled
                  placeholder="Auto-calculated"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Unit Cost"
                name="unit_cost"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                  placeholder="Cost"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Unit Price"
                name="unit_price"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                  placeholder="Price"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Reorder Level" name="reorder_level">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Minimum stock level"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Max Stock Level" name="max_stock_level">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Maximum stock level"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Location" name="location">
                <Input placeholder="Storage location" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Warehouse" name="warehouse">
                <Select
                  placeholder="Select warehouse (optional)"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {warehouses.map((w: { id: string; warehouse_name: string; warehouse_code: string }) => (
                    <Select.Option key={w.warehouse_code} value={w.warehouse_name}>
                      {w.warehouse_code} — {w.warehouse_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}
