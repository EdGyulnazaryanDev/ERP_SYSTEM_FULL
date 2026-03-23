import { Button, Card, Table, Tag, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complianceApi, type AccessLogRow } from '@/api/compliance';
import styles from './CompliancePage.module.css';

function formatUser(row: AccessLogRow): string {
  const u = row.user;
  if (!u) return '—';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  return u.email ?? u.id?.slice(0, 8) ?? '—';
}

function resultColor(result: string): string {
  const r = (result || '').toLowerCase();
  if (r === 'granted') return 'success';
  if (r === 'denied') return 'error';
  return 'warning';
}

export default function AccessLogsTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => complianceApi.getAccessLogs().then((res) => res.data),
  });

  const rows = Array.isArray(data) ? data : [];

  const columns = [
    {
      title: 'User',
      key: 'user',
      width: 160,
      ellipsis: true,
      render: (_: unknown, row: AccessLogRow) => (
        <Tooltip title={row.user?.email}>
          <span>{formatUser(row)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Access',
      dataIndex: 'access_type',
      key: 'access_type',
      width: 100,
      render: (type: string) => (
        <Tag style={{ textTransform: 'capitalize' }}>{type}</Tag>
      ),
    },
    { title: 'Resource', dataIndex: 'resource_type', key: 'resource_type', ellipsis: true },
    {
      title: 'Resource ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      ellipsis: true,
      render: (id: string) => id || '—',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 110,
      render: (result: string) => (
        <Tag color={resultColor(result)} style={{ textTransform: 'capitalize' }}>
          {result}
        </Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      ellipsis: true,
      render: (ip: string) => ip || '—',
    },
    {
      title: 'When',
      dataIndex: 'accessed_at',
      key: 'accessed_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <div className={styles.toolbar}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>
      <Card className={styles.sectionCard} bordered={false} title="Access outcomes">
        <Table<AccessLogRow>
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
        />
      </Card>
    </div>
  );
}
