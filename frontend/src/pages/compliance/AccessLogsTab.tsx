import { Button, Card, Col, Progress, Row, Table, Tag, Tooltip } from 'antd';
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
  const query = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => complianceApi.getAccessLogs().then((res) => res.data),
  });

  const rows = Array.isArray(query.data) ? query.data : [];
  const denied = rows.filter((row) => row.result === 'denied').length;
  const failed = rows.filter((row) => row.result === 'failed').length;
  const risky = denied + failed;
  const riskShare = rows.length ? Math.round((risky / rows.length) * 100) : 0;
  const busiestResource = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.resource_type] = (acc[row.resource_type] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

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
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (value?: string) => value || '—',
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
      title: 'Session',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 140,
      ellipsis: true,
      render: (value?: string) => value || '—',
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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>Observed requests</div>
            <div className={styles.statChipValue}>{rows.length}</div>
            <div className={styles.secondaryText}>Granted, denied, and failed decisions</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>Denied or failed</div>
            <div className={styles.statChipValue}>{risky}</div>
            <Progress percent={riskShare} showInfo={false} strokeColor="#ef4444" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>Most targeted resource</div>
            <div className={styles.statChipValue} style={{ fontSize: '1rem' }}>
              {busiestResource ? busiestResource[0] : '—'}
            </div>
            <div className={styles.secondaryText}>
              {busiestResource ? `${busiestResource[1]} access checks` : 'No access telemetry yet'}
            </div>
          </Card>
        </Col>
      </Row>
      <div className={styles.toolbar}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void query.refetch()}
          loading={query.isFetching}
        >
          Refresh
        </Button>
      </div>
      <Card className={styles.sectionCard} bordered={false} title="Access outcomes">
        <Table<AccessLogRow>
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
        />
      </Card>
    </div>
  );
}
