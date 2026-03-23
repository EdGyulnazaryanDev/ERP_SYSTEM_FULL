import { Button, Card, Col, Progress, Row, Table, Tag, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complianceApi, type AuditLogRow } from '@/api/compliance';
import styles from './CompliancePage.module.css';

function formatUser(row: AuditLogRow): string {
  const u = row.user;
  if (!u) return '—';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  return u.email ?? u.id?.slice(0, 8) ?? '—';
}

function severityColor(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'red';
  if (s === 'high') return 'volcano';
  if (s === 'medium') return 'gold';
  return 'blue';
}

export default function AuditLogsTab() {
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => complianceApi.getAuditLogs().then((res) => res.data),
  });
  const statsQuery = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: () =>
      complianceApi
        .getAuditStatistics(dayjs().subtract(30, 'day').startOf('day').toISOString(), dayjs().endOf('day').toISOString())
        .then((res) => res.data),
  });

  const rows = Array.isArray(logsQuery.data) ? logsQuery.data : [];
  const stats = statsQuery.data;
  const severityTotal = Object.values(stats?.by_severity ?? {}).reduce((sum, value) => sum + value, 0);
  const criticalShare = severityTotal
    ? Math.round((((stats?.by_severity?.critical ?? 0) + (stats?.by_severity?.high ?? 0)) / severityTotal) * 100)
    : 0;
  const topEntity = Object.entries(stats?.by_entity_type ?? {}).sort((a, b) => b[1] - a[1])[0];
  const topAction = Object.entries(stats?.by_action ?? {}).sort((a, b) => b[1] - a[1])[0];

  const columns = [
    {
      title: 'User',
      key: 'user',
      width: 180,
      ellipsis: true,
      render: (_: unknown, row: AuditLogRow) => (
        <Tooltip title={row.user?.email}>
          <span>{formatUser(row)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (action: string) => (
        <Tag color="processing" style={{ textTransform: 'capitalize' }}>
          {action}
        </Tag>
      ),
    },
    { title: 'Entity', dataIndex: 'entity_type', key: 'entity_type', ellipsis: true },
    {
      title: 'Entity ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      ellipsis: true,
      render: (id: string) => id || '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (severity: string) => (
        <Tag color={severityColor(severity)} style={{ textTransform: 'uppercase', fontSize: 11 }}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (value?: string) => value || '—',
    },
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>30 day volume</div>
            <div className={styles.statChipValue}>{stats?.total_logs ?? rows.length}</div>
            <div className={styles.secondaryText}>Audit events retained for investigation</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>High severity share</div>
            <div className={styles.statChipValue}>{criticalShare}%</div>
            <Progress percent={criticalShare} showInfo={false} strokeColor="#f97316" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.sectionCard} bordered={false}>
            <div className={styles.statChipLabel}>Hotspot</div>
            <div className={styles.statChipValue} style={{ fontSize: '1rem' }}>
              {topEntity ? topEntity[0] : '—'}
            </div>
            <div className={styles.secondaryText}>
              Top action: {topAction ? `${topAction[0]} (${topAction[1]})` : '—'}
            </div>
          </Card>
        </Col>
      </Row>
      <div className={styles.toolbar}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void logsQuery.refetch();
            void statsQuery.refetch();
          }}
          loading={logsQuery.isFetching || statsQuery.isFetching}
        >
          Refresh
        </Button>
      </div>
      <Card className={styles.sectionCard} bordered={false} title="Audit trail">
        <Table<AuditLogRow>
          columns={columns}
          dataSource={rows}
          loading={logsQuery.isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
        />
      </Card>
    </div>
  );
}
