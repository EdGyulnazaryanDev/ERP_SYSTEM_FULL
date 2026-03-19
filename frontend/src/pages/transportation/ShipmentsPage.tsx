import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Card, Space, Tag, Input, Select,
  DatePicker, Row, Col, Modal, Form, message,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EnvironmentOutlined,
  CheckCircleOutlined, CloseCircleOutlined, CarOutlined,
} from '@ant-design/icons';
import { transportationApi, ShipmentStatus, type Shipment } from '@/api/transportation';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;

const statusColors: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: 'default',
  [ShipmentStatus.PICKED_UP]: 'blue',
  [ShipmentStatus.IN_TRANSIT]: 'cyan',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'purple',
  [ShipmentStatus.DELIVERED]: 'green',
  [ShipmentStatus.FAILED]: 'red',
  [ShipmentStatus.RETURNED]: 'orange',
  [ShipmentStatus.CANCELLED]: 'default',
};

const nextStatuses: Partial<Record<ShipmentStatus, { label: string; status: ShipmentStatus; color: string }[]>> = {
  [ShipmentStatus.PENDING]: [
    { label: 'Approve (Pick Up)', status: ShipmentStatus.PICKED_UP, color: 'blue' },
    { label: 'Cancel', status: ShipmentStatus.CANCELLED, color: 'red' },
  ],
  [ShipmentStatus.PICKED_UP]: [
    { label: 'In Transit', status: ShipmentStatus.IN_TRANSIT, color: 'cyan' },
    { label: 'Cancel', status: ShipmentStatus.CANCELLED, color: 'red' },
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    { label: 'Out for Delivery', status: ShipmentStatus.OUT_FOR_DELIVERY, color: 'purple' },
    { label: 'Failed', status: ShipmentStatus.FAILED, color: 'red' },
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    { label: 'Mark Delivered', status: ShipmentStatus.DELIVERED, color: 'green' },
    { label: 'Failed', status: ShipmentStatus.FAILED, color: 'red' },
  ],
  [ShipmentStatus.FAILED]: [
    { label: 'Return', status: ShipmentStatus.RETURNED, color: 'orange' },
  ],
};

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusModal, setStatusModal] = useState<{
    shipment: Shipment;
    next: { label: string; status: ShipmentStatus; color: string };
  } | null>(null);
  const [form] = Form.useForm();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments', statusFilter, dateRange],
    queryFn: async () => {
      const response = await transportationApi.getShipments({
        status: statusFilter,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      return response.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes, location }: {
      id: string; status: ShipmentStatus; notes?: string; location?: string;
    }) => apiClient.put(`/transportation/shipments/${id}/status`, { status, notes, location }),
    onSuccess: () => {
      message.success('Shipment status updated');
      setStatusModal(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to update status'),
  });

  const handleStatusSubmit = (values: { notes?: string; location?: string }) => {
    if (!statusModal) return;
    statusMutation.mutate({ id: statusModal.shipment.id, status: statusModal.next.status, ...values });
  };

  const filteredShipments = shipments.filter((s: Shipment) =>
    s.tracking_number.toLowerCase().includes(searchText.toLowerCase()) ||
    s.destination_name.toLowerCase().includes(searchText.toLowerCase()) ||
    s.origin_name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const columns = [
    {
      title: 'Tracking #',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      render: (v: string) => (
        <Button type="link" onClick={() => navigate(`/transportation/shipments/${v}`)}>{v}</Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: ShipmentStatus) => <Tag color={statusColors[s]}>{s.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => (
        <Tag color={p === 'urgent' ? 'red' : p === 'high' ? 'orange' : 'default'}>{p.toUpperCase()}</Tag>
      ),
    },
    { title: 'Origin', dataIndex: 'origin_name', key: 'origin_name' },
    { title: 'Destination', dataIndex: 'destination_name', key: 'destination_name' },
    {
      title: 'Courier',
      dataIndex: ['courier', 'name'],
      key: 'courier',
      render: (name: string) => name || '-',
    },
    {
      title: 'Est. Delivery',
      dataIndex: 'estimated_delivery_date',
      key: 'estimated_delivery_date',
      render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (c: number) => c != null ? `$${Number(c).toFixed(2)}` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_: unknown, record: Shipment) => {
        const transitions = nextStatuses[record.status] ?? [];
        return (
          <Space wrap>
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/transportation/shipments/${record.id}`)}>
              View
            </Button>
            <Button size="small" icon={<EnvironmentOutlined />} onClick={() => window.open(`/track/${record.tracking_number}`, '_blank')}>
              Track
            </Button>
            {transitions.map((t) => (
              <Button
                key={t.status}
                size="small"
                type="primary"
                danger={t.color === 'red'}
                icon={
                  t.status === ShipmentStatus.DELIVERED ? <CheckCircleOutlined /> :
                  t.status === ShipmentStatus.CANCELLED || t.status === ShipmentStatus.FAILED ? <CloseCircleOutlined /> :
                  <CarOutlined />
                }
                style={t.color === 'green' ? { background: '#52c41a', borderColor: '#52c41a' } : undefined}
                onClick={() => { setStatusModal({ shipment: record, next: t }); form.resetFields(); }}
              >
                {t.label}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Shipments"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/transportation/shipments/create')}>
            Create Shipment
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Search placeholder="Search tracking, origin, destination" value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
            </Col>
            <Col span={8}>
              <Select placeholder="Filter by status" style={{ width: '100%' }} value={statusFilter} onChange={setStatusFilter} allowClear>
                {Object.values(ShipmentStatus).map((s) => (
                  <Select.Option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(d) => setDateRange(d as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            </Col>
          </Row>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredShipments}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} shipments` }}
        />
      </Card>

      <Modal
        title={statusModal ? `${statusModal.next.label} — ${statusModal.shipment.tracking_number}` : ''}
        open={!!statusModal}
        onCancel={() => { setStatusModal(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleStatusSubmit}>
          <Form.Item name="location" label="Current Location">
            <Input placeholder="e.g. Yerevan Hub" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => { setStatusModal(null); form.resetFields(); }}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={statusMutation.isPending}
                danger={statusModal?.next.status === ShipmentStatus.CANCELLED || statusModal?.next.status === ShipmentStatus.FAILED}
              >
                Confirm: {statusModal?.next.label}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
