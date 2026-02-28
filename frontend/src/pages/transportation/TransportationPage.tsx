import { useState } from 'react';
import {
  Card,
  Table,
  Tabs,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '@/api/client';

// Types
interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  courier_id: string;
  courier_name?: string;
  origin_address: string;
  destination_address: string;
  weight: number;
  shipping_cost: number;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
}


const statusColors: Record<string, string> = {
  pending: 'orange',
  picked_up: 'blue',
  in_transit: 'cyan',
  out_for_delivery: 'geekblue',
  delivered: 'green',
  failed: 'red',
  returned: 'volcano',
  cancelled: 'gray',
  draft: 'default',
  completed: 'green',
};

export default function TransportationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('shipments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'shipment' | 'courier'>('shipment');
  const [form] = Form.useForm();
  // const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Fetch Shipments
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await apiClient.get('/transportation/shipments');
      return res.data || [];
    },
  });

  // Fetch Couriers
  const { data: couriers = [], isLoading: couriersLoading } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const res = await apiClient.get('/transportation/couriers');
      return res.data || [];
    },
  });

  // Create/Update Shipment
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/transportation/shipments', data);
    },
    onSuccess: () => {
      message.success('Shipment created successfully');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to create shipment');
    },
  });

  // Create Courier
  const createCourierMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/transportation/couriers', data);
    },
    onSuccess: () => {
      message.success('Courier added successfully');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to add courier');
    },
  });

  const handleSubmit = (values: any) => {
    if (modalType === 'shipment') {
      createShipmentMutation.mutate(values);
    } else if (modalType === 'courier') {
      createCourierMutation.mutate(values);
    }
  };

  // Shipments Table Columns
  const shipmentColumns = [
    {
      title: 'Tracking Number',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      render: (text: string) => <Badge count={text} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'From',
      dataIndex: 'origin_address',
      key: 'origin_address',
      ellipsis: true,
    },
    {
      title: 'To',
      dataIndex: 'destination_address',
      key: 'destination_address',
      ellipsis: true,
    },
    {
      title: 'Weight (kg)',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => `${weight} kg`,
    },
    {
      title: 'Cost',
      dataIndex: 'shipping_cost',
      key: 'shipping_cost',
      render: (cost: number) => `$${cost.toFixed(2)}`,
    },
    {
      title: 'Delivery Date',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: () => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setModalType('shipment');
            }}
          />
          <Popconfirm title="Delete shipment?" onConfirm={() => { }}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Couriers Table Columns
  const courierColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'contact_email',
      key: 'contact_email',
    },
    {
      title: 'Phone',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: () => (
        <Space>
          <Button type="link" icon={<EditOutlined />} />
          <Popconfirm title="Delete courier?" onConfirm={() => { }}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openModal = (type: 'shipment' | 'courier') => {
    setModalType(type);
    form.resetFields();
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Transportation & Shipping
      </h1>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Shipments"
              value={shipments.length}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Couriers"
              value={couriers.length}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Deliveries"
              value={shipments.filter((s: Shipment) => s.status === 'pending').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Delivered"
              value={shipments.filter((s: Shipment) => s.status === 'delivered').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'shipments',
            label: '📦 Shipments',
            children: (
              <Card>
                <Space style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openModal('shipment')}
                  >
                    Create Shipment
                  </Button>
                </Space>
                <Table
                  columns={shipmentColumns}
                  dataSource={shipments}
                  loading={shipmentsLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'couriers',
            label: '🚚 Couriers',
            children: (
              <Card>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal('courier')}
                  style={{ marginBottom: '16px' }}
                >
                  Add Courier
                </Button>
                <Table
                  columns={courierColumns}
                  dataSource={couriers}
                  loading={couriersLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal for Create/Edit */}
      <Modal
        title={
          modalType === 'shipment'
            ? 'Create Shipment'
            : 'Add Courier'
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {modalType === 'shipment' && (
            <>
              <Form.Item
                name="origin_address"
                label="From"
                rules={[{ required: true }]}
              >
                <Input placeholder="Pickup address" />
              </Form.Item>
              <Form.Item
                name="destination_address"
                label="To"
                rules={[{ required: true }]}
              >
                <Input placeholder="Delivery address" />
              </Form.Item>
              <Form.Item
                name="courier_id"
                label="Courier"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select courier">
                  {couriers.map((c: any) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="weight"
                label="Weight (kg)"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
              <Form.Item
                name="shipping_cost"
                label="Cost"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
              <Form.Item name="delivery_date" label="Delivery Date">
                <DatePicker />
              </Form.Item>
            </>
          )}

          {modalType === 'courier' && (
            <>
              <Form.Item
                name="name"
                label="Courier Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g., FedEx, DHL" />
              </Form.Item>
              <Form.Item
                name="contact_email"
                label="Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="contact@courier.com" />
              </Form.Item>
              <Form.Item
                name="contact_phone"
                label="Phone"
                rules={[{ required: true }]}
              >
                <Input placeholder="+1-800-000-0000" />
              </Form.Item>
            </>
          )}

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createShipmentMutation.isPending || createCourierMutation.isPending}
            >
              Submit
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
