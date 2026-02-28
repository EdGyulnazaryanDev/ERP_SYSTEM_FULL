import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Input,
  Button,
  Timeline,
  Descriptions,
  Tag,
  Space,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { transportationApi, ShipmentStatus } from '@/api/transportation';
import dayjs from 'dayjs';

const { Search } = Input;

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

const statusIcons: Record<ShipmentStatus, React.ReactNode> = {
  [ShipmentStatus.PENDING]: <ClockCircleOutlined />,
  [ShipmentStatus.PICKED_UP]: <CheckCircleOutlined />,
  [ShipmentStatus.IN_TRANSIT]: <EnvironmentOutlined />,
  [ShipmentStatus.OUT_FOR_DELIVERY]: <EnvironmentOutlined />,
  [ShipmentStatus.DELIVERED]: <CheckCircleOutlined />,
  [ShipmentStatus.FAILED]: <ClockCircleOutlined />,
  [ShipmentStatus.RETURNED]: <ClockCircleOutlined />,
  [ShipmentStatus.CANCELLED]: <ClockCircleOutlined />,
};

export default function ShipmentTrackingPage() {
  const { trackingNumber: urlTrackingNumber } = useParams();
  const [trackingNumber, setTrackingNumber] = useState(urlTrackingNumber || '');
  const [searchedNumber, setSearchedNumber] = useState(urlTrackingNumber || '');

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['track-shipment', searchedNumber],
    queryFn: async () => {
      const response = await transportationApi.trackShipment(searchedNumber);
      return response.data;
    },
    enabled: !!searchedNumber,
  });

  const handleSearch = () => {
    setSearchedNumber(trackingNumber);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <h1>Track Your Shipment</h1>
            <p>Enter your tracking number to see the current status of your shipment</p>
          </div>

          <Search
            placeholder="Enter tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onSearch={handleSearch}
            enterButton={
              <Button type="primary" icon={<SearchOutlined />}>
                Track
              </Button>
            }
            size="large"
          />

          {isLoading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          )}

          {error && (
            <Empty
              description="Shipment not found. Please check your tracking number and try again."
            />
          )}

          {shipment && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card
                title={
                  <Space>
                    <span>Tracking Number: {shipment.tracking_number}</span>
                    <Tag color={statusColors[shipment.status]} icon={statusIcons[shipment.status]}>
                      {shipment.status.replace('_', ' ').toUpperCase()}
                    </Tag>
                  </Space>
                }
              >
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Origin">
                    {shipment.origin_name}
                    <br />
                    {shipment.origin_address}
                    {shipment.origin_city && `, ${shipment.origin_city}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Destination">
                    {shipment.destination_name}
                    <br />
                    {shipment.destination_address}
                    {shipment.destination_city && `, ${shipment.destination_city}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Pickup Date">
                    {shipment.pickup_date
                      ? dayjs(shipment.pickup_date).format('MMM DD, YYYY')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estimated Delivery">
                    {shipment.estimated_delivery_date
                      ? dayjs(shipment.estimated_delivery_date).format('MMM DD, YYYY')
                      : '-'}
                  </Descriptions.Item>
                  {shipment.actual_delivery_date && (
                    <Descriptions.Item label="Actual Delivery" span={2}>
                      {dayjs(shipment.actual_delivery_date).format('MMM DD, YYYY HH:mm')}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Package Count">
                    {shipment.package_count}
                  </Descriptions.Item>
                  <Descriptions.Item label="Weight">
                    {shipment.weight} {shipment.weight_unit}
                  </Descriptions.Item>
                  {shipment.courier && (
                    <Descriptions.Item label="Courier" span={2}>
                      {shipment.courier.name}
                      {shipment.courier.phone && ` - ${shipment.courier.phone}`}
                    </Descriptions.Item>
                  )}
                  {shipment.delivered_to && (
                    <Descriptions.Item label="Delivered To" span={2}>
                      {shipment.delivered_to}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {shipment.tracking_history && shipment.tracking_history.length > 0 && (
                <Card title="Tracking History">
                  <Timeline
                    items={shipment.tracking_history.map((event) => ({
                      color: event.status === 'delivered' ? 'green' : 'blue',
                      children: (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>
                            {event.status.replace('_', ' ').toUpperCase()}
                          </div>
                          <div style={{ color: '#666' }}>
                            {dayjs(event.timestamp).format('MMM DD, YYYY HH:mm')}
                          </div>
                          {event.location && (
                            <div style={{ color: '#999' }}>
                              <EnvironmentOutlined /> {event.location}
                            </div>
                          )}
                          {event.notes && <div style={{ marginTop: 8 }}>{event.notes}</div>}
                        </div>
                      ),
                    }))}
                  />
                </Card>
              )}

              {shipment.special_instructions && (
                <Card title="Special Instructions">
                  <p>{shipment.special_instructions}</p>
                </Card>
              )}

              {shipment.delivery_notes && (
                <Card title="Delivery Notes">
                  <p>{shipment.delivery_notes}</p>
                </Card>
              )}
            </Space>
          )}
        </Space>
      </Card>
    </div>
  );
}
