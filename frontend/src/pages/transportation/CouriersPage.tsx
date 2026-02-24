import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Rate,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { transportationApi, CourierType, CourierStatus, type Courier } from '@/api/transportation';

const { TextArea } = Input;

export default function CouriersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [form] = Form.useForm();

  const { data: couriers = [], isLoading } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const response = await transportationApi.getCouriers();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Courier>) => transportationApi.createCourier(data),
    onSuccess: () => {
      message.success('Courier created successfully');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to create courier');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Courier> }) =>
      transportationApi.updateCourier(id, data),
    onSuccess: () => {
      message.success('Courier updated successfully');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update courier');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transportationApi.deleteCourier(id),
    onSuccess: () => {
      message.success('Courier deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
    onError: () => {
      message.error('Failed to delete courier');
    },
  });

  const handleOpenModal = (courier?: Courier) => {
    if (courier) {
      setEditingCourier(courier);
      form.setFieldsValue(courier);
    } else {
      setEditingCourier(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourier(null);
    form.resetFields();
  };

  const handleSubmit = (values: Partial<Courier>) => {
    if (editingCourier) {
      updateMutation.mutate({ id: editingCourier.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Courier',
      content: 'Are you sure you want to delete this courier?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const statusColors: Record<CourierStatus, string> = {
    [CourierStatus.ACTIVE]: 'green',
    [CourierStatus.INACTIVE]: 'default',
    [CourierStatus.ON_LEAVE]: 'orange',
    [CourierStatus.SUSPENDED]: 'red',
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Courier, b: Courier) => a.name.localeCompare(b.name),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: CourierType) => (
        <Tag color={type === CourierType.INTERNAL ? 'blue' : 'purple'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: CourierStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: unknown, record: Courier) => (
        <Space direction="vertical" size="small">
          {record.phone && (
            <span>
              <PhoneOutlined /> {record.phone}
            </span>
          )}
          {record.email && (
            <span>
              <MailOutlined /> {record.email}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_: unknown, record: Courier) =>
        record.vehicle_number ? `${record.vehicle_type || ''} - ${record.vehicle_number}` : '-',
    },
    {
      title: 'Deliveries',
      dataIndex: 'total_deliveries',
      key: 'total_deliveries',
      sorter: (a: Courier, b: Courier) => a.total_deliveries - b.total_deliveries,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled value={rating} />,
      sorter: (a: Courier, b: Courier) => a.rating - b.rating,
    },
    {
      title: 'Base Rate',
      dataIndex: 'base_rate',
      key: 'base_rate',
      render: (rate: number) => `$${rate.toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Courier) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Couriers"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Add Courier
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={couriers}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} couriers`,
          }}
        />
      </Card>

      <Modal
        title={editingCourier ? 'Edit Courier' : 'Add Courier'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: CourierType.INTERNAL,
            status: CourierStatus.ACTIVE,
            base_rate: 0,
            per_km_rate: 0,
            rating: 5,
          }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter courier name' }]}
          >
            <Input placeholder="Courier name" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please enter courier code' }]}
          >
            <Input placeholder="Unique code" />
          </Form.Item>

          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={CourierType.INTERNAL}>Internal</Select.Option>
              <Select.Option value={CourierType.EXTERNAL}>External</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select>
              {Object.values(CourierStatus).map((status) => (
                <Select.Option key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Company Name" name="company_name">
            <Input placeholder="Company name (for external couriers)" />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input placeholder="Phone number" />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input type="email" placeholder="Email address" />
          </Form.Item>

          <Form.Item label="License Number" name="license_number">
            <Input placeholder="Driver's license number" />
          </Form.Item>

          <Form.Item label="Vehicle Type" name="vehicle_type">
            <Select placeholder="Select vehicle type">
              <Select.Option value="motorcycle">Motorcycle</Select.Option>
              <Select.Option value="car">Car</Select.Option>
              <Select.Option value="van">Van</Select.Option>
              <Select.Option value="truck">Truck</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Vehicle Number" name="vehicle_number">
            <Input placeholder="Vehicle registration number" />
          </Form.Item>

          <Form.Item label="Base Rate" name="base_rate">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
              placeholder="Base delivery rate"
            />
          </Form.Item>

          <Form.Item label="Per KM Rate" name="per_km_rate">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
              placeholder="Rate per kilometer"
            />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <TextArea rows={2} placeholder="Full address" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
