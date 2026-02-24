import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { transportationApi, ShipmentStatus, type Shipment } from '@/api/transportation';
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

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

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

  const filteredShipments = shipments.filter((shipment: Shipment) => {
    const matchesSearch =
      shipment.tracking_number.toLowerCase().includes(searchText.toLowerCase()) ||
      shipment.destination_name.toLowerCase().includes(searchText.toLowerCase()) ||
      shipment.origin_name.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const columns = [
    {
      title: 'Tracking Number',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      render: (trackingNumber: string) => (
        <Button type="link" onClick={() => navigate(`/transportation/shipments/${trackingNumber}`)}>
          {trackingNumber}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ShipmentStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'default'}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Origin',
      dataIndex: 'origin_name',
      key: 'origin_name',
    },
    {
      title: 'Destination',
      dataIndex: 'destination_name',
      key: 'destination_name',
    },
    {
      title: 'Courier',
      dataIndex: ['courier', 'name'],
      key: 'courier',
      render: (name: string) => name || '-',
    },
    {
      title: 'Pickup Date',
      dataIndex: 'pickup_date',
      key: 'pickup_date',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Est. Delivery',
      dataIndex: 'estimated_delivery_date',
      key: 'estimated_delivery_date',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost: number) => `$${cost.toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Shipment) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/transportation/shipments/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EnvironmentOutlined />}
            onClick={() => window.open(`/track/${record.tracking_number}`, '_blank')}
          >
            Track
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Shipments"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/transportation/shipments/create')}
          >
            Create Shipment
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="Search by tracking number, origin, or destination"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={8}>
              <Select
                placeholder="Filter by status"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
              >
                {Object.values(ShipmentStatus).map((status) => (
                  <Select.Option key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              />
            </Col>
          </Row>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredShipments}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} shipments`,
          }}
        />
      </Card>
    </div>
  );
}
