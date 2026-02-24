import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Space,
  message,
  Row,
  Col,
  Checkbox,
  Table,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import {
  transportationApi,
  ShipmentPriority,
  type CreateShipmentDto,
  type ShipmentItem,
} from '@/api/transportation';

const { TextArea } = Input;

export default function ShipmentFormPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<ShipmentItem[]>([]);

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const response = await transportationApi.getCouriers();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShipmentDto) => transportationApi.createShipment(data),
    onSuccess: () => {
      message.success('Shipment created successfully');
      navigate('/transportation/shipments');
    },
    onError: () => {
      message.error('Failed to create shipment');
    },
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_name: '',
        quantity: 1,
        weight: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ShipmentItem, value: string | number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (values: CreateShipmentDto) => {
    const data: CreateShipmentDto = {
      ...values,
      pickup_date: values.pickup_date,
      estimated_delivery_date: values.estimated_delivery_date,
      items,
    };

    createMutation.mutate(data);
  };

  const itemColumns = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      render: (_: unknown, __: ShipmentItem, index: number) => (
        <Input
          value={items[index].product_name}
          onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
          placeholder="Product name"
        />
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      width: 120,
      render: (_: unknown, __: ShipmentItem, index: number) => (
        <InputNumber
          value={items[index].quantity}
          onChange={(value) => handleItemChange(index, 'quantity', value || 1)}
          min={1}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Weight (kg)',
      dataIndex: 'weight',
      width: 120,
      render: (_: unknown, __: ShipmentItem, index: number) => (
        <InputNumber
          value={items[index].weight}
          onChange={(value) => handleItemChange(index, 'weight', value || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (_: unknown, __: ShipmentItem, index: number) => (
        <Input
          value={items[index].description}
          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
          placeholder="Description"
        />
      ),
    },
    {
      title: 'Action',
      width: 80,
      render: (_: unknown, __: ShipmentItem, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Create Shipment"
        extra={
          <Space>
            <Button onClick={() => navigate('/transportation/shipments')}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={createMutation.isPending}
            >
              Create
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: ShipmentPriority.NORMAL,
            weight_unit: 'kg',
            package_count: 1,
            requires_signature: false,
            is_fragile: false,
            is_insured: false,
            shipping_cost: 0,
            insurance_cost: 0,
          }}
        >
          <Divider>Shipment Details</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Courier" name="courier_id">
                <Select placeholder="Select courier">
                  {couriers.map((courier) => (
                    <Select.Option key={courier.id} value={courier.id}>
                      {courier.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Priority" name="priority">
                <Select>
                  {Object.values(ShipmentPriority).map((priority) => (
                    <Select.Option key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Package Count" name="package_count">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Origin Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Origin Name"
                name="origin_name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Sender name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Origin Phone" name="origin_phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Origin Address"
                name="origin_address"
                rules={[{ required: true }]}
              >
                <Input placeholder="Full address" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Origin City" name="origin_city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Origin Postal Code" name="origin_postal_code">
                <Input placeholder="Postal code" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Destination Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Destination Name"
                name="destination_name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Recipient name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Destination Phone" name="destination_phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Destination Address"
                name="destination_address"
                rules={[{ required: true }]}
              >
                <Input placeholder="Full address" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Destination City" name="destination_city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Destination Postal Code" name="destination_postal_code">
                <Input placeholder="Postal code" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Package Details</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Weight" name="weight">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  addonAfter="kg"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Volume" name="volume">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  addonAfter="m³"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Package Type" name="package_type">
                <Select placeholder="Select type">
                  <Select.Option value="box">Box</Select.Option>
                  <Select.Option value="envelope">Envelope</Select.Option>
                  <Select.Option value="pallet">Pallet</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Pickup Date" name="pickup_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Estimated Delivery Date" name="estimated_delivery_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Costs</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Shipping Cost" name="shipping_cost">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Insurance Cost" name="insurance_cost">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Additional Options</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="requires_signature" valuePropName="checked">
                <Checkbox>Requires Signature</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_fragile" valuePropName="checked">
                <Checkbox>Fragile</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_insured" valuePropName="checked">
                <Checkbox>Insured</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Special Instructions" name="special_instructions">
            <TextArea rows={3} placeholder="Any special handling instructions" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={2} placeholder="Internal notes" />
          </Form.Item>
        </Form>

        <Divider>Items</Divider>
        <Button
          type="dashed"
          onClick={handleAddItem}
          icon={<PlusOutlined />}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Add Item
        </Button>

        <Table
          columns={itemColumns}
          dataSource={items}
          rowKey={(_, index) => index?.toString() || '0'}
          pagination={false}
        />
      </Card>
    </div>
  );
}
